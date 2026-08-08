/**
 * Listener: Communication Integration Layer (FASE 7C).
 *
 * Observa los eventos del dominio `communication` (`channel.*`, `message.*`,
 * `provider.*`) y mantiene un historial ligero en memoria del último evento de
 * cada proveedor, junto a contadores de envíos/recibidos/errores/reintentos.
 * Sirve como hook desacoplado (refresh de UI, alertas) sin acoplar el servicio.
 */
import type { EventBus } from "../event-bus"
import type { DomainEvent } from "../event-types"
import {
  COMMUNICATION_EVENTS,
  COMMUNICATION_EVENT_DOMAIN,
  type CommunicationEventName,
  type CommunicationEventRecord,
  type ProviderChannelType,
} from "@/lib/communication"

export type CommunicationListenerState = {
  providerId: string
  tenantId: string
  channel: ProviderChannelType
  lastEvent: CommunicationEventName
  lastEventAt: string
  sent: number
  received: number
  errors: number
  retries: number
}

export type { CommunicationEventRecord } from "@/lib/communication"

export interface CommunicationListenerOptions {
  onEvent?: (record: CommunicationEventRecord) => void
}

export function registerCommunicationListener(bus: EventBus, options: CommunicationListenerOptions = {}) {
  const store = new Map<string, CommunicationListenerState>()
  const onEvent = options.onEvent

  const off = bus.subscribeAll((event: DomainEvent) => {
    if (!COMMUNICATION_EVENTS.includes(event.type as CommunicationEventName)) return
    const data = (event.data ?? {}) as Record<string, unknown>
    if (data.domain !== COMMUNICATION_EVENT_DOMAIN) return

    const providerId = typeof data.providerId === "string" ? data.providerId : (event.aggregateId ?? "")
    if (!providerId) return

    const channel = data.channel as ProviderChannelType | undefined
    const state = store.get(providerId) ?? {
      providerId,
      tenantId: event.tenantId,
      channel: channel ?? ("other" as ProviderChannelType),
      lastEvent: event.type as CommunicationEventName,
      lastEventAt: event.occurredAt,
      sent: 0,
      received: 0,
      errors: 0,
      retries: 0,
    }
    state.channel = channel ?? state.channel
    state.lastEvent = event.type as CommunicationEventName
    state.lastEventAt = event.occurredAt
    if (event.type === "message.sent") state.sent += 1
    else if (event.type === "message.received") state.received += 1
    else if (event.type === "provider.error") state.errors += 1
    else if (event.type === "provider.retry") state.retries += 1
    store.set(providerId, state)

    onEvent?.({
      tenantId: event.tenantId,
      type: event.type as CommunicationEventName,
      providerId,
      channel: state.channel,
      occurredAt: event.occurredAt,
      conversationId: typeof data.conversationId === "string" ? data.conversationId : undefined,
      messageId: typeof data.messageId === "string" ? data.messageId : undefined,
      error: typeof data.error === "string" ? data.error : undefined,
      attempts: typeof data.attempts === "number" ? data.attempts : undefined,
    })
  })

  return {
    register: (): (() => void) => off,
    get(providerId: string): CommunicationListenerState | null {
      return store.get(providerId) ?? null
    },
    list(): CommunicationListenerState[] {
      return [...store.values()]
    },
    clear(): void {
      store.clear()
    },
  }
}

export type CommunicationListener = ReturnType<typeof registerCommunicationListener>
