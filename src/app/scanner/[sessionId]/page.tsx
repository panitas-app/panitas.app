"use client"

import { Suspense, useState, useEffect, useRef, useCallback } from "react"
import { useParams, useSearchParams } from "next/navigation"
import { Html5Qrcode } from "html5-qrcode"
import { SessionManager, ScannerSessionInfo } from "@/lib/scanner/session-manager"
import { CameraManager } from "@/lib/scanner/camera-manager"
import { ScannerEngine, FacingMode } from "@/lib/scanner/scanner-engine"

type ScannerState = 
  | "IDLE" 
  | "SESSION_VALIDATED" 
  | "WAITING_USER" 
  | "OPEN_CAMERA" 
  | "CAMERA_READY" 
  | "CREATE_SCANNER" 
  | "SCANNING" 
  | "STOPPING"

interface ScanFeedback {
  barcode: string
  productName?: string
  status: "found" | "not_found" | "scanning"
}

function playBeep(type: "scan" | "found" | "not_found") {
  if (typeof window === "undefined") return
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    if (type === "found") {
      osc.frequency.value = 1200
      gain.gain.value = 0.15
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.15)
    } else if (type === "not_found") {
      osc.frequency.value = 400
      gain.gain.value = 0.15
      osc.start(ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
      osc.stop(ctx.currentTime + 0.4)
    } else {
      osc.frequency.value = 800
      gain.gain.value = 0.12
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.08)
    }
  } catch {}
}

