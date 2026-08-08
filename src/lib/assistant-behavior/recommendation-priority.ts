/**
 * Priorización de recomendaciones proactivas (FASE 5F).
 *
 * Orden determinista y estable: primero prioridad (alta → media → baja),
 * luego categoría (operación → inventario → finanzas → clientes → proveedores)
 * y finalmente el título alfabéticamente. Sin lenguaje alarmista: "alta"
 * significa "conviene revisar antes", no "está en llamas".
 */
import type { AssistantPriority, AssistantRecommendation, AssistantRecommendationCategory } from "./types"

export const PRIORITY_ORDER: AssistantPriority[] = ["alta", "media", "baja"]

export const CATEGORY_ORDER: AssistantRecommendationCategory[] = [
  "operacion",
  "inventario",
  "finanzas",
  "clientes",
  "proveedores",
]

function priorityRank(p: AssistantPriority): number {
  const rank = PRIORITY_ORDER.indexOf(p)
  return rank === -1 ? PRIORITY_ORDER.length : rank
}

function categoryRank(c: AssistantRecommendationCategory): number {
  const rank = CATEGORY_ORDER.indexOf(c)
  return rank === -1 ? CATEGORY_ORDER.length : rank
}

export function compareAssistantRecommendations(a: AssistantRecommendation, b: AssistantRecommendation): number {
  const byPriority = priorityRank(a.priority) - priorityRank(b.priority)
  if (byPriority !== 0) return byPriority
  const byCategory = categoryRank(a.category) - categoryRank(b.category)
  if (byCategory !== 0) return byCategory
  return a.title.localeCompare(b.title)
}

/** Devuelve una copia ordenada sin mutar el arreglo original. */
export function prioritizeAssistantRecommendations(items: AssistantRecommendation[]): AssistantRecommendation[] {
  return [...items].sort(compareAssistantRecommendations)
}
