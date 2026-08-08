/**
 * Listener: Business Monitor (FASE 5H).
 *
 * En eventos que cambian el estado del negocio (ventas, pedidos, stock,
 * clientes, gastos) notifica a un `refresh` inyectable para que el monitor 4B
 * (Business Intelligence) actualice sus datos/caché. Con throttling por tienda
 * para no saturar con ráfagas de eventos.
 *
 * El listener NO ejecuta el monitor: solo avisa. La lógica vive en el módulo
 * del monitor (desacoplado).
 */
import type { EventBus } from "../event-bus"
import type { DomainEvent } from "../event-types"

export interface MonitorRefreshInput {
  tenantId: string
  eventType: string
  occurredAt: string
}

export interface BusinessMonitorListenerOptions {
  /** Callback de refresco (inyectado por el módulo del monitor). */
  refresh?: (input: MonitorRefreshInput) => void | Promise<void>
  /** Intervalo mínimo entre refrescos por tienda (por defecto 5000ms). */
  throttleMs?: number
}

const TRIGGER_EVENTS = new Set([
  "sale.created",
  "sale.completed",
  "sale.cancelled",
  "order.created",
  "order.updated",
  "order.completed",
  "order.cancelled",
  "product.created",
  "product.updated",
  "product.deleted",
  "product.stock.changed",
  "product.price.changed",
  "customer.created",
  "customer.updated",
  "expense.created",
  "inventory.low_stock",
])

export function registerBusinessMonitorListener(bus: EventBus, options: BusinessMonitorListenerOptions = {}) {
  const refresh = options.refresh
  const throttleMs = options.throttleMs ?? 5_000
  const lastByTenant = new Map<string, number>()

  return bus.subscribeAll(async (event: DomainEvent) => {
    if (!refresh) return
    if (!TRIGGER_EVENTS.has(event.type)) return

    const now = Date.now()
    const last = lastByTenant.get(event.tenantId) ?? 0
    if (now - last < throttleMs) return
    lastByTenant.set(event.tenantId, now)

    try {
      await refresh({ tenantId: event.tenantId, eventType: event.type, occurredAt: event.occurredAt })
    } catch (error) {
      console.error(
        "[events] refresh del monitor falló:",
        error instanceof Error ? error.message : String(error),
      )
    }
  })
}
