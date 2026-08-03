/**
 * Priorización de insights (FASE 4B).
 *
 * Orden declarativo de importancia y de categoría según las reglas del
 * cliente:
 *   1) operaciones pendientes, 2) inventario, 3) ventas, 4) clientes,
 *   5) información general.
 *
 * Es determinista y testeable: primero importancia, luego categoría.
 */
import type { InsightCategory, InsightImportance } from "../types"

export const IMPORTANCE_PRIORITY: InsightImportance[] = ["important", "warning", "info"]

export const CATEGORY_PRIORITY: InsightCategory[] = ["orders", "inventory", "sales", "customers", "activity", "general"]

export function importanceRank(importance: InsightImportance): number {
  const rank = IMPORTANCE_PRIORITY.indexOf(importance)
  return rank === -1 ? IMPORTANCE_PRIORITY.length : rank
}

export function categoryRank(category: InsightCategory): number {
  const rank = CATEGORY_PRIORITY.indexOf(category)
  return rank === -1 ? CATEGORY_PRIORITY.length : rank
}

/** Compara dos ítems (observaciones o insights) según prioridad y categoría. */
export function compareInsights<T extends { importance: InsightImportance; category: InsightCategory; title: string }>(
  a: T,
  b: T
): number {
  const byImportance = importanceRank(a.importance) - importanceRank(b.importance)
  if (byImportance !== 0) return byImportance
  const byCategory = categoryRank(a.category) - categoryRank(b.category)
  if (byCategory !== 0) return byCategory
  return a.title.localeCompare(b.title)
}

/** Devuelve una copia ordenada sin mutar el arreglo original. */
export function prioritize<T extends { importance: InsightImportance; category: InsightCategory; title: string }>(items: T[]): T[] {
  return [...items].sort(compareInsights)
}
