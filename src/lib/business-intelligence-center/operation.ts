/**
 * Operación del Business Intelligence Center (FASE 5A).
 *
 * Agregación de pedidos por estado e interpretación conversacional del área
 * Operación. Lógica pura sobre datos que ya devuelven las APIs existentes.
 */
import type { OrderStatusTotals } from "./types"

/** Estados de pedido que muestra el panel (mismo orden que la tienda). */
export const ORDER_STATUSES = ["pending", "confirmed", "preparing", "shipped", "delivered", "cancelled"] as const

/** Agrega conteos por estado en un resumen tipado (siempre con los 6 estados). */
export function aggregateOrdersByStatus(statusCounts: Record<string, number>): OrderStatusTotals {
  const byStatus: Record<string, number> = {}
  let total = 0
  for (const status of ORDER_STATUSES) {
    const count = statusCounts[status] ?? 0
    byStatus[status] = count
    total += count
  }
  const cancelled = byStatus.cancelled ?? 0
  return {
    total,
    cancelled,
    active: total - cancelled,
    pending: byStatus.pending ?? 0,
    delivered: byStatus.delivered ?? 0,
    byStatus,
  }
}

/** Párrafo conversacional que resume la operación del negocio. */
export function interpretOperation(input: {
  monthRevenue: number
  monthOrders: number
  activeOrders: number
  pendingOrders: number
  customersTotal: number
  newCustomersThisMonth: number
  productCount: number
  lowStockCount: number
}): string {
  const {
    monthRevenue,
    monthOrders,
    activeOrders,
    pendingOrders,
    customersTotal,
    newCustomersThisMonth,
    productCount,
    lowStockCount,
  } = input

  const parts: string[] = []

  if (monthOrders > 0) {
    parts.push(
      `Registraste ${monthOrders} pedido${monthOrders === 1 ? "" : "s"} este mes por $${monthRevenue.toFixed(2)}.`
    )
  } else {
    parts.push("Aún no registras pedidos este mes.")
  }

  if (activeOrders > 0) {
    parts.push(`${activeOrders} pedido${activeOrders === 1 ? "" : "s"} están activos (sin contar cancelados).`)
  }
  if (pendingOrders > 0) {
    parts.push(`${pendingOrders} están pendientes de atender.`)
  }

  if (customersTotal > 0) {
    parts.push(
      `Tienes ${customersTotal} cliente${customersTotal === 1 ? "" : "s"} en tu cartera (${newCustomersThisMonth} nuevo${newCustomersThisMonth === 1 ? "" : "s"} este mes).`
    )
  }

  if (productCount > 0) {
    parts.push(
      `${productCount} producto${productCount === 1 ? "" : "s"} en inventario` +
        (lowStockCount > 0 ? `, ${lowStockCount} con stock bajo` : "") +
        "."
    )
  }

  return parts.join(" ")
}
