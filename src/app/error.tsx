"use client"

import { AlertCircle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function ErrorPage({
  reset,
}: {
  reset: () => void
}) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex size-16 items-center justify-center rounded-full bg-destructive/10">
          <AlertCircle className="size-8 text-destructive/60" />
        </div>
        <h1 className="font-heading text-xl font-bold text-foreground">Algo salió mal</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          Ocurrió un error inesperado. Intenta nuevamente para seguir trabajando.
        </p>
        <Button onClick={reset} className="mt-2 gap-1.5">
          <RefreshCw className="size-3.5" />
          Intentar nuevamente
        </Button>
      </div>
    </div>
  )
}
