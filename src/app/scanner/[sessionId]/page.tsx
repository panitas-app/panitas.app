"use client"

import { Suspense, useState, useEffect, useRef, useCallback } from "react"
import { useParams, useSearchParams } from "next/navigation"
import { Html5Qrcode } from "html5-qrcode"
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
    <Suspense fallback={<div className="fixed inset-0 bg-black flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
    </div>}>
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

  useEffect(() => {
    if (typeof window !== "undefined" && navigator?.userAgent) {
      const ua = navigator.userAgent
      if (ua.includes("Android")) setDeviceName("Android")
      else if (ua.includes("iPhone") || ua.includes("iPad")) setDeviceName("iOS")
      else if (ua.includes("Samsung")) setDeviceName("Samsung")
    }
  }, [])
  const [errorMsg, setErrorMsg] = useState("")

  const scannerRef = useRef<Html5Qrcode | null>(null)
  const pusherRef = useRef<Pusher | null>(null)
  const scanningRef = useRef(false)

  const connectToSession = useCallback(async () => {
    if (!sessionId || !token) {
      setStatus("error")
      setErrorMsg("Enlace inválido. Escanea el código QR nuevamente.")
      return
    }

    try {
      const res = await fetch("/api/scanner/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, token, deviceName }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Error al conectar" }))
        if (res.status === 410) setStatus("expired")
        else setStatus("error")
        setErrorMsg(err.error || "Error al conectar con el POS")
        return
      }
      setStatus("connected")
    } catch {
      setStatus("error")
      setErrorMsg("Error de conexión. Verifica tu internet.")
    }
  }, [sessionId, token, deviceName])

  const startCamera = useCallback(async () => {
    if (scannerRef.current || scanningRef.current) return
    scanningRef.current = true

    if (typeof window !== "undefined" && !window.isSecureContext) {
      setErrorMsg("La cámara requiere HTTPS. Conéctate desde un dispositivo con HTTPS o usa el modo QR desde el POS.")
      setStatus("error")
      scanningRef.current = false
      return
    }

    const el = document.getElementById("scanner-viewport")
    if (!el) {
      scanningRef.current = false
      setTimeout(() => { startCamera() }, 100)
      return
    }

    try {
      const scanner = new Html5Qrcode("scanner-viewport")
      scannerRef.current = scanner

      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 15,
          qrbox: { width: 280, height: 150 },
        },
        async (decodedText) => {
          const code = decodedText.trim()
          if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(100)
          playBeep("scan")
          setLastScan({ barcode: code, status: "scanning" })

          try {
            await fetch("/api/scanner/scan", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ sessionId, barcode: code }),
            })
            setScanCount((c) => c + 1)
          } catch {
            // silent — POS handles it
          }
        },
        () => {}
      )
    } catch (err) {
      setErrorMsg("No se pudo acceder a la cámara. Verifica los permisos.")
      setStatus("error")
      scanningRef.current = false
      if (scannerRef.current) {
        try { scannerRef.current.clear() } catch {}
        scannerRef.current = null
      }
    }
  }, [sessionId])

  const stopCamera = useCallback(async () => {
    scanningRef.current = false
    const instance = scannerRef.current
    scannerRef.current = null

    if (instance) {
      try {
        await instance.stop()
      } catch {
        // ignore if scanner was not actively scanning
      }
      try {
        instance.clear()
      } catch {
        // ignore if element was already cleared
      }
    }
  }, [])

  useEffect(() => {
    connectToSession()
    return () => { stopCamera() }
  }, [connectToSession, stopCamera])

  useEffect(() => {
    if (status !== "connected") return

    if (PUSHER_KEY) {
      try {
        const pusher = new Pusher(PUSHER_KEY, { cluster: PUSHER_CLUSTER })
        pusherRef.current = pusher
        const channel = pusher.subscribe(`scanner-${sessionId}`)

        channel.bind("product_found", (data: any) => {
          if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(200)
          playBeep("found")
          setLastScan({ barcode: data.barcode, productName: data.product?.name, status: "found" })
          setTimeout(() => setLastScan(prev => prev?.barcode === data.barcode ? null : prev), 3000)
        })

        channel.bind("product_not_found", (data: any) => {
          if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate([100, 100, 100])
          playBeep("not_found")
          setLastScan({ barcode: data.barcode, status: "not_found" })
          setTimeout(() => setLastScan(prev => prev?.barcode === data.barcode ? null : prev), 3000)
        })

        channel.bind("scanner_disconnect", () => {
          stopCamera()
          setStatus("disconnected")
        })
      } catch {
        // Silent — scanner camera continues scanning even if Pusher is offline
      }
    }

    startCamera()

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
  }, [status, sessionId, startCamera, stopCamera])

  return (
    <div className="fixed inset-0 bg-black flex flex-col">
      {/* Header */}
      <div className="bg-zinc-900/80 backdrop-blur-sm px-4 py-3 flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${
            status === "connected" ? "bg-green-500 animate-pulse" :
            status === "connecting" ? "bg-yellow-500 animate-pulse" :
            "bg-red-500"
          }`} />
          <span className="text-white text-sm font-semibold">
            {status === "connected" ? "Conectado" :
             status === "connecting" ? "Conectando..." :
             status === "disconnected" ? "Desconectado" :
             status === "expired" ? "Expirado" : "Error"}
          </span>
        </div>
        <span className="text-zinc-400 text-xs">{scanCount} escaneos</span>
      </div>

      {/* Camera Viewport */}
      <div className="flex-1 relative flex items-center justify-center bg-black">
        {status === "connected" ? (
          <>
            <div id="scanner-viewport" className="w-full h-full" />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-64 h-36 border-2 border-white/30 rounded-lg">
                <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-amber-400" />
                <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-amber-400" />
                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-amber-400" />
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-amber-400" />
              </div>
            </div>
          </>
        ) : (
          <div className="text-center text-zinc-500">
            {status === "expired" ? (
              <>
                <div className="text-4xl mb-3">⏰</div>
                <p className="text-lg font-semibold text-white mb-1">Sesión expirada</p>
                <p className="text-sm">Vuelve a generar el QR desde el POS</p>
              </>
            ) : status === "disconnected" ? (
              <>
                <div className="text-4xl mb-3">📱</div>
                <p className="text-lg font-semibold text-white mb-1">Desconectado</p>
                <p className="text-sm">La sesión fue cerrada desde el POS</p>
              </>
            ) : status === "error" ? (
              <>
                <div className="text-4xl mb-3">⚠️</div>
                <p className="text-lg font-semibold text-white mb-1">Error</p>
                <p className="text-sm text-zinc-400">{errorMsg}</p>
              </>
            ) : (
              <>
                <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-sm">Conectando al POS...</p>
              </>
            )}
          </div>
        )}

        {/* Last scan feedback */}
        {lastScan && status === "connected" && (
          <div className={`absolute bottom-6 left-4 right-4 p-3 rounded-xl backdrop-blur-sm transition-all ${
            lastScan.status === "found" ? "bg-green-900/80" :
            lastScan.status === "not_found" ? "bg-red-900/80" :
            "bg-zinc-900/80"
          }`}>
            <div className="flex items-center gap-2">
              <span className="text-xl">
                {lastScan.status === "found" ? "✅" :
                 lastScan.status === "not_found" ? "❌" : "📷"}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">
                  {lastScan.productName || lastScan.barcode}
                </p>
                {lastScan.productName && (
                  <p className="text-green-300 text-xs">{lastScan.barcode}</p>
                )}
                {lastScan.status === "not_found" && (
                  <p className="text-red-300 text-xs">Producto no encontrado</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      {status === "connected" && (
        <div className="bg-zinc-900/80 backdrop-blur-sm px-4 py-3 flex flex-col gap-3">
          <div className="flex items-center justify-center gap-4 text-zinc-500 text-xs">
            <span>Acerca el código de barras a la cámara</span>
            <button
              className="text-zinc-400 hover:text-white transition-colors underline"
              onClick={() => {
                stopCamera()
                setStatus("disconnected")
                connectToSession()
              }}
            >
              Reconectar
            </button>
          </div>
          <button
            onClick={() => { stopCamera(); setStatus("disconnected") }}
            className="w-full py-2.5 bg-amber-500 text-black font-bold text-sm rounded-xl hover:bg-amber-400 transition-colors active:scale-[0.98]"
          >
            Terminar de escanear
          </button>
        </div>
      )}
      {status === "disconnected" && (
        <div className="bg-zinc-900/80 backdrop-blur-sm px-4 py-3 flex items-center justify-center gap-3 text-xs">
          <span className="text-red-400">Conexión perdida</span>
          <button
            className="px-3 py-1 bg-amber-500 text-black font-semibold rounded-lg hover:bg-amber-400 transition-colors"
            onClick={() => {
              stopCamera()
              connectToSession()
            }}
          >
            Reintentar
          </button>
        </div>
      )}
    </div>
  )
}
