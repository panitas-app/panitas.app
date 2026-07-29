"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { AlertCircle, RefreshCw } from "lucide-react"

export default function ScannerError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const [showDetail, setShowDetail] = useState(false)

  useEffect(() => {
    console.error("[scanner] Error capturado:", error)
    console.error("[scanner] Mensaje:", error.message)
    console.error("[scanner] Stack:", error.stack)
  }, [error])

  return (
    <div className="fixed inset-0 bg-black flex flex-col items-center justify-center px-6 text-center">
      <div className="flex flex-col items-center max-w-sm gap-5">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-red-900/50 text-red-400">
          <AlertCircle className="size-7" />
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-bold text-white">Algo salió mal</h1>
          <p className="text-sm text-zinc-400 leading-relaxed">
            Ocurrió un error inesperado. Nuestro equipo ha sido notificado.
          </p>
          {showDetail && error.message && (
            <p className="text-xs font-mono text-zinc-600 mt-2 p-2 bg-zinc-900 rounded-lg break-all">
              {error.message}
              {error.digest && <> (ID: {error.digest})</>}
            </p>
          )}
        </div>
        <div className="flex gap-3 w-full">
          <Button
            onClick={() => reset()}
            className="flex-1 rounded-xl h-11 bg-amber-500 text-black font-bold hover:bg-amber-400 active:scale-95 transition-all gap-2"
          >
            <RefreshCw className="size-4" />
            Reintentar
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowDetail(!showDetail)}
            className="rounded-xl h-11 border-zinc-700 text-zinc-300 font-bold hover:bg-zinc-800 transition-all text-xs"
          >
            Detalles
          </Button>
        </div>
      </div>
    </div>
  )
}
