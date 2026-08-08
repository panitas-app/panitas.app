/**
 * Monitor del Negocio → tarjetas inteligentes (FASE 5E).
 *
 * Convierte un `BusinessSummary` (4B) en bloques `monitor` client-safe que el
 * ConversationRenderer dibuja como tarjetas inteligentes con icono + mensaje +
 * acción. El monitor sigue usando los insights priorizados por 4B; aquí solo se
 * les da forma visual conversacional.
 */
import type { RichBlock, RichResponse } from "@/lib/conversational-actions"
import type { BusinessSummary, Insight, InsightCategory, InsightImportance } from "@/lib/business-intelligence"

const CATEGORY_ICON: Record<InsightCategory, string> = {
  inventory: "package",
  sales: "trending-up",
  orders: "package-check",
  customers: "users",
  activity: "activity",
  general: "sparkles",
}

const IMPORTANCE_TONE: Record<InsightImportance, import("@/lib/conversational-actions").BlockTone> = {
  important: "warning",
  warning: "info",
  info: "success",
}

const IMPORTANCE_SEVERITY: Record<InsightImportance, "info" | "warning" | "critical"> = {
  important: "warning",
  warning: "info",
  info: "info",
}

/** Máximo de tarjetas de monitor por resumen (evita bloques gigantes). */
export const MAX_MONITOR_CARDS = 4

export function insightToMonitorCard(insight: Insight): RichBlock {
  return {
    kind: "monitor",
    tone: IMPORTANCE_TONE[insight.importance],
    severity: IMPORTANCE_SEVERITY[insight.importance],
    icon: CATEGORY_ICON[insight.category] ?? "sparkles",
    title: insight.title,
    description: insight.description,
    actions: [{ label: "Ver detalle", action: insight.title, variant: "secondary" }],
  }
}

/** Convierte un resumen de negocio en una respuesta de tarjetas inteligentes. */
export function summaryToMonitorCards(summary: BusinessSummary, max = MAX_MONITOR_CARDS): RichResponse {
  const cards = summary.insights.slice(0, max).map(insightToMonitorCard)
  return {
    kind: "summary",
    title: "Monitor de negocio",
    blocks: cards.length > 0 ? cards : [{ kind: "text", text: summary.summary }],
  }
}
