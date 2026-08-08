/**
 * FASE 6D — Clasificación de prioridad de insights.
 *
 * Reglas centralizadas para clasificar cada insight por impacto
 * (Alta/Media/Baja). Un insight solo puede escalar de prioridad si los
 * datos reales lo justifican; nunca se inventan clasificaciones.
 */
import type { FinancialInsight, FinancialInsightCategory, FinancialPriority } from "./financial-types"

/** Orden de despliegue por prioridad. */
export const PRIORITY_ORDER: FinancialPriority[] = ["alta", "media", "baja"]

export const PRIORITY_RANK: Record<FinancialPriority, number> = {
  alta: 0,
  media: 1,
  baja: 2,
}

/** Prioridad base por categoría de insight. */
const BASE_PRIORITY: Record<FinancialInsightCategory, FinancialPriority> = {
  flujo_negativo: "alta",
  creditos_vencidos: "alta",
  facturas_vencidas: "alta",
  por_pagar_mayor: "alta",
  ventas_cayeron: "media",
  gastos_aumentaron: "media",
  cobrar_esta_semana: "media",
  pagar_esta_semana: "media",
  deuda_concentrada: "media",
  recuperacion_creditos: "baja",
  ventas_crecieron: "baja",
  flujo_positivo: "baja",
}

/** Umbral de caída de ventas (%) para escalar a Alta. */
export const VENTAS_CAIDA_ALTA = 25

/** Umbral de aumento de gastos (%) para escalar a Alta. */
export const GASTOS_AUMENTO_ALTA = 50

/**
 * Prioridad de una categoría dado un valor de referencia.
 * El valor permite escalar solo cuando el dato lo justifica.
 */
export function priorityFor(category: FinancialInsightCategory, value?: number): FinancialPriority {
  if (category === "ventas_cayeron" && value != null && value <= -VENTAS_CAIDA_ALTA) {
    return "alta"
  }
  if (category === "gastos_aumentaron" && value != null && value >= GASTOS_AUMENTO_ALTA) {
    return "alta"
  }
  return BASE_PRIORITY[category]
}

/** Compara dos insights: primero por prioridad, luego por valor de impacto. */
export function compareInsights(a: FinancialInsight, b: FinancialInsight): number {
  const rankDiff = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]
  if (rankDiff !== 0) return rankDiff
  return (b.value ?? 0) - (a.value ?? 0)
}

/** Ordena insights de mayor a menor impacto (prioridad y luego valor). */
export function sortInsightsByPriority(insights: FinancialInsight[]): FinancialInsight[] {
  return [...insights].sort(compareInsights)
}
