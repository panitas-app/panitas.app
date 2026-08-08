/**
 * Monitor del Business Intelligence Center (FASE 5A).
 *
 * Helpers para mostrar el monitor como protagonista: máximo de hallazgos
 * visibles y conteo por categoría para los botones de acción.
 */
import type { Insight, InsightCategory } from "@/lib/business-intelligence"

/** Los primeros `limit` hallazgos (la API ya los entrega priorizados). */
export function topFindings(insights: Insight[], limit = 3): Insight[] {
  return insights.slice(0, limit)
}

/** Conteo de hallazgos por categoría (todas las categorías presentes). */
export function findingsByCategory(insights: Insight[]): Record<InsightCategory, number> {
  const counts: Record<InsightCategory, number> = {
    inventory: 0,
    sales: 0,
    orders: 0,
    customers: 0,
    activity: 0,
    general: 0,
  }
  for (const insight of insights) {
    counts[insight.category] = (counts[insight.category] ?? 0) + 1
  }
  return counts
}