export default function ScannerPageWrapper() {
  return (
    <Suspense fallback={
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <ScannerPage />
    </Suspense>
  )
}

function ScannerPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const sessionId = typeof params.sessionId === "string" ? params.sessionId : ""
  const token = searchParams?.get("token") || ""

  // State Machine Reference
  const stateRef = useRef<ScannerState>("IDLE")
  const transitioningRef = useRef(false)
  
  // UI States
  const [uiState, setUiState] = useState<ScannerState>("IDLE")
  const [sessionInfo, setSessionInfo] = useState<ScannerSessionInfo | null>(null)
  const [errorMsg, setErrorMsg] = useState("")
  const [diagLogs, setDiagLogs] = useState<string[]>([])
  const [showDiag, setShowDiag] = useState(false)
  
  // Scanning data
  const [scanCount, setScanCount] = useState(0)
  const [lastScan, setLastScan] = useState<ScanFeedback | null>(null)
  const [zoomLevel, setZoomLevel] = useState<number>(1)
  const [sendConfirmed, setSendConfirmed] = useState(false)
  const lastScanTimeRef = useRef<{ code: string; time: number }>({ code: "", time: 0 })
  
  // Scanner Instance
  const scannerRef = useRef<Html5Qrcode | null>(null)

  const handleZoomChange = async (level: number) => {
    setZoomLevel(level)
    if (scannerRef.current) {
      await ScannerEngine.setZoom(scannerRef.current, level)
      logDiag(`[CAMERA] Zoom cambiado a ${level}x`)
    }
  }

  const handleManualSendCode = async (overrideCode?: string) => {
    const code = overrideCode || lastScan?.barcode
    if (!code || !sessionId) return
    if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate([60, 40, 60])
    playBeep("found")

    logDiag(`[SCANNER] Enviando código a Panitas: ${code}`)
    const res = await SessionManager.sendBarcode(sessionId, code)
    if (res.success) {
      setSendConfirmed(true)
      setTimeout(() => setSendConfirmed(false), 2500)
    } else {
      logDiag(`[RED] Error al enviar código: ${res.error}`)
    }
  }

  const logDiag = useCallback((msg: string) => {
    const time = new Date().toLocaleTimeString("es-VE", { hour12: false })
    const entry = `[${time}] ${msg}`
    console.log(`[Scanner] ${entry}`)
    setDiagLogs((prev) => [entry, ...prev.slice(0, 49)])
  }, [])

  const transition = useCallback((from: ScannerState | ScannerState[], to: ScannerState): boolean => {
    const fromArray = Array.isArray(from) ? from : [from]
    if (!fromArray.includes(stateRef.current)) {
      logDiag(`[STATE] RECHAZADO: ${stateRef.current} → ${to} (se esperaba ${fromArray.join(" o ")})`)
      return false
    }
    logDiag(`[STATE] ${stateRef.current} → ${to}`)
    stateRef.current = to
    setUiState(to)
    return true
  }, [logDiag])

  // ====================================================================
  // 1. INIT SESSION
  // ====================================================================
  useEffect(() => {
    let mounted = true
    const initSession = async () => {
      if (!sessionId || !token) {
        setErrorMsg("Enlace inválido. Escanea el código QR nuevamente.")
        return
      }

      if (!transition("IDLE", "SESSION_VALIDATED")) return
      
      const deviceName = navigator?.userAgent.includes("Android") ? "Android" :
                        navigator?.userAgent.includes("iPhone") ? "iOS" : "Teléfono"

      const res = await SessionManager.validate(sessionId, token, deviceName)
      
      if (!mounted) return

      if (!res.success) {
        logDiag(`[SESIÓN] Error: ${res.error}`)
        setErrorMsg(res.error || "Error al conectar")
        // Don't transition if we fail validation, let UI show error
        return
      }

      setSessionInfo(res.session!)
      transition("SESSION_VALIDATED", "WAITING_USER")
    }

    initSession()
    return () => { mounted = false }
  }, [sessionId, token, transition, logDiag])

  // ====================================================================
  // 2. PUSHER SUBSCRIPTION
  // ====================================================================
  useEffect(() => {
    if (uiState !== "WAITING_USER" && uiState !== "SCANNING") return
    
    logDiag(`[PUSHER] Suscribiendo a scanner-${sessionId}`)
    const unsubscribe = SessionManager.subscribePusher(sessionId, {
      onProductFound: (barcode, productName) => {
        if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(200)
        playBeep("found")
        setLastScan({ barcode, productName, status: "found" })
        setTimeout(() => setLastScan(prev => prev?.barcode === barcode ? null : prev), 3000)
      },
      onProductNotFound: (barcode) => {
        if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate([100, 100, 100])
        playBeep("not_found")
        setLastScan({ barcode, status: "not_found" })
        setTimeout(() => setLastScan(prev => prev?.barcode === barcode ? null : prev), 3000)
      },
      onDisconnect: () => {
        logDiag("[PUSHER] POS envió desconexión")
        handleStop()
        setErrorMsg("Desconectado del POS")
      }
    })

    return () => {
      logDiag(`[PUSHER] Desuscribiendo`)
      unsubscribe()
    }
  }, [uiState, sessionId, logDiag]) // Only run when state reaches WAITING_USER or SCANNING

  // ====================================================================
  // 3. START CAMERA FLOW
  // ====================================================================
  const handleStartCamera = async (facingMode: FacingMode) => {
    if (transitioningRef.current) {
      logDiag("[CAMERA] Bloqueado: transición en progreso")
      return
    }
    
    if (!transition("WAITING_USER", "OPEN_CAMERA")) return
    transitioningRef.current = true
    setErrorMsg("")

    try {
      if (!CameraManager.isSecureContext()) {
        throw new Error("La cámara requiere conexión HTTPS segura.")
      }

      // Validar si hay cámaras disponibles antes de iniciar
      const hasCams = await CameraManager.hasCameras()
      if (!hasCams) {
        throw new Error("No se encontraron cámaras de video en este dispositivo.")
      }
      
      logDiag("[CAMERA] Abriendo cámara para obtener deviceId...")
      const camInfo = await CameraManager.openCamera(facingMode === "environment")
      logDiag(`[CAMERA] Obtenida: ${camInfo.label} (${camInfo.deviceId})`)

      if (!transition("OPEN_CAMERA", "CAMERA_READY")) {
        CameraManager.closeCamera(camInfo.stream)
        throw new Error("Transición inválida a CAMERA_READY")
      }
      
      logDiag("[CAMERA] Liberando cámara temporal...")
      CameraManager.closeCamera(camInfo.stream)
      // Espera para dar tiempo al OS de liberar el hardware antes de que Html5Qrcode lo tome
      await new Promise(resolve => setTimeout(resolve, 150))
      
      if (!transition("CAMERA_READY", "CREATE_SCANNER")) {
        throw new Error("Transición inválida a CREATE_SCANNER")
      }

      logDiag("[SCANNER] Creando instancia Html5Qrcode")
      const scanner = ScannerEngine.create("scanner-viewport")
      scannerRef.current = scanner

      const onScanSuccess = async (decodedText: string) => {
        const code = decodedText.trim()
        const now = Date.now()
        if (lastScanTimeRef.current.code === code && now - lastScanTimeRef.current.time < 1500) {
          return
        }
        lastScanTimeRef.current = { code, time: now }

        logDiag(`[SCANNER] Código detectado: ${code}`)
        if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(100)
        playBeep("scan")
        setLastScan({ barcode: code, status: "scanning" })

        const res = await SessionManager.sendBarcode(sessionId, code)
        if (res.success) {
          setScanCount(c => c + 1)
        } else {
          logDiag(`[RED] Error: ${res.error}`)
          if (res.status === 410) { // Expired
             handleStop()
             setErrorMsg("Sesión Expirada")
          }
        }
      }

      logDiag(`[SCANNER] Ejecutando start con deviceId: ${camInfo.deviceId.slice(0,8)}...`)
      await ScannerEngine.start(scanner, camInfo.deviceId, onScanSuccess)
      
      if (!transition("CREATE_SCANNER", "SCANNING")) {
        // If state changed while we were starting (e.g. user clicked stop)
        logDiag("[SCANNER] Abortando porque el estado cambió durante el start")
        await ScannerEngine.stop(scanner)
        ScannerEngine.destroy(scanner)
        scannerRef.current = null
        return
      }
      
      logDiag("[SCANNER] ✅ Escaneando")
      
    } catch (err: any) {
      logDiag(`[ERROR] Falló la apertura de cámara: ${err?.name || "Error"} - ${err?.message || err}`)
      setErrorMsg(CameraManager.classifyError(err))
      
      if (scannerRef.current) {
         ScannerEngine.destroy(scannerRef.current)
         scannerRef.current = null
      }
      // Revert back to waiting user
      transition(["OPEN_CAMERA", "CAMERA_READY", "CREATE_SCANNER"], "WAITING_USER")
    } finally {
      transitioningRef.current = false
    }
  }

  // ====================================================================
  // 4. STOP CAMERA FLOW
  // ====================================================================
  const handleStop = async () => {
    // We can stop from any active camera state
    if (!transition(["OPEN_CAMERA", "CAMERA_READY", "CREATE_SCANNER", "SCANNING"], "STOPPING")) {
      return
    }
    
    logDiag("[SCANNER] Deteniendo...")
    const scanner = scannerRef.current
    scannerRef.current = null

    if (scanner) {
      await ScannerEngine.stop(scanner)
      ScannerEngine.destroy(scanner)
      logDiag("[SCANNER] Instancia destruida")
    }
    
    transition("STOPPING", "IDLE")
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (stateRef.current === "SCANNING") {
        const scanner = scannerRef.current
        if (scanner) {
          ScannerEngine.stop(scanner).then(() => ScannerEngine.destroy(scanner))
        }
      }
    }
  }, [])

  return (
    <div className="fixed inset-0 bg-black flex flex-col font-sans select-none overflow-hidden">
      {/* Header */}
      <div className="bg-zinc-900/90 backdrop-blur-md px-4 py-3 flex items-center justify-between z-10 border-b border-zinc-800">
        <div className="flex items-center gap-2.5">
          <div className={`w-3 h-3 rounded-full ${
            uiState === "SCANNING" ? "bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" :
            uiState === "WAITING_USER" ? "bg-blue-500" :
            "bg-amber-500"
          }`} />
          <div>
            <div className="text-white text-xs font-bold leading-none">
              {uiState === "SCANNING" ? `Escáner Activo` :
               uiState === "WAITING_USER" ? "Listo para activar" :
               uiState === "IDLE" ? "Desconectado" :
               "Procesando..."}
            </div>
            {sessionInfo && <div className="text-[10px] text-zinc-400 mt-0.5">{sessionInfo.deviceName}</div>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-amber-400 font-mono font-bold text-xs bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
            {scanCount} lecturas
          </span>
          <button
            onClick={() => setShowDiag(!showDiag)}
            className="text-xs px-2 py-1 bg-zinc-800 text-zinc-300 rounded border border-zinc-700 hover:text-white"
          >
            🛠️
          </button>
        </div>
      </div>

      {/* Camera Viewport (Always in DOM) */}
      <div className="flex-1 relative flex items-center justify-center bg-black overflow-hidden">
        
        {/* Scanner Container — must NOT use display:none during init,
            html5-qrcode needs real dimensions to size the video element */}
        <div 
          id="scanner-viewport" 
          className={
            uiState === "SCANNING"
              ? "w-full h-full opacity-100"
              : "w-full h-full absolute inset-0 opacity-0 pointer-events-none -z-10"
          } 
        />

        {uiState === "SCANNING" && (
          <>
            {/* Zoom Selector Bar */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 bg-zinc-900/85 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-zinc-700/60 shadow-xl">
              <span className="text-[10px] font-bold text-zinc-400 mr-1 uppercase tracking-wider">Zoom</span>
              {[1, 2, 3, 4].map((z) => (
                <button
                  key={z}
                  onClick={() => handleZoomChange(z)}
                  className={`px-2.5 py-1 text-xs font-bold rounded-full transition-all ${
                    zoomLevel === z
                      ? "bg-amber-400 text-black shadow-md scale-105"
                      : "bg-zinc-800/80 text-zinc-300 hover:text-white hover:bg-zinc-700"
                  }`}
                >
                  {z}x
                </button>
              ))}
            </div>

            {/* Frame Overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none p-4 z-10">
              <div className="w-[88%] max-w-[360px] h-36 border-2 border-amber-400/50 rounded-xl relative shadow-[0_0_30px_rgba(251,191,36,0.15)] bg-black/10">
                <div className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-red-500 to-transparent shadow-[0_0_12px_#ef4444] animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite] top-1/2 -translate-y-1/2" />
                <div className="absolute -top-1 -left-1 w-5 h-5 border-t-4 border-l-4 border-amber-400 rounded-tl-lg" />
                <div className="absolute -top-1 -right-1 w-5 h-5 border-t-4 border-r-4 border-amber-400 rounded-tr-lg" />
                <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-4 border-l-4 border-amber-400 rounded-bl-lg" />
                <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-4 border-r-4 border-amber-400 rounded-br-lg" />
              </div>
            </div>
          </>
        )}

        {/* UI Overlays */}
        {uiState !== "SCANNING" && (
          <div className="flex flex-col items-center gap-3 text-center px-6 max-w-sm">
            {errorMsg ? (
               <div className="flex flex-col items-center gap-3">
                 <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-3xl">⚠️</div>
                 <p className="text-base font-bold text-white">Atención</p>
                 <p className="text-xs text-zinc-400 leading-relaxed text-center">{errorMsg}</p>
                 
                 {uiState === "WAITING_USER" && (
                   <div className="flex flex-col gap-2 w-full mt-4">
                     <button onClick={() => handleStartCamera("environment")} className="w-full py-3 bg-amber-500 text-black font-bold rounded-xl">
                       Reintentar Cámara Trasera
                     </button>
                     <button onClick={() => handleStartCamera("user")} className="w-full py-3 bg-zinc-800 text-zinc-300 font-bold rounded-xl border border-zinc-700">
                       Intentar Cámara Frontal
                     </button>
                   </div>
                 )}
               </div>
            ) : uiState === "WAITING_USER" ? (
              <>
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-3xl">📷</div>
                <p className="text-base font-bold text-white">Sesión Conectada</p>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Pulsa para activar la cámara y empezar a escanear productos.
                </p>
                <button
                  onClick={() => handleStartCamera("environment")}
                  className="w-full py-3 px-4 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 mt-1 text-xs"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                  </svg>
                  Activar Cámara
                </button>
              </>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                <p className="text-xs">Conectando...</p>
              </div>
            )}
          </div>
        )}

        {/* Interactive Last Scan Feedback Toast */}
        {lastScan && uiState === "SCANNING" && (
          <div 
            onClick={() => handleManualSendCode()}
            className={`absolute bottom-6 left-4 right-4 p-3.5 rounded-2xl backdrop-blur-md transition-all border shadow-2xl z-20 cursor-pointer active:scale-98 ${
              sendConfirmed ? "bg-emerald-950/95 border-emerald-400 text-emerald-100 ring-2 ring-emerald-500/50" :
              lastScan.status === "found" ? "bg-emerald-950/95 border-emerald-500/50 text-emerald-100" :
              lastScan.status === "not_found" ? "bg-zinc-900/95 border-amber-500/60 text-zinc-100" :
              "bg-zinc-900/95 border-zinc-700 text-zinc-100"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="text-2xl shrink-0">
                {sendConfirmed ? "✅" : lastScan.status === "found" ? "📦" : "🏷️"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-black tracking-wide font-mono truncate text-amber-300">
                  {lastScan.barcode}
                </p>
                {lastScan.productName && (
                  <p className="text-[11px] font-bold text-white truncate">{lastScan.productName}</p>
                )}
                <p className="text-[10px] text-zinc-300 mt-0.5 flex items-center gap-1 font-semibold">
                  {sendConfirmed ? (
                    <span className="text-emerald-400 font-bold">¡Código enviado al formulario de Panitas!</span>
                  ) : (
                    <span>Toca aquí para enviar a Panitas 👉</span>
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  handleManualSendCode()
                }}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 shadow-md ${
                  sendConfirmed
                    ? "bg-emerald-500 text-black shadow-emerald-500/30"
                    : "bg-amber-400 hover:bg-amber-300 text-black active:scale-95"
                }`}
              >
                {sendConfirmed ? "¡Enviado!" : "Enviar 🚀"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Collapsible Live Diagnostics Drawer */}
      {showDiag && (
        <div className="bg-zinc-950 border-t border-zinc-800 p-3 max-h-56 overflow-y-auto text-[11px] font-mono text-zinc-200 z-30 select-text">
          <div className="flex items-center justify-between mb-2 pb-1 border-b border-zinc-800 select-none">
            <span className="font-bold text-amber-400 text-xs">Consola de Diagnóstico</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (navigator?.clipboard?.writeText) {
                    navigator.clipboard.writeText(diagLogs.join("\n"))
                    alert("Copiado")
                  }
                }}
                className="px-2.5 py-1 bg-amber-500 text-black font-bold rounded text-[11px] hover:bg-amber-400 shadow"
              >
                📋 Copiar Logs
              </button>
              <button onClick={() => setDiagLogs([])} className="text-zinc-400 hover:text-white text-[11px] px-1.5 py-1">
                Limpiar
              </button>
            </div>
          </div>
          <div className="space-y-1.5 select-text cursor-text">
            {diagLogs.length === 0 && <p className="text-zinc-600">Sin eventos</p>}
            {diagLogs.map((log, index) => (
              <div key={index} className="leading-snug select-text text-zinc-300 hover:text-white break-words">
                {log}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer Controls */}
      {uiState === "SCANNING" && (
        <div className="bg-zinc-900/90 backdrop-blur-md px-4 py-3 flex items-center justify-between border-t border-zinc-800 z-10">
          <span className="text-zinc-400 text-xs">Enfoca el código de barras en el marco</span>
          <button
            onClick={handleStop}
            className="px-3 py-1.5 bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-semibold rounded-lg hover:bg-rose-500/30 transition-colors"
          >
            Finalizar
          </button>
        </div>
      )}
    </div>
  )
}
