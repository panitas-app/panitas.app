"use client"

import { Suspense, useState, useEffect, useRef, useCallback } from "react"
import { useParams, useSearchParams } from "next/navigation"
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode"
import Pusher from "pusher-js"

type ConnectionStatus = "connecting" | "connected" | "disconnected" | "expired" | "error"

interface ScanFeedback {
  barcode: string
  productName?: string
  status: "found" | "not_found" | "scanning"
}

const PUSHER_KEY = process.env.NEXT_PUBLIC_PUSHER_KEY || ""
const PUSHER_CLUSTER = process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "us2"

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

  const [status, setStatus] = useState<ConnectionStatus>("connecting")
  const [lastScan, setLastScan] = useState<ScanFeedback | null>(null)
  const [scanCount, setScanCount] = useState(0)
  const [deviceName, setDeviceName] = useState("Teléfono")
  const [errorMsg, setErrorMsg] = useState("")
  const [showDiag, setShowDiag] = useState(false)
  const [diagLogs, setDiagLogs] = useState<string[]>([])
  const [activeCamLabel, setActiveCamLabel] = useState<string>("")
  const [cameraReady, setCameraReady] = useState(false)

  const scannerRef = useRef<Html5Qrcode | null>(null)
  const pusherRef = useRef<Pusher | null>(null)
  const scanningRef = useRef(false)
  const lastScanTimeRef = useRef<{ code: string; time: number }>({ code: "", time: 0 })

  const [copiedLogs, setCopiedLogs] = useState(false)

  const logDiag = useCallback((msg: string) => {
    const time = new Date().toLocaleTimeString("es-VE", { hour12: false })
    const entry = `[${time}] ${msg}`
    console.log(`[Scanner] ${entry}`)
    setDiagLogs((prev) => [entry, ...prev.slice(0, 49)])
  }, [])

  const copyLogsToClipboard = useCallback(() => {
    const text = diagLogs.join("\n")
    if (!text) return
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        setCopiedLogs(true)
        setTimeout(() => setCopiedLogs(false), 2000)
      }).catch(() => {
        // Fallback prompt
      })
    } else {
      // Fallback
      alert(text)
    }
  }, [diagLogs])

  // 1. Monitor User Agent and log initial context (Does NOT block getUserMedia)
  useEffect(() => {
    if (typeof window === "undefined") return

    const isSecure = window.isSecureContext
    logDiag(`[CONTEXTO] HTTPS Seguro: ${isSecure ? "SÍ" : "NO"}`)

    if (navigator?.userAgent) {
      const ua = navigator.userAgent
      if (ua.includes("Android")) setDeviceName("Android")
      else if (ua.includes("iPhone") || ua.includes("iPad")) setDeviceName("iOS Safari")
      else if (ua.includes("Samsung")) setDeviceName("Samsung Browser")
      logDiag(`[NAVEGADOR] User Agent: ${ua}`)
    }
  }, [logDiag])

  // 2. Connect to scanner session API
  const connectToSession = useCallback(async () => {
    if (!sessionId || !token) {
      setStatus("error")
      setErrorMsg("Enlace inválido. Escanea el código QR nuevamente.")
      logDiag("[SESIÓN] Error: sessionId o token faltante en la URL")
      return
    }

    logDiag(`[SESIÓN] Verificando sesión ID: ${sessionId}`)
    try {
      const res = await fetch("/api/scanner/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, token, deviceName }),
      })
      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        if (res.status === 410) {
          setStatus("expired")
          logDiag(`[SESIÓN] DENEGADA (HTTP 410): ${data.error || "Sesión expirada"}`)
        } else {
          setStatus("error")
          logDiag(`[SESIÓN] DENEGADA (HTTP ${res.status}): ${data.error || "Error de sesión"}`)
        }
        setErrorMsg(data.error || "Error al conectar con el POS")
        return
      }

      if (data.session) {
        logDiag(`[SESIÓN] ID Confirmado: ${data.session.id}`)
        logDiag(`[SESIÓN] Creación: ${data.session.createdAt}`)
        logDiag(`[SESIÓN] Expiración: ${data.session.expiresAt}`)
        logDiag(`[SESIÓN] Estado BD: ${data.session.status}`)
        logDiag(`[SESIÓN] Dispositivo: ${data.session.deviceName}`)
      }

      setStatus("connected")
      logDiag("[SESSION] Sesión validada")
    } catch (e: any) {
      setStatus("error")
      setErrorMsg("Error de conexión. Verifica tu internet.")
      logDiag(`[SESIÓN] Excepción de red al conectar: ${e?.message || e}`)
    }
  }, [sessionId, token, deviceName, logDiag])

  const activeStreamRef = useRef<MediaStream | null>(null)

  // 3. Stop camera clean & release hardware tracks
  const stopCamera = useCallback(async () => {
    scanningRef.current = false
    setCameraReady(false)
    if (activeStreamRef.current) {
      logDiag("[CAMERA] Deteniendo pistas de stream activo...")
      activeStreamRef.current.getTracks().forEach((t) => t.stop())
      activeStreamRef.current = null
    }

    const instance = scannerRef.current
    scannerRef.current = null

    if (instance) {
      logDiag("[CAMERA] Liberando instancia de visor Html5Qrcode...")
      try {
        await instance.stop()
      } catch {}
      try {
        instance.clear()
      } catch {}
      setActiveCamLabel("")
    }
  }, [logDiag])

  // 4. Single Unified Camera Acquisition Flow
  const startCamera = useCallback(async () => {
    logDiag(`[CAMERA] startCamera invocado (scannerRef=${!!scannerRef.current}, scanningRef=${scanningRef.current})`)
    if (scannerRef.current || scanningRef.current) {
      logDiag("[CAMERA] Salida temprana: ya hay scanner activo o escaneando")
      return
    }

    if (status !== "connected") {
      logDiag(`[CAMERA BLOQUEADA] En espera de sesión validada (estado actual: ${status})`)
      return
    }
    scanningRef.current = true
    logDiag("[CAMERA] Usuario activó cámara")

    if (typeof window !== "undefined" && !window.isSecureContext) {
      const errStr = "La cámara requiere conexión HTTPS segura."
      setErrorMsg(errStr)
      setStatus("error")
      logDiag(`[CAMERA ERROR] ${errStr}`)
      scanningRef.current = false
      return
    }

    // Clean up any previously active stream tracks
    if (activeStreamRef.current) {
      logDiag("[CAMERA] Limpiando pistas de video anteriores antes de iniciar nuevo stream...")
      activeStreamRef.current.getTracks().forEach((t) => t.stop())
      activeStreamRef.current = null
      await new Promise((r) => setTimeout(r, 150))
    }

    // Instantiate Html5Qrcode Scanner Engine (single instance)
    logDiag("[SCANNER] Iniciando lector")
    logDiag("[CAMERA] Solicitando stream")
    try {
      const formats = [
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.EAN_8,
        Html5QrcodeSupportedFormats.CODE_128,
        Html5QrcodeSupportedFormats.CODE_39,
        Html5QrcodeSupportedFormats.UPC_A,
        Html5QrcodeSupportedFormats.UPC_E,
        Html5QrcodeSupportedFormats.ITF,
        Html5QrcodeSupportedFormats.QR_CODE,
        Html5QrcodeSupportedFormats.DATA_MATRIX,
      ].filter((f) => f !== undefined)

      const scanner = new Html5Qrcode("scanner-viewport", {
        formatsToSupport: formats,
        verbose: false,
      })
      scannerRef.current = scanner

      const config = {
        fps: 20,
        qrbox: (w: number, h: number) => {
          const vw = w || 300
          const vh = h || 300
          return {
            width: Math.floor(Math.max(Math.min(vw * 0.85, 340), 220)),
            height: Math.floor(Math.max(Math.min(vh * 0.45, 180), 120)),
          }
        },
      }

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

        try {
          const res = await fetch("/api/scanner/scan", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sessionId, barcode: code }),
          })
          if (res.status === 410) {
            stopCamera()
            setStatus("expired")
            logDiag("[SESIÓN] Expirada tras escaneo (HTTP 410)")
            return
          }
          if (res.ok) {
            setScanCount((c) => c + 1)
            logDiag(`[POS] Código ${code} enviado al punto de venta`)
          }
        } catch (e: any) {
          logDiag(`[RED] Error al enviar código escaneado: ${e?.message}`)
        }
      }

      const bindVideoAttributesAndPlay = () => {
        setTimeout(async () => {
          const videoEl = document.querySelector("#scanner-viewport video") as HTMLVideoElement
          if (!videoEl) {
            logDiag("[VIDEO AVISO] No se encontró <video> dentro de #scanner-viewport")
            return
          }
          logDiag(`[VIDEO] Estado encontrado: src=${!!videoEl.srcObject}, readyState=${videoEl.readyState}, paused=${videoEl.paused}`)
          videoEl.setAttribute("autoplay", "true")
          videoEl.setAttribute("playsinline", "true")
          videoEl.setAttribute("webkit-playsinline", "true")
          videoEl.muted = true
          try {
            await videoEl.play()
            logDiag(`[VIDEO] ✅ Reproduciendo. Resolution: ${videoEl.videoWidth}x${videoEl.videoHeight}`)
          } catch (playErr: any) {
            logDiag(`[VIDEO AVISO] video.play(): ${playErr?.message || playErr}`)
          }
        }, 200)
      }

      // Single attempt with priority on rear camera (facingMode ideal environment).
      // Html5Qrcode handles getUserMedia internally; one camera cycle only.
      try {
        logDiag("[CAMERA] Iniciando capturador con facingMode ideal 'environment'...")
        await scanner.start(
          { facingMode: { ideal: "environment" } },
          config,
          onScanSuccess,
          () => {}
        )
        logDiag("[CAMERA] Stream recibido")
        setActiveCamLabel("Trasera")
        bindVideoAttributesAndPlay()
        setCameraReady(true)
        logDiag("[SCANNER] ✅ Lector iniciado con cámara trasera")
        return
      } catch (e1: any) {
        logDiag(`[CAMERA] Intento trasera ideal falló: ${e1?.name || "Error"}: ${e1?.message || e1}`)
      }

      // Generic fallback (no facingMode preference). Still meets user gesture requirement.
      try {
        logDiag("[CAMERA] Iniciando capturador con configuración genérica...")
        await scanner.start(
          { facingMode: "environment" },
          config,
          onScanSuccess,
          () => {}
        )
        logDiag("[CAMERA] Stream recibido")
        setActiveCamLabel("Trasera Estándar")
        bindVideoAttributesAndPlay()
        setCameraReady(true)
        logDiag("[SCANNER] ✅ Lector iniciado con cámara trasera estándar")
        return
      } catch (e2: any) {
        logDiag(`[CAMERA] Intento trasera estándar falló: ${e2?.name || "Error"}: ${e2?.message || e2}`)
      }

      // Last resort: front camera (user-facing).
      try {
        logDiag("[CAMERA] Iniciando capturador con cámara frontal 'user'...")
        await scanner.start(
          { facingMode: "user" },
          config,
          onScanSuccess,
          () => {}
        )
        logDiag("[CAMERA] Stream recibido")
        setActiveCamLabel("Frontal")
        bindVideoAttributesAndPlay()
        setCameraReady(true)
        logDiag("[SCANNER] ✅ Lector iniciado con cámara frontal (último recurso)")
        return
      } catch (e3: any) {
        logDiag(`[CAMERA] Intento frontal falló: ${e3?.name || "Error"}: ${e3?.message || e3}`)
        const errName = e3?.name || "Error"
        const errMsg = String(e3?.message || e3)

        if (errName === "NotAllowedError" || errMsg.includes("Permission denied")) {
          setErrorMsg("Permiso de cámara rechazado. Toca el candado 🔒 arriba para dar permiso y presiona Activar Cámara.")
        } else if (errName === "NotReadableError" || errMsg.includes("Could not start video source")) {
          setErrorMsg("La cámara está siendo ocupada por otra app (WhatsApp, Zoom, Cámara nativa). Ciérrala e intenta de nuevo.")
        } else if (errName === "NotFoundError" || errMsg.includes("Requested device not found")) {
          setErrorMsg("No se encontró ningún sensor de cámara en el dispositivo.")
        } else if (errName === "OverconstrainedError") {
          setErrorMsg("La resolución o parámetro de cámara no es soportado por tu sensor.")
        } else {
          setErrorMsg(`Error al abrir la cámara [${errName}]: ${errMsg}`)
        }
      }

      logDiag("[CAMERA] Error: name=AllAttemptsFailed, message=No se pudo iniciar el capturador de video")
      setStatus("error")
      scanningRef.current = false
      if (scannerRef.current) {
        try { scannerRef.current.clear() } catch {}
        scannerRef.current = null
      }
    } catch (err: any) {
      const errName = err?.name || "Exception"
      const errMsg = String(err?.message || err)
      logDiag(`[CAMERA] Error exacto: name=${errName}, message=${errMsg}`)
      setErrorMsg(`Error al iniciar el escáner [${errName}]: ${errMsg}`)
      setStatus("error")
      scanningRef.current = false
      if (scannerRef.current) {
        try { scannerRef.current.clear() } catch {}
        scannerRef.current = null
      }
    }
  }, [sessionId, status, logDiag, stopCamera])

  // 5. Direct User Tap Handler - Triggers startCamera directly without duplicate getUserMedia calls
  const requestPermissionAndStart = useCallback(async () => {
    logDiag("[CAMERA] Botón pulsado - requestPermissionAndStart ejecutado")
    setErrorMsg("")
    scanningRef.current = false

    try {
      if (status !== "connected") {
        logDiag("[CAMERA] Verificando sesión remota antes de iniciar cámara...")
        await connectToSession()
        return
      }

      await startCamera()
    } catch (e: any) {
      logDiag(`[CAMERA ERROR] Excepción no capturada en requestPermissionAndStart: ${e?.message || e}`)
      setErrorMsg(`Error inesperado: ${e?.message || e}`)
      setStatus("error")
    }
  }, [status, connectToSession, startCamera, logDiag])

  // Initial mount: connect to session
  useEffect(() => {
    connectToSession()
    return () => { stopCamera() }
  }, [connectToSession, stopCamera])

  // Pusher subscriptions when session is connected (NO auto-start camera)
  useEffect(() => {
    if (status !== "connected") return

    if (PUSHER_KEY) {
      try {
        logDiag(`Suscribiendo a canal Pusher: scanner-${sessionId}`)
        const pusher = new Pusher(PUSHER_KEY, { cluster: PUSHER_CLUSTER })
        pusherRef.current = pusher
        const channel = pusher.subscribe(`scanner-${sessionId}`)

        channel.bind("product_found", (data: any) => {
          if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(200)
          playBeep("found")
          setLastScan({ barcode: data.barcode, productName: data.product?.name, status: "found" })
          logDiag(`POS notificó: Producto Encontrado (${data.product?.name || data.barcode})`)
          setTimeout(() => setLastScan((prev) => (prev?.barcode === data.barcode ? null : prev)), 3000)
        })

        channel.bind("product_not_found", (data: any) => {
          if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate([100, 100, 100])
          playBeep("not_found")
          setLastScan({ barcode: data.barcode, status: "not_found" })
          logDiag(`POS notificó: Producto No Encontrado (${data.barcode})`)
          setTimeout(() => setLastScan((prev) => (prev?.barcode === data.barcode ? null : prev)), 3000)
        })

        channel.bind("scanner_disconnect", () => {
          logDiag("POS envió señal de desconexión")
          stopCamera()
          setStatus("disconnected")
        })
      } catch (e: any) {
        logDiag(`Pusher offline/error: ${e?.message}`)
      }
    }

    return () => {
      if (pusherRef.current) {
        try {
          const ch = pusherRef.current.channel(`scanner-${sessionId}`)
          if (ch) { ch.unbind_all(); ch.unsubscribe() }
          pusherRef.current.disconnect()
        } catch {}
        pusherRef.current = null
      }
      stopCamera()
    }
  }, [status, sessionId, stopCamera, logDiag])

  return (
    <div className="fixed inset-0 bg-black flex flex-col font-sans select-none overflow-hidden">
      {/* Header */}
      <div className="bg-zinc-900/90 backdrop-blur-md px-4 py-3 flex items-center justify-between z-10 border-b border-zinc-800">
        <div className="flex items-center gap-2.5">
          <div className={`w-3 h-3 rounded-full ${
            status === "connected" ? "bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" :
            status === "connecting" ? "bg-amber-500 animate-pulse" :
            "bg-rose-500"
          }`} />
          <div>
            <div className="text-white text-xs font-bold leading-none">
              {status === "connected" ? `Escáner POS en Vivo (${deviceName})` :
               status === "connecting" ? "Conectando al POS..." :
               status === "disconnected" ? "Desconectado" :
               status === "expired" ? "Sesión Expirada" : "Error de Cámara"}
            </div>
            {activeCamLabel && status === "connected" && (
              <div className="text-[10px] text-zinc-400 mt-0.5">{activeCamLabel}</div>
            )}
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

      {/* Camera Viewport */}
      <div className="flex-1 relative flex items-center justify-center bg-black overflow-hidden">
        {status === "connected" ? (
          cameraReady ? (
            <>
              <div id="scanner-viewport" className="w-full h-full object-cover" />
              <style>{`
                #scanner-viewport {
                  width: 100% !important;
                  height: 100% !important;
                  position: relative !important;
                  overflow: hidden !important;
                }
                #scanner-viewport video {
                  width: 100% !important;
                  height: 100% !important;
                  object-fit: cover !important;
                  display: block !important;
                  position: absolute !important;
                  top: 0 !important;
                  left: 0 !important;
                  z-index: 1 !important;
                }
                #scanner-viewport canvas {
                  position: absolute !important;
                  top: 0 !important;
                  left: 0 !important;
                  width: 100% !important;
                  height: 100% !important;
                  object-fit: cover !important;
                  z-index: 2 !important;
                  pointer-events: none !important;
                }
              `}</style>
              
              {/* Professional 1D Barcode Viewfinder Box */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none p-4">
                <div className="w-[88%] max-w-[360px] h-36 border-2 border-amber-400/50 rounded-xl relative shadow-[0_0_30px_rgba(251,191,36,0.15)] bg-black/10">
                  {/* Laser scan line animation */}
                  <div className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-red-500 to-transparent shadow-[0_0_12px_#ef4444] animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite] top-1/2 -translate-y-1/2" />
                  
                  {/* Reticle Corner Highlights */}
                  <div className="absolute -top-1 -left-1 w-5 h-5 border-t-4 border-l-4 border-amber-400 rounded-tl-lg" />
                  <div className="absolute -top-1 -right-1 w-5 h-5 border-t-4 border-r-4 border-amber-400 rounded-tr-lg" />
                  <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-4 border-l-4 border-amber-400 rounded-bl-lg" />
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-4 border-r-4 border-amber-400 rounded-br-lg" />
                </div>
              </div>
            </>
          ) : (
            <>
              <div id="scanner-viewport" className="hidden" />
              <div className="flex flex-col items-center gap-3 text-center px-6 max-w-sm">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-3xl">
                  📷
                </div>
                <p className="text-base font-bold text-white">Sesión Conectada</p>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Pulsa para activar la cámara y empezar a escanear productos.
                </p>
                <button
                  onClick={requestPermissionAndStart}
                  className="w-full py-3 px-4 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 mt-1 text-xs"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                  </svg>
                  Activar Cámara
                </button>
              </div>
            </>
          )
        ) : (
          <div className="text-center text-zinc-400 px-6 max-w-sm">
            {status === "expired" ? (
              <>
                <div className="text-5xl mb-3">⏰</div>
                <p className="text-lg font-bold text-white mb-1">Sesión Expirada</p>
                <p className="text-xs text-zinc-400">Vuelve a generar el código QR desde el punto de venta en tu computadora.</p>
              </>
            ) : status === "disconnected" ? (
              <>
                <div className="text-5xl mb-3">📱</div>
                <p className="text-lg font-bold text-white mb-1">Desconectado del POS</p>
                <p className="text-xs text-zinc-400 mb-4">La sesión de escáner fue finalizada o cerrada.</p>
                <button
                  onClick={() => { stopCamera(); connectToSession() }}
                  className="px-4 py-2 bg-amber-500 text-black font-bold rounded-xl text-xs"
                >
                  Reconectar
                </button>
              </>
            ) : status === "error" ? (
              <div className="flex flex-col items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-3xl">
                  📷
                </div>
                <p className="text-base font-bold text-white">Permiso de Cámara Requerido</p>
                <p className="text-xs text-zinc-400 leading-relaxed text-center">{errorMsg}</p>

                <button
                  onClick={requestPermissionAndStart}
                  className="w-full py-3 px-4 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 mt-1 text-xs"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                  </svg>
                  Activar Cámara
                </button>

                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-left w-full mt-1 text-xs text-zinc-400 space-y-1">
                  <p className="font-semibold text-zinc-200 text-[11px]">💡 Pasos para desbloquear:</p>
                  <p>1. Toca el candado 🔒 / permisos al lado de la URL arriba.</p>
                  <p>2. Cambia <strong>"Cámara"</strong> a <strong>"Permitir"</strong>.</p>
                  <p>3. Vuelve a tocar <strong>Activar Cámara</strong> o recarga la página.</p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                <p className="text-xs">Conectando con el Punto de Venta...</p>
              </div>
            )}
          </div>
        )}

        {/* Last Scan Feedback Toast */}
        {lastScan && status === "connected" && (
          <div className={`absolute bottom-6 left-4 right-4 p-3 rounded-2xl backdrop-blur-md transition-all border shadow-2xl ${
            lastScan.status === "found" ? "bg-emerald-950/90 border-emerald-500/40 text-emerald-100" :
            lastScan.status === "not_found" ? "bg-rose-950/90 border-rose-500/40 text-rose-100" :
            "bg-zinc-900/90 border-zinc-700 text-zinc-100"
          }`}>
            <div className="flex items-center gap-3">
              <div className="text-2xl">
                {lastScan.status === "found" ? "✅" :
                 lastScan.status === "not_found" ? "❌" : "📷"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold truncate">
                  {lastScan.productName || lastScan.barcode}
                </p>
                {lastScan.productName && (
                  <p className="text-[10px] opacity-80 font-mono">{lastScan.barcode}</p>
                )}
                {lastScan.status === "not_found" && (
                  <p className="text-[10px] text-rose-300">Producto no registrado en inventario</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Collapsible Live Diagnostics Drawer */}
      {showDiag && (
        <div className="bg-zinc-950 border-t border-zinc-800 p-3 max-h-56 overflow-y-auto text-[11px] font-mono text-zinc-200 z-30 select-text">
          <div className="flex items-center justify-between mb-2 pb-1 border-b border-zinc-800 select-none">
            <span className="font-bold text-amber-400 text-xs">Consola de Diagnóstico Escáner</span>
            <div className="flex items-center gap-2">
              <button
                onClick={copyLogsToClipboard}
                className="px-2.5 py-1 bg-amber-500 text-black font-bold rounded text-[11px] hover:bg-amber-400 active:scale-95 transition-all shadow flex items-center gap-1"
              >
                {copiedLogs ? "✓ ¡Copiado!" : "📋 Copiar Logs"}
              </button>
              <button onClick={() => setDiagLogs([])} className="text-zinc-400 hover:text-white text-[11px] px-1.5 py-1">
                Limpiar
              </button>
            </div>
          </div>
          <div className="space-y-1.5 select-text cursor-text">
            {diagLogs.length === 0 && <p className="text-zinc-600">Sin eventos registrados</p>}
            {diagLogs.map((log, index) => (
              <div key={index} className="leading-snug select-text text-zinc-300 hover:text-white break-words">
                {log}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer Controls */}
      {status === "connected" && (
        <div className="bg-zinc-900/90 backdrop-blur-md px-4 py-3 flex items-center justify-between border-t border-zinc-800 z-10">
          <span className="text-zinc-400 text-xs">Enfoca el código de barras en el marco</span>
          <button
            onClick={() => { stopCamera(); setStatus("disconnected") }}
            className="px-3 py-1.5 bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-semibold rounded-lg hover:bg-rose-500/30 transition-colors"
          >
            Finalizar
          </button>
        </div>
      )}
    </div>
  )
}
