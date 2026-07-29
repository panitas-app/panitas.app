"use client"

import { useEffect } from "react"

export default function ScannerError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("[scanner] Error capturado:", error)
    console.error("[scanner] toString:", String(error))
    console.error("[scanner] keys:", Object.keys(error))
  }, [error])

  const errorStr = String(error)
  const errorType = error.constructor?.name || typeof error
  const errorKeys = Object.keys(error).join(", ")

  return (
    <div className="fixed inset-0 bg-black flex flex-col items-center justify-center px-4 text-center">
      <div className="flex flex-col items-center max-w-sm gap-4 w-full">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-red-900/50 text-red-400">
          <svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
          </svg>
        </div>
        <div className="space-y-1 w-full">
          <h1 className="text-lg font-bold text-white">Algo salió mal</h1>
          <p className="text-sm text-zinc-400 leading-relaxed break-all" style={{ wordBreak: "break-all" }}>
            {errorStr || `[${errorType}] sin mensaje`}
          </p>
          {error.digest && (
            <p className="text-[10px] font-mono text-zinc-600">ID: {error.digest}</p>
          )}
          {errorKeys && (
            <p className="text-[10px] font-mono text-zinc-700">keys: {errorKeys}</p>
          )}
        </div>
        <button
          onClick={() => reset()}
          className="w-full rounded-xl h-11 bg-amber-500 text-black font-bold hover:bg-amber-400 active:scale-95 transition-all flex items-center justify-center gap-2"
        >
          <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182" />
          </svg>
          Reintentar
        </button>
      </div>
    </div>
  )
}
