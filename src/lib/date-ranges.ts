/**
 * Utilidades de rangos de fechas (FASE 8G — fix P1).
 *
 * `new Date("YYYY-MM-DD")` se interpreta como medianoche UTC, que al compararse
 * contra columnas timestamptz locales recorta el último día local de cualquier
 * filtro (bug reportado en la auditoría financiera). Estas helpers construyen
 * límites locales correctos y dejan intactas las entradas con hora explícita.
 */

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/

/** Inicio local (00:00:00.000) de un día. Si `value` trae hora, se devuelve tal cual. */
export function startOfLocalDay(value: string): Date {
  if (DATE_ONLY.test(value)) {
    const [y, m, d] = value.split("-").map(Number)
    return new Date(y, m - 1, d, 0, 0, 0, 0)
  }
  return new Date(value)
}

/** Fin local (23:59:59.999) de un día. Si `value` trae hora, se devuelve tal cual. */
export function endOfLocalDay(value: string): Date {
  if (DATE_ONLY.test(value)) {
    const [y, m, d] = value.split("-").map(Number)
    return new Date(y, m - 1, d, 23, 59, 59, 999)
  }
  return new Date(value)
}
