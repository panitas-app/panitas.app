/**
 * Detector de pedidos (FASE 8C).
 *
 * Reglas deterministas sobre pedidos reales:
 *  - `delayed`: pedido en flujo (confirmado/preparando/enviado) sin avanzar.
 *  - `pending`: pedido sin confirmar después de un tiempo razonable (excluye POS).
 */
import { ATTENTION_CONFIG } from "../config"
import type { Situation } from "../types"

export interface OrderRow {
  id: string
  orderNumber: string
  status: string
  paymentStatus: string
  posPin: boolean
  customerName: string
  createdAt: Date
  updatedAt: Date
}

export interface OrderData {
  orders: OrderRow[]
}

const HOUR_MS = 60 * 60 * 1000
const DAY_MS = 24 * HOUR_MS

export function detectOrders(data: OrderData, now: Date = new Date()): Situation[] {
  const situations: Situation[] = []

  for (const order of data.orders) {
    if (order.posPin) continue

    const isInFlow = ["confirmed", "preparing", "shipped"].includes(order.status)
    if (isInFlow) {
      const isShipped = order.status === "shipped"
      const delayMs = isShipped
        ? ATTENTION_CONFIG.orderShippedDelayedDays * DAY_MS
        : ATTENTION_CONFIG.orderDelayedHours * HOUR_MS
      if (now.getTime() - order.updatedAt.getTime() >= delayMs) {
        situations.push({
          type: "order.delayed",
          priority: "medium",
          entityType: "order",
          entityId: order.id,
          title: `Pedido ${order.orderNumber} retrasado`,
          description: `El pedido ${order.orderNumber} de ${order.customerName} sigue en "${order.status}" sin avance desde hace más tiempo de lo esperado.`,
          recommendation: "Verifica el estado con el cliente o la agencia de envío para evitar una cancelación.",
          metadata: {
            orderNumber: order.orderNumber,
            status: order.status,
            customerName: order.customerName,
          },
        })
      }
      continue
    }

    if (order.status === "pending" && order.paymentStatus === "pending") {
      if (now.getTime() - order.createdAt.getTime() >= ATTENTION_CONFIG.orderPendingHours * HOUR_MS) {
        situations.push({
          type: "order.pending",
          priority: "low",
          entityType: "order",
          entityId: order.id,
          title: `Pedido ${order.orderNumber} por confirmar`,
          description: `El pedido ${order.orderNumber} de ${order.customerName} sigue sin confirmar ni pagar.`,
          recommendation: "Contacta al cliente para confirmar o cerrar el pedido.",
          metadata: {
            orderNumber: order.orderNumber,
            customerName: order.customerName,
          },
        })
      }
    }
  }

  return situations
}
