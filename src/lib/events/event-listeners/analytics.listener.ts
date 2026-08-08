/**
 * Listener: Analytics (FASE 5H).
 *
 * Agrega contadores en memoria por tienda a partir de los eventos de dominio.
 * Cada tienda queda aislada (`snapshot(tenantId)` solo ve SU actividad).
 * En el futuro este listener puede volcar a un almacén de series temporales
 * sin que el resto de módulos cambie.
 */
import type { EventBus } from "../event-bus"

export interface EventAnalyticsSnapshot {
  tenantId: string
  sales: { count: number; revenue: number }
  orders: { count: number }
  products: { created: number; deleted: number }
  customers: { created: number }
  expenses: { count: number; total: number }
  credits: { created: number; completed: number }
  lowStockAlerts: number
  appointments: { created: number; cancelled: number }
  messages: number
  totalEvents: number
}

function freshSnapshot(tenantId: string): EventAnalyticsSnapshot {
  return {
    tenantId,
    sales: { count: 0, revenue: 0 },
    orders: { count: 0 },
    products: { created: 0, deleted: 0 },
    customers: { created: 0 },
    expenses: { count: 0, total: 0 },
    credits: { created: 0, completed: 0 },
    lowStockAlerts: 0,
    appointments: { created: 0, cancelled: 0 },
    messages: 0,
    totalEvents: 0,
  }
}

type Mutable<T> = { -readonly [K in keyof T]: T[K] }

export function createEventAnalytics() {
  const store = new Map<string, EventAnalyticsSnapshot>()

  const bump = (tenantId: string, fn: (s: Mutable<EventAnalyticsSnapshot>) => void): void => {
    const snapshot = store.get(tenantId) ?? freshSnapshot(tenantId)
    fn(snapshot)
    snapshot.totalEvents++
    store.set(tenantId, snapshot)
  }

  return {
    register(bus: EventBus): () => void {
      return bus.subscribeAll((event) => {
        const tenant = event.tenantId
        const data = event.data as { total?: number; amount?: number }
        switch (event.type) {
          case "sale.created":
            bump(tenant, (s) => {
              s.orders.count++
            })
            break
          case "sale.completed":
            bump(tenant, (s) => {
              s.sales.count++
              s.sales.revenue += data.total ?? 0
            })
            break
          case "sale.cancelled":
            bump(tenant, (s) => {
              s.orders.count = Math.max(0, s.orders.count - 1)
            })
            break
          case "product.created":
            bump(tenant, (s) => {
              s.products.created++
            })
            break
          case "product.deleted":
            bump(tenant, (s) => {
              s.products.deleted++
            })
            break
          case "customer.created":
            bump(tenant, (s) => {
              s.customers.created++
            })
            break
          case "expense.created":
            bump(tenant, (s) => {
              s.expenses.count++
              s.expenses.total += data.amount ?? 0
            })
            break
          case "credit.created":
            bump(tenant, (s) => {
              s.credits.created++
            })
            break
          case "credit.completed":
            bump(tenant, (s) => {
              s.credits.completed++
            })
            break
          case "inventory.low_stock":
            bump(tenant, (s) => {
              s.lowStockAlerts++
            })
            break
          case "appointment.created":
            bump(tenant, (s) => {
              s.appointments.created++
            })
            break
          case "appointment.cancelled":
            bump(tenant, (s) => {
              s.appointments.cancelled++
            })
            break
          case "conversation.message.created":
          case "message.created":
            bump(tenant, (s) => {
              s.messages++
            })
            break
          default:
            bump(tenant, () => {
              // solo incrementa totalEvents
            })
        }
      })
    },
    snapshot(tenantId: string): EventAnalyticsSnapshot {
      return store.get(tenantId) ?? freshSnapshot(tenantId)
    },
    reset(): void {
      store.clear()
    },
  }
}

export type EventAnalytics = ReturnType<typeof createEventAnalytics>
