/**
 * Listener: Dashboard (FASE 5H).
 *
 * Mantiene un feed de eventos recientes por tienda, listo para el dashboard
 * (actividad reciente). Cada tienda ve SOLO sus eventos.
 */
import type { EventBus } from "../event-bus"
import { getEventMeta } from "../event-registry"
import type { DomainEvent } from "../event-types"

export interface DashboardFeedItem {
  eventId: string
  type: string
  category: string
  tenantId: string
  source: string
  aggregateId?: string
  actorId?: string
  occurredAt: string
  summary: string
}

function summarize(event: DomainEvent): string {
  const data = event.data as Record<string, unknown> | undefined
  const name = typeof data?.name === "string" ? data.name : undefined
  const total = typeof data?.total === "number" ? data.total : undefined
  switch (event.type) {
    case "sale.created":
      return `Venta registrada ${total !== undefined ? `($${total.toFixed(2)})` : ""}`.trim()
    case "sale.completed":
      return `Venta completada ${total !== undefined ? `($${total.toFixed(2)})` : ""}`.trim()
    case "order.created":
      return `Nuevo pedido${name ? ` de ${name}` : ""}`
    case "order.completed":
      return `Pedido completado${name ? ` de ${name}` : ""}`
    case "order.cancelled":
      return `Pedido cancelado${name ? ` de ${name}` : ""}`
    case "product.created":
      return `Producto creado: ${name ?? "—"}`
    case "product.updated":
      return `Producto actualizado: ${name ?? "—"}`
    case "product.deleted":
      return `Producto eliminado: ${name ?? "—"}`
    case "product.stock.changed":
      return `Stock actualizado: ${name ?? "—"}`
    case "product.price.changed":
      return `Precio actualizado: ${name ?? "—"}`
    case "customer.created":
      return `Nuevo cliente: ${name ?? "—"}`
    case "expense.created":
      return `Gasto registrado ${total !== undefined ? `($${total.toFixed(2)})` : ""}`.trim()
    case "credit.created":
      return `Crédito otorgado`
    case "credit.overdue":
      return `Crédito vencido`
    case "appointment.created":
      return `Cita agendada${name ? ` para ${name}` : ""}`
    case "appointment.cancelled":
      return `Cita cancelada${name ? ` de ${name}` : ""}`
    case "inventory.low_stock":
      return `Stock bajo: ${name ?? "—"}`
    case "conversation.intent.detected":
      return `Intención detectada: ${String(data?.intent ?? "—")}`
    case "assistant.recommendation.created":
      return `Recomendaciones generadas (${String(data?.count ?? "—")})`
    default:
      return event.type
  }
}

export function createEventFeed(maxPerTenant = 100) {
  const store = new Map<string, DashboardFeedItem[]>()

  return {
    register(bus: EventBus): () => void {
      return bus.subscribeAll((event) => {
        const items = store.get(event.tenantId) ?? []
        items.push({
          eventId: event.id,
          type: event.type,
          category: getEventMeta(event.type)?.category ?? "system",
          tenantId: event.tenantId,
          source: event.source,
          aggregateId: event.aggregateId,
          actorId: event.actorId,
          occurredAt: event.occurredAt,
          summary: summarize(event),
        })
        if (items.length > maxPerTenant) {
          items.shift()
        }
        store.set(event.tenantId, items)
      })
    },
    recent(tenantId: string, limit = 20): DashboardFeedItem[] {
      return (store.get(tenantId) ?? []).slice(-limit).reverse()
    },
    clear(): void {
      store.clear()
    },
  }
}

export type EventFeed = ReturnType<typeof createEventFeed>
