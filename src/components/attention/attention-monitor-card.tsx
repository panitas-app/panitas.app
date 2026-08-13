"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { ArrowRight, Bell } from "lucide-react"
import { cn } from "@/lib/utils"
import type { AttentionOverview } from "@/lib/attention/types"

/**
 * Tarjeta del Centro de Atención dentro del Monitor de negocio (FASE 8C).
 *
 * Consume los conteos agregados de `/api/attention/overview` (el monitor NO
 * duplica la lógica de detección: solo muestra lo que ya generó el motor de
 * reglas). Si no hay situaciones abiertas no se muestra, para no añadir ruido.
 */
export function AttentionMonitorCard() {
  const [overview, setOverview] = useState<AttentionOverview | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/attention/overview")
      if (res.ok) {
        const data = await res.json()
        setOverview(data.overview ?? null)
      }
    } catch {
      // El monitor de negocio no debe romperse por una métrica extra.
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  if (loading || !overview || overview.open === 0) return null

  const critical = overview.critical ?? 0
  const high = overview.high ?? 0
  const medium = (overview.byPriority?.medium ?? 0) + (overview.byPriority?.low ?? 0)

  return (
    <Link
      href="/dashboard/atencion"
      className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-gradient-to-r from-amber-50 to-white px-4 py-3 transition-colors hover:border-amber-300"
    >
      <span className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-xl",
        critical > 0 ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-600",
      )}>
        <Bell className="size-4.5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-gray-900">
          {overview.open} {overview.open === 1 ? "situación requiere" : "situaciones requieren"} tu atención
        </p>
        <p className="truncate text-xs text-gray-500">
          {critical > 0 ? `${critical} críticas · ` : ""}
          {high > 0 ? `${high} altas · ` : ""}
          {medium > 0 ? `${medium} otras` : ""}
          Abre el Centro de Atención
        </p>
      </div>
      <ArrowRight className="size-4 shrink-0 text-gray-400" />
    </Link>
  )
}
