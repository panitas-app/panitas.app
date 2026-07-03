"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { AlertCircle, RefreshCw, Home } from "lucide-react"
import Link from "next/link"

export default function StoreError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("Store error boundary caught:", error)
  }, [error])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center text-foreground">
      <div className="flex flex-col items-center max-w-md gap-6 p-8 rounded-3xl border border-slate-100 bg-white shadow-xl shadow-slate-100/50">
        
        {/* Error icon with soft red background pulsing */}
        <div className="flex size-16 items-center justify-center rounded-2xl bg-rose-50 text-rose-500 animate-pulse">
          <AlertCircle className="size-8" />
        </div>

        {/* Messaging */}
        <div className="space-y-2">
          <h1 className="text-xl font-bold tracking-tight text-slate-800">
            ¡Ups! Algo salió mal
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Hubo un error temporal al cargar el catálogo de la tienda. Por favor, reintenta la acción o regresa al inicio.
          </p>
        </div>

        {/* Buttons grid */}
        <div className="w-full flex flex-col sm:flex-row gap-3 pt-2">
          <Button
            onClick={() => reset()}
            className="flex-1 rounded-xl h-11 bg-primary text-primary-foreground font-bold hover:brightness-105 active:scale-95 transition-all gap-2"
          >
            <RefreshCw className="size-4" />
            Reintentar
          </Button>
          
          <Link href="/" className="flex-1">
            <Button
              variant="outline"
              className="w-full rounded-xl h-11 border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-all gap-2"
            >
              <Home className="size-4" />
              Inicio
            </Button>
          </Link>
        </div>

        {/* Technical digest if present */}
        {error.digest && (
          <p className="text-[10px] font-mono text-slate-400">
            ID de error: {error.digest}
          </p>
        )}
      </div>
    </div>
  )
}
