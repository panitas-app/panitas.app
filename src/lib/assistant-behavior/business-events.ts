/**
 * Business Events → recomendaciones proactivas (FASE 5F).
 *
 * Convierte los insights priorizados del Business Summary (4B) en
 * recomendaciones accionables. Regla de oro: NUNCA se inventa un dato.
 * El título y la descripción provienen del insight; la regla solo aporta
 * categoría, prioridad y acción rápida.
 *
 * Se omiten los insights puramente informativos (sin `action`), porque la
 * proactividad nunca debe interrumpir innecesariamente.
 */
import type { BusinessSummary, Insight, InsightCategory, InsightImportance } from "@/lib/business-intelligence"
import { CATEGORY_DEFAULT_ACTIONS, proactiveRuleFor } from "./proactive-rules"
import type {
  AssistantPriority,
  AssistantRecommendation,
  AssistantRecommendationCategory,
} from "./types"

/** Extrae el ruleId del insight (id con formato `insight:{ruleId}`). */
export function ruleIdFromInsight(insight: Insight): string {
  if (insight.id.startsWith("insight:")) return insight.id.slice("insight:".length)
  return insight.dataSource.replace(/^monitor\./, "")
}

/** Categoría 5F por defecto según la categoría 4B del insight. */
export const CATEGORY_FALLBACK: Record<InsightCategory, AssistantRecommendationCategory> = {
  inventory: "inventario",
  sales: "finanzas",
  orders: "operacion",
  customers: "clientes",
  activity: "operacion",
  general: "operacion",
}

/** Prioridad 5F según la importancia 4B (info → baja, warning → media, important → alta). */
export const PRIORITY_FROM_IMPORTANCE: Record<InsightImportance, AssistantPriority> = {
  important: "alta",
  warning: "media",
  info: "baja",
}

/** Solo los insights que sugieren una acción de revisión generan recomendación. */
export function isActionableInsight(insight: Insight): boolean {
  return typeof insight.action === "string" && insight.action.trim().length > 0
}

function toRecommendation(insight: Insight): AssistantRecommendation {
  const ruleId = ruleIdFromInsight(insight)
  const rule = proactiveRuleFor(ruleId)
  const category = rule?.category ?? CATEGORY_FALLBACK[insight.category] ?? "operacion"
  const priority = rule?.priority ?? PRIORITY_FROM_IMPORTANCE[insight.importance] ?? "baja"
  const quickAction = rule?.quickAction ?? CATEGORY_DEFAULT_ACTIONS[category] ?? CATEGORY_DEFAULT_ACTIONS.operacion

  return {
    id: `reco:${ruleId}`,
    ruleId,
    insightId: insight.id,
    category,
    priority,
    title: insight.title,
    description: insight.description,
    quickAction,
  }
}

/**
 * Detecta eventos accionables en el resumen del negocio.
 * Devuelve recomendaciones SIN priorizar (el engine ordena después).
 * Nunca fabrica hallazgos: sin insights accionables, devuelve [].
 */
export function detectBusinessEvents(summary: BusinessSummary): AssistantRecommendation[] {
  if (!Array.isArray(summary.insights)) return []

  const seen = new Set<string>()
  const recommendations: AssistantRecommendation[] = []

  for (const insight of summary.insights) {
    if (!isActionableInsight(insight)) continue
    const ruleId = ruleIdFromInsight(insight)
    if (seen.has(ruleId)) continue
    seen.add(ruleId)
    recommendations.push(toRecommendation(insight))
  }

  return recommendations
}
