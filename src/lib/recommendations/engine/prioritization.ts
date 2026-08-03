/**
 * Priorización de recomendaciones (FASE 4D).
 *
 * Orden determinista: primero prioridad (HIGH → MEDIUM → LOW), luego
 * categoría (OPERATIONS → INVENTORY → SALES → CUSTOMERS → PRICING), y
 * finalmente el título alfabéticamente. Es testeable y estable.
 */
import { CATEGORY_PRIORITY, PRIORITY_ORDER } from "../rules"
import type { RecommendationCategory, RecommendationPriority } from "../types"

function priorityRank(p: RecommendationPriority): number {
  const rank = PRIORITY_ORDER.indexOf(p)
  return rank === -1 ? PRIORITY_ORDER.length : rank
}

function categoryRank(c: RecommendationCategory): number {
  const rank = CATEGORY_PRIORITY.indexOf(c)
  return rank === -1 ? CATEGORY_PRIORITY.length : rank
}

export function compareRecommendations<T extends { priority: RecommendationPriority; category: RecommendationCategory; title: string }>(
  a: T,
  b: T
): number {
  const byPriority = priorityRank(a.priority) - priorityRank(b.priority)
  if (byPriority !== 0) return byPriority
  const byCategory = categoryRank(a.category) - categoryRank(b.category)
  if (byCategory !== 0) return byCategory
  return a.title.localeCompare(b.title)
}

/** Devuelve una copia ordenada sin mutar el arreglo original. */
export function prioritizeRecommendations<T extends { priority: RecommendationPriority; category: RecommendationCategory; title: string }>(
  items: T[]
): T[] {
  return [...items].sort(compareRecommendations)
}
