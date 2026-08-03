"use client"

import { useCallback, useEffect, useState } from "react"
import { LineChart, RefreshCw } from "lucide-react"

import { Button } from "@/components/ui/button"
import { BusinessSummaryView } from "@/components/business/business-summary"
import { cn } from "@/lib/utils"
import type { BusinessSummary } from "@/lib/business-intelligence"

/**
 * Monitor de negocio (FASE 4C): panel lateral de la página dedicada del asistente.
 * Consume GET /api/agent/business-summary y reutiliza la vista 4B.
 */
export function BusinessMonitorPanel() {
  const [summary, setSummary] = useState<BusinessSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/agent/business-summary")
      const data = await res.json()
      if (!res.ok || !data?.summary) {
        setError(data?.error ?? "No se pudo cargar el resumen de tu negocio.")
        return
      }
      setSummary(data.summary as BusinessSummary)
    } catch {
      setError("No se pudo conectar. Intenta de nuevo.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    async function run() {
      try {
        const res = await fetch("/api/agent/business-summary")
        const data = await res.json()
        if (cancelled) return
        if (!res.ok || !data?.summary) {
          setError(data?.error ?? "No se pudo cargar el resumen de tu negocio.")
          return
        }
        setSummary(data.summary as BusinessSummary)
      } catch {
        if (!cancelled) setError("No se pudo conectar. Intenta de nuevo.")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="flex min-h-0 flex-col">
      <div className="mb-3 flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          <LineChart className="size-3.5" /> Monitor de negocio
        </p>
        <Button
          size="icon"
          variant="ghost"
          className="size-7"
          onClick={() => void load()}
          disabled={loading}
          aria-label="Actualizar resumen"
        >
          <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        {loading && !summary ? (
          <p className="text-xs text-muted-foreground">Generando resumen de tu negocio…</p>
        ) : null}
        {error ? <p className="text-xs text-destructive">{error}</p> : null}
        {summary ? <BusinessSummaryView summary={summary} /> : null}
      </div>
    </div>
  )
}
