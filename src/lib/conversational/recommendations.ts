/**
 * Recomendaciones proactivas → tarjetas inteligentes (FASE 5F).
 *
 * Convierte las recomendaciones del Assistant Behavior en bloques `monitor`
 * client-safe que el ConversationRenderer dibuja con icono + mensaje + acción
 * rápida (texto semántico, regla 5D/5E). Presentación pura: sin React.
 */
import type { BlockTone, MonitorBlock, RichResponse } from "@/lib/conversational-actions"
import type { AssistantPriority, AssistantRecommendation, AssistantRecommendationCategory } from "@/lib/assistant-behavior"

/** Máximo de tarjetas proactivas por respuesta (evita bloques gigantes). */
export const MAX_PROACTIVE_CARDS = 4

const CATEGORY_ICON: Record<AssistantRecommendationCategory, string> = {
  operacion: "package-check",
  inventario: "package",
  finanzas: "trending-up",
  clientes: "users",
  proveedores: "shopping-cart",
}

const PRIORITY_TONE: Record<AssistantPriority, BlockTone> = {
  alta: "warning",
  media: "info",
  baja: "success",
}

const PRIORITY_SEVERITY: Record<AssistantPriority, MonitorBlock["severity"]> = {
  alta: "warning",
  media: "info",
  baja: "info",
}

export function recommendationToMonitorBlock(recommendation: AssistantRecommendation): MonitorBlock {
  return {
    kind: "monitor",
    tone: PRIORITY_TONE[recommendation.priority],
    severity: PRIORITY_SEVERITY[recommendation.priority],
    icon: CATEGORY_ICON[recommendation.category] ?? "sparkles",
    title: recommendation.title,
    description: recommendation.description,
    actions: [recommendation.quickAction],
  }
}

/** Convierte recomendaciones priorizadas en una respuesta de tarjetas. */
export function recommendationsToMonitorRich(
  recommendations: AssistantRecommendation[],
  opts: { max?: number; title?: string } = {},
): RichResponse {
  const cards = recommendations.slice(0, opts.max ?? MAX_PROACTIVE_CARDS).map(recommendationToMonitorBlock)
  return {
    kind: "summary",
    title: opts.title ?? "Recomendaciones para tu negocio",
    blocks: cards,
  }
}
