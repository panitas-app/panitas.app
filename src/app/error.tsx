"use client"

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-yellow-50 px-4">
      <div className="text-center space-y-6 max-w-md">
        <div className="text-6xl font-black text-red-300 select-none">:(</div>
        <h1 className="font-heading text-3xl font-bold text-[#102A43]">Algo salió mal</h1>
        <p className="text-muted-foreground">
          Ocurrió un error inesperado. Nuestro equipo ha sido notificado.
        </p>
        <p className="text-xs text-muted-foreground bg-muted rounded-md px-3 py-2 font-mono break-all">
          {error.message}
        </p>
        <button
          onClick={reset}
          className="inline-flex items-center justify-center rounded-xl bg-[#184BBF] px-6 py-2.5 text-sm font-bold text-white hover:brightness-105"
        >
          Intentar de nuevo
        </button>
      </div>
    </div>
  )
}
