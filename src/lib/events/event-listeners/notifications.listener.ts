/**
 * Listener: Notificaciones (FASE 5H) — adaptador listo para el futuro.
 *
 * Suscriptor preparado para los canales futuros: WhatsApp, Instagram, Facebook
 * Messenger, Email, Push, apps móviles y webhooks. Hoy usa un `NotificationChannel`
 * inyectable (por defecto noop). NINGÚN módulo de negocio necesita cambiar:
 * cuando llegue el canal, se inyecta y empieza a recibir.
 */
import type { EventBus } from "../event-bus"
import type { DomainEvent } from "../event-types"

export interface NotificationMessage {
  eventType: string
  tenantId: string
  title: string
  body: string
  data?: Record<string, unknown>
}

export interface NotificationChannel {
  send(notification: NotificationMessage): void | Promise<void>
}

export class NoopNotificationChannel implements NotificationChannel {
  send(): void {
    // no-op: canal futuro no conectado.
  }
}

export interface NotificationsListenerOptions {
  channel?: NotificationChannel
  /** Tipos de evento que notifican (por defecto todos los "notificables"). */
  eventTypes?: ReadonlySet<string>
}

export const DEFAULT_NOTIFICATION_EVENTS: ReadonlySet<string> = new Set([
  "sale.created",
  "sale.completed",
  "order.completed",
  "credit.overdue",
  "credit.payment.created",
  "appointment.created",
  "appointment.cancelled",
  "expense.created",
  "inventory.low_stock",
])

export function buildNotification(event: DomainEvent): NotificationMessage | null {
  const data = (event.data ?? {}) as Record<string, unknown>
  const total = typeof data.total === "number" ? `$${data.total.toFixed(2)}` : undefined
  const name = typeof data.name === "string" ? data.name : typeof data.productName === "string" ? data.productName : undefined

  switch (event.type) {
    case "sale.created":
      return { eventType: event.type, tenantId: event.tenantId, title: "Nueva venta", body: `Venta registrada${total ? ` por ${total}` : ""}.`, data }
    case "sale.completed":
      return { eventType: event.type, tenantId: event.tenantId, title: "Venta completada", body: `Pago verificado${total ? ` por ${total}` : ""}.`, data }
    case "order.completed":
      return { eventType: event.type, tenantId: event.tenantId, title: "Pedido completado", body: `El pedido${total ? ` de ${total}` : ""} se completó.`, data }
    case "credit.overdue":
      return { eventType: event.type, tenantId: event.tenantId, title: "Crédito vencido", body: "Un crédito está vencido y requiere atención.", data }
    case "credit.payment.created":
      return { eventType: event.type, tenantId: event.tenantId, title: "Pago de crédito", body: "Se registró un pago de crédito.", data }
    case "appointment.created":
      return { eventType: event.type, tenantId: event.tenantId, title: "Nueva cita", body: `Cita agendada${name ? ` para ${name}` : ""}.`, data }
    case "appointment.cancelled":
      return { eventType: event.type, tenantId: event.tenantId, title: "Cita cancelada", body: `Se canceló una cita${name ? ` de ${name}` : ""}.`, data }
    case "expense.created":
      return { eventType: event.type, tenantId: event.tenantId, title: "Gasto registrado", body: `Gasto${total ? ` de ${total}` : ""}.`, data }
    case "inventory.low_stock":
      return { eventType: event.type, tenantId: event.tenantId, title: "Stock bajo", body: `Stock bajo: ${name ?? "producto"}.`, data }
    default:
      return null
  }
}

export function registerNotificationsListener(bus: EventBus, options: NotificationsListenerOptions = {}) {
  const channel = options.channel ?? new NoopNotificationChannel()
  const eventTypes = options.eventTypes ?? DEFAULT_NOTIFICATION_EVENTS

  return bus.subscribeAll(async (event: DomainEvent) => {
    if (!eventTypes.has(event.type)) return
    const notification = buildNotification(event)
    if (!notification) return
    try {
      await channel.send(notification)
    } catch (error) {
      console.error(
        "[events] envío de notificación falló:",
        error instanceof Error ? error.message : String(error),
      )
    }
  })
}
