"use client"

import { useCallback, useEffect, useState, type ReactNode } from "react"
import { LineChart, RefreshCw, Sparkles } from "lucide-react"

import { BusinessSummaryView } from "@/components/business/business-summary"
import { ConversationRenderer } from "@/components/assistant/renderers/conversation-renderer"
import { summaryToMonitorCards } from "@/lib/conversational/monitor"
import { cn } from "@/lib/utils"
import type { BusinessSummary } from "@/lib/business-intelligence"

/**
 * Monitor de negocio (FASE 4C): vista a ancho completo para Reportes.
 * Consume GET /api/agent/business-summary y reutiliza la vista 4B.
 * Diseño similar al del agente: cabecera de marca + contenido en scroll.
 *
 * FASE 5A (BIC): acepta `maxInsights`, `currency` y `actions` para el
 * protagonismo del monitor dentro del Business Intelligence Center.
 *
 * FASE 5E: muestra primero las tarjetas inteligentes (bloques `monitor`
 * del ConversationRenderer) generadas por `summaryToMonitorCards`, y debajo
 * la vista 4B. `onMonitorAction` reenvía las acciones de las tarjetas.
 */
export function BusinessMonitorSection({
  maxInsights,
  currency = "Bs",
  actions,
  onMonitorAction,
}: {
  maxInsights?: number
  currency?: string
  actions?: ReactNode
  onMonitorAction?: (action: { label: string; action: string }) => void
}) {
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
    <section className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-lg shadow-brand-primary/5">
      <header className="flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-4 sm:px-5">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl brand-gradient text-white shadow-lg shadow-brand-primary/30">
          <LineChart className="size-5" />
        </div>
        <div className="min-w-0">
          <h2 className="font-heading text-base font-extrabold tracking-tight text-gray-900">Monitor de negocio</h2>
          <p className="truncate text-xs text-gray-500">Resumen inteligente de tu negocio en tiempo real</p>
        </div>
        <span className="hidden shrink-0 items-center gap-1 rounded-full bg-brand/15 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-brand-primary sm:inline-flex">
          <Sparkles className="size-3" /> IA
        </span>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          aria-label="Actualizar monitor"
          className="ml-auto flex size-9 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-900 disabled:opacity-60"
        >
          <RefreshCw className={cn("size-4", loading && "animate-spin")} />
        </button>
      </header>

      <div className="p-4 sm:p-6">
        {loading && !summary ? (
          <div className="space-y-3">
            <div className="h-24 animate-pulse rounded-2xl bg-gray-100" />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-20 animate-pulse rounded-2xl bg-gray-100" />
              ))}
            </div>
          </div>
        ) : null}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {summary ? (
          <div>
            <ConversationRenderer
              rich={summaryToMonitorCards(summary, maxInsights)}
              onSend={onMonitorAction}
              className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"
            />
            <div className="mt-4">
              <BusinessSummaryView summary={summary} currency={currency} maxInsights={maxInsights} />
            </div>
            {actions ? <div className="mt-4">{actions}</div> : null}
          </div>
        ) : null}
      </div>
    </section>
  )
}
