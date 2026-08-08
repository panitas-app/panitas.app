/**
 * Listener: Conversation History (FASE 5H).
 *
 * Indexa los eventos de conversación en un historial ligero por conversación
 * (en memoria). El chat ya persiste su historial en BD vía ConversationService;
 * este listener es el hook desacoplado para consumidores futuros (analítica,
 * sesiones, exportación) sin tocar el módulo de conversaciones.
 */
import type { EventBus } from "../event-bus"
import type { DomainEvent } from "../event-types"

export interface ConversationEventRecord {
  conversationId: string
  type: string
  tenantId: string
  actorId?: string
  occurredAt: string
  role?: string
  intent?: string
}

const CONVERSATION_EVENTS = new Set([
  "conversation.started",
  "conversation.finished",
  "conversation.intent.detected",
  "conversation.message.created",
  "conversation.created",
  "conversation.deleted",
  "message.created",
])

export function createConversationEventHistory() {
  const store = new Map<string, ConversationEventRecord[]>()

  return {
    register(bus: EventBus): () => void {
      return bus.subscribeAll((event: DomainEvent) => {
        if (!CONVERSATION_EVENTS.has(event.type)) return
        // Los eventos del Omnichannel Inbox (FASE 7A), del Copiloto (FASE 7B)
        // y de la Base de Conocimiento (FASE 7D) pertenecen a otras
        // agregaciones; se excluyen del historial del chat.
        const payload = event.data as { domain?: string } | undefined
        if (payload?.domain === "inbox" || payload?.domain === "copilot" || payload?.domain === "knowledge") return
        const data = event.data as { conversationId?: string; role?: string; intent?: string }
        const conversationId = data?.conversationId ?? (event.aggregateId as string | undefined) ?? ""
        if (!conversationId) return

        const records = store.get(conversationId) ?? []
        records.push({
          conversationId,
          type: event.type,
          tenantId: event.tenantId,
          actorId: event.actorId,
          occurredAt: event.occurredAt,
          role: data?.role,
          intent: data?.intent,
        })
        store.set(conversationId, records)
      })
    },
    listByConversation(conversationId: string): ConversationEventRecord[] {
      return store.get(conversationId) ?? []
    },
    clear(): void {
      store.clear()
    },
  }
}

export type ConversationEventHistory = ReturnType<typeof createConversationEventHistory>
