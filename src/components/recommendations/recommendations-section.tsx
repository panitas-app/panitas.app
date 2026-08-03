"use client"

import { useCallback, useEffect, useState } from "react"
import { RefreshCw, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { Recommendation } from "@/lib/recommendations"
import { RecommendationList } from "./recommendation-list"
import { RecommendationBadge } from "./recommendation-badge"

/**
 * Sección de recomendaciones operativas (FASE 4D).
 * Consume GET /api/agent/recommendations (genera con cooldown anti-spam) y
 * permite marcar cada recomendación como vista o descartada (PATCH).
 *
 * FASE 4F: acepta `limit` (máx. visibles) con toggle "Ver todas" y `title` custom
 * para reutilizarse como preview de insights en el Panitas Home.
 */
export function RecommendationsSection({
  limit,
  title = "Recomendaciones para revisar",
  className,
}: {
  limit?: number
  title?: string
  className?: string
}) {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/agent/recommendations")
      const data = await res.json()
      if (!res.ok || !Array.isArray(data?.recommendations)) {
        setError(data?.error ?? "No se pudieron cargar las recomendaciones.")
        return
      }
      setRecommendations(data.recommendations as Recommendation[])
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
        const res = await fetch("/api/agent/recommendations")
        const data = await res.json()
        if (cancelled) return
        if (!res.ok || !Array.isArray(data?.recommendations)) {
          setError(data?.error ?? "No se pudieron cargar las recomendaciones.")
          return
        }
        setRecommendations(data.recommendations as Recommendation[])
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

  const mark = useCallback(async (id: string, action: "view" | "dismiss") => {
    setBusyId(id)
    try {
      const res = await fetch("/api/agent/recommendations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action }),
      })
      if (!res.ok) return
      setRecommendations((prev) => prev.filter((r) => r.id !== id))
    } catch {
      // silencioso: la lista se mantiene sin cambios
    } finally {
      setBusyId(null)
    }
  }, [])

  const visible = limit != null && !expanded ? recommendations.slice(0, limit) : recommendations

  return (
    <section className={cn("rounded-2xl border border-border/60 bg-background/70 p-4 shadow-sm", className)}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          <Sparkles className="size-3.5 text-brand-primary" /> {title}
          <RecommendationBadge count={recommendations.length} />
        </p>
        <Button
          size="icon"
          variant="ghost"
          className="size-7"
          onClick={() => void load()}
          disabled={loading}
          aria-label="Actualizar recomendaciones"
        >
          <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
        </Button>
      </div>

      {error ? <p className="mb-3 text-xs text-destructive">{error}</p> : null}
      {loading && recommendations.length === 0 ? (
        <p className="py-4 text-center text-xs text-muted-foreground">Generando recomendaciones…</p>
      ) : (
        <RecommendationList recommendations={visible} onMark={mark} busy={busyId !== null} />
      )}

      {limit != null && recommendations.length > limit ? (
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="mt-3 w-full rounded-xl border border-border/60 py-2 text-xs font-semibold text-brand-primary transition-colors hover:bg-brand-soft"
        >
          {expanded ? "Ver menos" : `Ver todas (${recommendations.length})`}
        </button>
      ) : null}
    </section>
  )
}
