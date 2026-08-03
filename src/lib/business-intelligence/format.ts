/**
 * Formateadores de la capa de Business Intelligence (FASE 4B).
 *
 * Pequeños helpers para texto de insights y resúmenes. No tocan datos:
 * solo dan formato legible (moneda y porcentaje).
 */

export function money(value: number, currency = "Bs"): string {
  const rounded = Math.round(value * 100) / 100
  return `${currency} ${rounded.toLocaleString("es-VE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

export function pct(value: number): string {
  return `${Math.round(value * 100)}%`
}

/** Lunes de la semana actual a medianoche. */
export function startOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

export function startOfWeek(date: Date): Date {
  const d = startOfDay(date)
  const day = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - day)
  return d
}

export function startOfMonth(date: Date): Date {
  const d = startOfDay(date)
  d.setDate(1)
  return d
}
