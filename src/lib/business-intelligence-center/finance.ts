/**
 * Salud Financiera del Business Intelligence Center (FASE 5A).
 *
 * Cálculos e interpretaciones de la rentabilidad del mes: utilidad, margen,
 * flujo y punto de equilibrio. Solo lógica pura sobre datos ya consultados por
 * las APIs existentes — no toca la base de datos.
 */
import type { FinancialHealthSnapshot } from "./types"

/** Utilidad = ingresos - gastos. */
export function computeProfit(revenue: number, expenses: number): number {
  return revenue - expenses
}

/** Margen neto en porcentaje (0 si no hay ingresos). */
export function computeMargin(profit: number, revenue: number): number {
  if (revenue <= 0) return 0
  return (profit / revenue) * 100
}

/** Flujo del mes = ingresos cobrados - gastos pagados (modelo simplificado). */
export function computeCashFlow(monthRevenue: number, monthExpenses: number): number {
  return monthRevenue - monthExpenses
}

/** Párrafo de interpretación de la salud financiera del mes. */
export function interpretFinancialHealth(snapshot: FinancialHealthSnapshot): string {
  const { monthRevenue, profit, marginPercent, breakEven, breakEvenPercent } = snapshot

  if (monthRevenue <= 0) {
    return "Aún no registras ventas en el mes. Lleva tus gastos al día para que Panitas pueda mostrarte cuándo tu negocio cubre sus costos fijos."
  }

  const parts: string[] = []

  if (profit >= 0) {
    parts.push(
      `Este mes tu negocio genera una utilidad de $${profit.toFixed(2)} (margen del ${marginPercent.toFixed(1)}%), tus ventas cubren los gastos del período.`
    )
  } else {
    parts.push(
      `Este mes los gastos superan a las ventas por $${Math.abs(profit).toFixed(2)} (margen del ${marginPercent.toFixed(1)}%). Revisa tus gastos y prioriza las ventas para recuperar la rentabilidad.`
    )
  }

  if (breakEven > 0) {
    if (breakEvenPercent >= 100) {
      parts.push(
        `Ya superaste el punto de equilibrio: cubriste los $${breakEven.toFixed(2)} de gastos fijos del mes.`
      )
    } else {
      parts.push(
        `Cubres el ${breakEvenPercent.toFixed(0)}% de tus gastos fijos del mes ($${breakEven.toFixed(2)}): aún faltan ventas para alcanzar el punto de equilibrio.`
      )
    }
  }

  return parts.join(" ")
}

/** Interpretación corta del punto de equilibrio (para el hero de finanzas). */
export function interpretBreakEven(ventasMes: number, gastosFijos: number, balance: number): string {
  if (balance >= 0) {
    return `Superaste tu punto de equilibrio: las ventas del mes ($${ventasMes.toFixed(2)}) cubren los $${gastosFijos.toFixed(2)} de gastos fijos.`
  }
  return `Te falta $${Math.abs(balance).toFixed(2)} para cubrir tus gastos fijos del mes ($${gastosFijos.toFixed(2)}).`
}
