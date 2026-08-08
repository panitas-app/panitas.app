/**
 * Listener: Omnichannel Inbox (FASE 7A).
 *
 * Hook desacoplado del Centro de Conversaciones. Los eventos del inbox se
 * publican con `data.domain === "inbox"` para distinguirlos de los eventos del
 * motor conversacional del asistente (FASE 3C/5C).
 *
 * Este listener reacciona al ciclo de vida del inbox y notifica a un callback
 * inyectable (por defecto no-op). Sirve de punto de integración para futuras
 * notificaciones en tiempo real (WebSocket/SSE) sin acoplar el inbox a un
 * transporte concreto. El throttle por tienda evita ráfagas.
 */
import type { EventBus } from "../event-bus"
import type { DomainEvent } from "../event-types"

export interface InboxNotifyInput {
  tenantId: string
  conversationId: string
  eventType: string
}

export interface InboxListenerOptions {
  /** Callback inyectable: se invoca ante eventos del inbox (default: no-op). */
  notify?: (input: InboxNotifyInput) => void | Promise<void>
  /** Intervalo mínimo entre notificaciones por tienda (default 5000ms). */
  throttleMs?: number
}

export const INBOX_EVENTS = new Set([
  "conversation.created",
  "conversation.updated",
  "conversation.message.created",
  "conversation.assigned",
  "conversation.completed",
  "conversation.tagged",
])

export function registerInboxListener(bus: EventBus, options: InboxListenerOptions = {}) {
  const notify = options.notify
  const throttleMs = options.throttleMs ?? 5_000
  const lastByTenant = new Map<string, number>()

  return bus.subscribeAll(async (event: DomainEvent) => {
    if (!INBOX_EVENTS.has(event.type)) return
    const payload = event.data as { domain?: string } | undefined
    if (payload?.domain !== "inbox") return
    if (!notify) return

    const now = Date.now()
    const last = lastByTenant.get(event.tenantId) ?? 0
    if (now - last < throttleMs) return
    lastByTenant.set(event.tenantId, now)

    const data = event.data as { conversationId?: string } | undefined
    const conversationId = data?.conversationId ?? (event.aggregateId as string | undefined) ?? ""

    try {
      await notify({ tenantId: event.tenantId, conversationId, eventType: event.type })
    } catch (error) {
      console.error(
        "[events] notificación de inbox falló:",
        error instanceof Error ? error.message : String(error),
      )
    }
  })
}
