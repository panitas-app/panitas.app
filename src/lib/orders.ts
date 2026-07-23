/**
 * Calcula el monto pagado efectivamente de una orden.
 *
 * - Órdenes a crédito (creditTerm != null): suma el abono inicial (downPayment)
 *   más las cuotas que estén marcadas como pagadas.
 * - Órdenes normales: retorna el total (se asume pagado al confirmar / verificar).
 */
export function getPaidRevenue(order: {
  total: number
  creditTerm?: string | null
  downPayment?: number | null
  installments?: Array<{ status: string; paidAmount?: number | null; amount: number }>
}): number {
  if (order.creditTerm) {
    const dp = order.downPayment ?? 0
    const installmentsPaid = (order.installments ?? [])
      .filter((i) => i.status === "paid")
      .reduce((s, i) => s + (i.paidAmount ?? i.amount), 0)
    return dp + installmentsPaid
  }
  return order.total
}