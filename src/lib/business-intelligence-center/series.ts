/**
 * Series mensuales del Business Intelligence Center (FASE 5A).
 *
 * Helper puro para construir la serie de los últimos N meses con huecos
 * rellenados en cero, listo para los gráficos del área Análisis y la tendencia
 * de Salud Financiera.
 */
import type { MonthlyPoint } from "./types"

const MONTHS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]

/** Clave "YYYY-MM" de una fecha (para agrupar por mes). */
export function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
}

/** Etiqueta corta ("Ene 26") de una clave "YYYY-MM". */
export function monthLabel(key: string): string {
  const [year, month] = key.split("-").map(Number)
  return `${MONTHS[(month - 1 + 12) % 12]} ${String(year).slice(2)}`
}

/** Claves de los últimos `months` meses, incluyendo el actual. */
export function lastMonths(months: number, now: Date = new Date()): string[] {
  const keys: string[] = []
  for (let i = months - 1; i >= 0; i--) {
    keys.push(monthKey(new Date(now.getFullYear(), now.getMonth() - i, 1)))
  }
  return keys
}

/**
 * Construye la serie mensual completa: los últimos `months` meses con 0 en
 * los meses sin datos. `revenueByMonth`/`expensesByMonth` son mapas clave
 * "YYYY-MM" → monto.
 */
export function buildMonthlySeries(
  revenueByMonth: Record<string, number>,
  expensesByMonth: Record<string, number>,
  months = 12,
  now: Date = new Date()
): MonthlyPoint[] {
  return lastMonths(months, now).map((key) => ({
    month: key,
    label: monthLabel(key),
    revenue: revenueByMonth[key] ?? 0,
    expenses: expensesByMonth[key] ?? 0,
  }))
}
