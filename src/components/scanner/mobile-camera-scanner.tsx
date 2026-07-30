"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { X, Check, ArrowRight, RefreshCw } from "lucide-react"

interface MobileCameraScannerProps {
  open: boolean
  onClose: () => void
  onSend: (code: string) => void
  title?: string
  sendButtonLabel?: string
}

interface ScanResult {
  code: string
  timestamp: number
}

function playBeep(type: "scan" | "send") {
  if (typeof window === "undefined") return
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    if (type === "send") {
      osc.frequency.value = 1200
      gain.gain.value = 0.15
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.15)
    } else {
      osc.frequency.value = 800
      gain.gain.value = 0.12
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.08)
    }
  } catch {}
}

export function MobileCameraScanner({
  open,
  onClose,
  onSend,
  title = "Escáner de Cámara",
  sendButtonLabel = "Enviar 🚀",
}: MobileCameraScannerProps) {
  const [status, setStatus] = useState<"idle" | "starting" | "scanning" | "error">("idle")
  const [errorMsg, setErrorMsg] = useState("")
  const [zoomLevel, setZoomLevel] = useState<number>(1)
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)
  const [sendSuccess, setSendSuccess] = useState(false)
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment")

  const scannerRef = useRef<Html5Qrcode | null>(null)
  const lastCodeRef = useRef<{ code: string; time: number }>({ code: "", time: 0 })
  const isStoppingRef = useRef(false)

  // Apply zoom on active camera stream
  const applyZoom = useCallback(async (level: number) => {
    setZoomLevel(level)
    const scanner = scannerRef.current
    if (!scanner || !scanner.isScanning) return

    try {
      // Direct track constraint update
      const videoEl = document.querySelector("#mobile-scanner-viewport video") as HTMLVideoElement
      if (videoEl && videoEl.srcObject) {
        const stream = videoEl.srcObject as MediaStream
        const track = stream.getVideoTracks()[0]
        if (track && track.applyConstraints) {
          await track.applyConstraints({
            advanced: [{ zoom: level }] as any,
          })
          return
        }
      }
      // Alternative Html5Qrcode constraint method
      if ((scanner as any).applyVideoConstraints) {
        await (scanner as any).applyVideoConstraints({
          advanced: [{ zoom: level }],
        })
      }
    } catch (e) {
      console.warn("[MobileScanner] Zoom error:", e)
    }
  }, [])

  // Stop camera and cleanup
  const stopCamera = useCallback(async () => {
    if (isStoppingRef.current) return
    isStoppingRef.current = true

    const scanner = scannerRef.current
    scannerRef.current = null

    if (scanner) {
      try {
        if (scanner.isScanning) {
          await scanner.stop()
        }
        scanner.clear()
      } catch (e) {
        console.warn("[MobileScanner] Stop cleanup warning:", e)
      }
    }

    setStatus("idle")
    isStoppingRef.current = false
  }, [])

  // Start camera scanning flow
  const startCamera = useCallback(async (desiredFacing: "environment" | "user" = "environment") => {
    setErrorMsg("")
    setStatus("starting")
    setScanResult(null)
    setSendSuccess(false)

    // Ensure clean state before starting
    if (scannerRef.current) {
      await stopCamera()
    }

    // Small delay to allow hardware release
    await new Promise((r) => setTimeout(r, 100))

    try {
      const elementId = "mobile-scanner-viewport"
      const el = document.getElementById(elementId)
      if (!el) {
        throw new Error("Contenedor de cámara no encontrado")
      }

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

      const scanner = new Html5Qrcode(elementId, {
        formatsToSupport: formats,
        verbose: false,
      })
      scannerRef.current = scanner

      const config = {
        fps: 20,
        qrbox: (w: number, h: number) => {
          const vw = w || 320
          const vh = h || 320
          return {
            width: Math.floor(Math.max(Math.min(vw * 0.9, 360), 220)),
            height: Math.floor(Math.max(Math.min(vh * 0.45, 180), 120)),
          }
        },
        aspectRatio: 1.0,
        videoConstraints: {
          facingMode: { ideal: desiredFacing },
          width: { min: 640, ideal: 1280, max: 1920 },
          height: { min: 480, ideal: 720, max: 1080 },
          focusMode: "continuous",
        } as any,
      }

      const onScanSuccess = (decodedText: string) => {
        const code = decodedText.trim()
        const now = Date.now()

        // Debounce scan detection (1 second)
        if (lastCodeRef.current.code === code && now - lastCodeRef.current.time < 1000) {
          return
        }
        lastCodeRef.current = { code, time: now }

        if (typeof navigator !== "undefined" && navigator.vibrate) {
          navigator.vibrate(80)
        }
        playBeep("scan")
        setScanResult({ code, timestamp: now })
      }

      // Try preferred facing mode first, fallback to basic constraints if needed
      try {
        await scanner.start({ facingMode: { ideal: desiredFacing } }, config, onScanSuccess, () => {})
      } catch {
        try {
          await scanner.start({ facingMode: desiredFacing }, config, onScanSuccess, () => {})
        } catch {
          const cameras = await Html5Qrcode.getCameras()
          if (cameras && cameras.length > 0) {
            const backCam = cameras.find((c) => /back|rear|trasera|environment/i.test(c.label))
            const chosenId = backCam ? backCam.id : cameras[0].id
            await scanner.start(chosenId, config, onScanSuccess, () => {})
          } else {
            throw new Error("No se encontraron cámaras de video disponibles")
          }
        }
      }

      setStatus("scanning")
    } catch (err: any) {
      console.error("[MobileScanner] Startup error:", err)
      const msg = err?.message || String(err)
      if (msg.includes("Permission") || err?.name === "NotAllowedError") {
        setErrorMsg("Permiso de cámara denegado. Permite el acceso a la cámara en el navegador.")
      } else if (msg.includes("NotReadableError") || msg.includes("in use")) {
        setErrorMsg("La cámara está ocupada por otra aplicación. Ciérrala e intenta de nuevo.")
      } else {
        setErrorMsg(`No se pudo iniciar la cámara: ${msg}`)
      }
      setStatus("error")
      if (scannerRef.current) {
        try { scannerRef.current.clear() } catch {}
        scannerRef.current = null
      }
    }
  }, [stopCamera])

  // Toggle between front and rear camera
  const toggleCamera = () => {
    const nextMode = facingMode === "environment" ? "user" : "environment"
    setFacingMode(nextMode)
    startCamera(nextMode)
  }

  // Handle Send button tap
  const handleSendCode = (overrideCode?: string) => {
    const codeToSend = overrideCode || scanResult?.code
    if (!codeToSend) return

    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate([60, 40, 60])
    }
    playBeep("send")

    onSend(codeToSend)

    setSendSuccess(true)
    setTimeout(() => {
      setSendSuccess(false)
    }, 2000)
  }

  // Effect when dialog opens or closes
  useEffect(() => {
    if (open) {
      startCamera(facingMode)
    } else {
      stopCamera()
    }
    return () => {
      stopCamera()
    }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose() }}>
      <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden bg-black border-zinc-800 text-white select-none">
        
        {/* Header */}
        <div className="bg-zinc-900/90 backdrop-blur-md px-4 py-3 flex items-center justify-between border-b border-zinc-800 z-20">
          <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${
              status === "scanning" ? "bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" :
              status === "starting" ? "bg-amber-500 animate-pulse" : "bg-zinc-500"
            }`} />
            <span className="text-sm font-bold text-white tracking-wide">{title}</span>
          </div>

          <div className="flex items-center gap-2">
            {status === "scanning" && (
              <button
                type="button"
                onClick={toggleCamera}
                className="p-1.5 rounded-lg bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700 active:scale-95 transition-all"
                title="Cambiar Cámara"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-700 active:scale-95 transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Viewport & Scanner Container */}
        <div className="relative w-full h-[360px] bg-black flex items-center justify-center overflow-hidden">
          
          {/* Html5Qrcode target div */}
          <div id="mobile-scanner-viewport" className="w-full h-full object-cover" />

          {/* Scanner Overlay during scanning */}
          {status === "scanning" && (
            <>
              {/* Zoom Control Bar */}
              <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 bg-zinc-900/85 backdrop-blur-md px-3 py-1 rounded-full border border-zinc-700/70 shadow-lg">
                <span className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider mr-1">Zoom</span>
                {[1, 2, 3, 4].map((z) => (
                  <button
                    key={z}
                    type="button"
                    onClick={() => applyZoom(z)}
                    className={`px-2.5 py-0.5 text-xs font-bold rounded-full transition-all ${
                      zoomLevel === z
                        ? "bg-amber-400 text-black shadow scale-105"
                        : "bg-zinc-800 text-zinc-300 hover:text-white"
                    }`}
                  >
                    {z}x
                  </button>
                ))}
              </div>

              {/* Aiming Reticle Overlay */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none p-4 z-10">
                <div className="w-[88%] max-w-[340px] h-32 border-2 border-amber-400/50 rounded-xl relative shadow-[0_0_24px_rgba(251,191,36,0.15)] bg-black/5">
                  <div className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-red-500 to-transparent shadow-[0_0_10px_#ef4444] animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite] top-1/2 -translate-y-1/2" />
                  <div className="absolute -top-1 -left-1 w-4 h-4 border-t-4 border-l-4 border-amber-400 rounded-tl-lg" />
                  <div className="absolute -top-1 -right-1 w-4 h-4 border-t-4 border-r-4 border-amber-400 rounded-tr-lg" />
                  <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-4 border-l-4 border-amber-400 rounded-bl-lg" />
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-4 border-r-4 border-amber-400 rounded-br-lg" />
                </div>
              </div>
            </>
          )}

          {/* Starting state loading */}
          {status === "starting" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 z-20 gap-3">
              <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-semibold text-zinc-300">Iniciando cámara...</p>
            </div>
          )}

          {/* Error state display */}
          {status === "error" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950 p-6 text-center z-20 gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 text-2xl">
                ⚠️
              </div>
              <p className="text-sm font-bold text-white">Atención</p>
              <p className="text-xs text-zinc-400 leading-relaxed max-w-xs">{errorMsg}</p>
              <Button
                type="button"
                size="sm"
                onClick={() => startCamera(facingMode)}
                className="mt-2 bg-amber-500 text-black font-bold hover:bg-amber-400 rounded-xl"
              >
                Reintentar Cámara
              </Button>
            </div>
          )}

          {/* Scanned Result Toast / Confirmation Banner */}
          {scanResult && status === "scanning" && (
            <div
              onClick={() => handleSendCode()}
              className={`absolute bottom-4 left-3 right-3 p-3.5 rounded-2xl backdrop-blur-md border transition-all shadow-2xl z-30 cursor-pointer active:scale-98 ${
                sendSuccess
                  ? "bg-emerald-950/95 border-emerald-400 ring-2 ring-emerald-500/50 text-emerald-100"
                  : "bg-zinc-900/95 border-amber-500/60 text-zinc-100"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="text-2xl shrink-0">
                  {sendSuccess ? "✅" : "🏷️"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Código detectado</p>
                  <p className="text-sm font-black font-mono tracking-wide text-amber-300 truncate">
                    {scanResult.code}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleSendCode()
                  }}
                  className={`px-3.5 py-2 rounded-xl text-xs font-black shadow-md transition-all shrink-0 active:scale-95 flex items-center gap-1.5 ${
                    sendSuccess
                      ? "bg-emerald-500 text-black"
                      : "bg-amber-400 hover:bg-amber-300 text-black"
                  }`}
                >
                  {sendSuccess ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>¡Enviado!</span>
                    </>
                  ) : (
                    <>
                      <span>{sendButtonLabel}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer instructions */}
        <div className="bg-zinc-900 px-4 py-2.5 border-t border-zinc-800 text-center">
          <p className="text-[11px] text-zinc-400 font-medium">
            Apunta la cámara al código de barras y toca <strong className="text-amber-400">{sendButtonLabel}</strong>
          </p>
        </div>

      </DialogContent>
    </Dialog>
  )
}
