"use client"

import { useState, useRef } from "react"

export default function CameraTestPage() {
  const [logs, setLogs] = useState<string[]>([])
  const [errorDetails, setErrorDetails] = useState<{ name: string; message: string } | null>(null)
  const [streamInfo, setStreamInfo] = useState<{ id: string; label: string; width?: number; height?: number } | null>(null)
  const [loading, setLoading] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  const log = (msg: string) => {
    const time = new Date().toLocaleTimeString("es-VE", { hour12: false })
    const line = `[${time}] ${msg}`
    console.log(line)
    setLogs((prev) => [line, ...prev])
  }

  const testCamera = async () => {
    setLogs([])
    setErrorDetails(null)
    setStreamInfo(null)
    setLoading(true)

    log("==========================================")
    log("INICIANDO PRUEBA AISLADA DE CÁMARA")
    log(`Contexto Seguro (HTTPS): ${typeof window !== "undefined" && window.isSecureContext ? "SÍ" : "NO"}`)
    log(`User Agent: ${navigator?.userAgent || "Desconocido"}`)

    // Log enumerateDevices
    try {
      if (navigator?.mediaDevices?.enumerateDevices) {
        const devices = await navigator.mediaDevices.enumerateDevices()
        const videoInputs = devices.filter((d) => d.kind === "videoinput")
        log(`[enumerateDevices] Encontradas ${videoInputs.length} cámaras de video:`)
        videoInputs.forEach((d, i) => {
          log(`  -> #${i + 1}: label='${d.label || "Sin etiqueta"}', deviceId='${d.deviceId.slice(0, 10)}...'`)
        })
      }
    } catch (e: any) {
      log(`[enumerateDevices Error] ${e?.name}: ${e?.message}`)
    }

    log("[getUserMedia] Ejecutando navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } } })...")

    try {
      let stream: MediaStream | null = null
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
        })
        log("[getUserMedia ÉXITO] Stream obtenido con facingMode ideal environment")
      } catch (err1: any) {
        log(`[facingMode ideal falló] ${err1?.name}: ${err1?.message}. Intentando { video: true }...`)
        stream = await navigator.mediaDevices.getUserMedia({ video: true })
        log("[getUserMedia ÉXITO] Stream obtenido con { video: true }")
      }

      if (!stream || stream.getVideoTracks().length === 0) {
        log("[ERROR] Stream recibido pero no contiene pistas de video.")
        setErrorDetails({ name: "EmptyStreamError", message: "El stream no contiene pistas de video" })
        setLoading(false)
        return
      }

      const track = stream.getVideoTracks()[0]
      const settings = track.getSettings ? track.getSettings() : {}

      setStreamInfo({
        id: stream.id,
        label: track.label || "Sin etiqueta",
        width: settings.width,
        height: settings.height,
      })

      log(`[STREAM RECOGIDO] Stream ID: ${stream.id}`)
      log(`[TRACK] Label: '${track.label}', Estado: ${track.readyState}`)
      log(`[RESOLUCIÓN] ${settings.width || "N/A"} x ${settings.height || "N/A"} px`)

      if (videoRef.current) {
        log("[VIDEO ELEMENT] Asignando videoRef.current.srcObject = stream...")
        videoRef.current.srcObject = stream
        videoRef.current.autoplay = true
        videoRef.current.playsInline = true
        videoRef.current.muted = true

        try {
          await videoRef.current.play()
          log("[VIDEO ELEMENT] ✅ videoRef.current.play() completado exitosamente. VIDEO EN VIVO OK!")
        } catch (playErr: any) {
          log(`[video.play() Error] ${playErr?.name}: ${playErr?.message}`)
        }
      } else {
        log("[ERROR] No se encontró la referencia videoRef")
      }
    } catch (err: any) {
      const name = err?.name || "UnknownError"
      const message = String(err?.message || err)
      log(`[getUserMedia ERROR CRÍTICO] name='${name}', message='${message}'`)
      setErrorDetails({ name, message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-4 font-sans max-w-xl mx-auto flex flex-col gap-4">
      <header className="border-b border-zinc-800 pb-3">
        <h1 className="text-xl font-bold text-amber-400">🧪 Prueba Aislada de Cámara (/camera-test)</h1>
        <p className="text-xs text-zinc-400 mt-1">
          Página de prueba directa sin QRs, sesiones, Pusher ni librerías externas.
        </p>
      </header>

      {/* Primary Test Action Button */}
      <button
        onClick={testCamera}
        disabled={loading}
        className="w-full py-4 px-6 bg-amber-500 hover:bg-amber-400 active:scale-95 text-black font-bold text-base rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2"
      >
        {loading ? "Abriendo Cámara..." : "📷 Probar Cámara Directa (getUserMedia)"}
      </button>

      {/* Video Viewport Container */}
      <div className="relative w-full h-72 bg-black border-2 border-zinc-800 rounded-2xl overflow-hidden flex items-center justify-center">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />
        {!streamInfo && !errorDetails && !loading && (
          <span className="text-zinc-600 text-xs absolute">Presiona el botón para iniciar la prueba</span>
        )}
      </div>

      {/* Stream Success Card */}
      {streamInfo && (
        <div className="bg-emerald-950/80 border border-emerald-500/40 rounded-xl p-3 text-emerald-200 text-xs space-y-1">
          <p className="font-bold text-sm text-emerald-400">✅ Cámara Activa en Vivo</p>
          <p><strong>Stream ID:</strong> {streamInfo.id}</p>
          <p><strong>Cámara:</strong> {streamInfo.label}</p>
          <p><strong>Resolución:</strong> {streamInfo.width || "N/A"} x {streamInfo.height || "N/A"} px</p>
        </div>
      )}

      {/* Raw Error Details Card */}
      {errorDetails && (
        <div className="bg-rose-950/90 border border-rose-500/50 rounded-xl p-4 text-rose-100 space-y-2">
          <p className="font-bold text-sm text-rose-400">❌ Error de getUserMedia (Crudo sin traducción)</p>
          <div className="bg-black/60 p-2.5 rounded border border-rose-500/30 font-mono text-xs space-y-1">
            <p><strong>error.name:</strong> <span className="text-amber-300">{errorDetails.name}</span></p>
            <p><strong>error.message:</strong> <span className="text-rose-200">{errorDetails.message}</span></p>
          </div>
        </div>
      )}

      {/* Live Diagnostics Log Drawer */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-xs space-y-2">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-1">
          <span className="font-bold text-amber-400">Consola de Diagnóstico Directo</span>
          <button
            onClick={() => {
              const text = logs.join("\n")
              if (navigator?.clipboard?.writeText) {
                navigator.clipboard.writeText(text)
                alert("Logs copiados al portapapeles")
              }
            }}
            className="text-[11px] bg-zinc-800 hover:bg-zinc-700 px-2 py-0.5 rounded text-zinc-300"
          >
            📋 Copiar Logs
          </button>
        </div>
        <div className="font-mono text-[11px] max-h-60 overflow-y-auto space-y-1 select-text cursor-text text-zinc-300">
          {logs.length === 0 && <span className="text-zinc-600">Sin eventos aún</span>}
          {logs.map((l, i) => (
            <div key={i} className="break-words leading-tight">{l}</div>
          ))}
        </div>
      </div>
    </div>
  )
}
