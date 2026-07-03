"use client"

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4">
      <p className="text-sm text-red-600 font-medium">Error: {error.message}</p>
      <button onClick={reset} className="text-sm text-[#184BBF] underline underline-offset-2 hover:no-underline">
        Intentar de nuevo
      </button>
    </div>
  )
}
