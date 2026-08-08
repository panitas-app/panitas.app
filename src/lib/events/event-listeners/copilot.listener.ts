/**
 * Listener: Copiloto conversacional (FASE 7B).
 *
 * Observa los eventos `conversation.*` publicados por el copiloto (dominio
 * `copilot`) y mantiene un historial ligero en memoria del último análisis de
 * cada conversación: intención principal, resumen, respuestas sugeridas y
 * acciones. Sirve como hook desacoplado para notificaciones en tiempo real del
 * panel sin acoplar el servicio a un canal concreto.
 */
import type { EventBus } from "../event-bus"
import type { DomainEvent } from "../event-types"
import { COPILOT_EVENTS, COPILOT_EVENT_DOMAIN, type CopilotIntent } from "@/lib/conversation-ai"

export interface CopilotEventRecord {
  conversationId: string
  tenantId: string
  type: string
  occurredAt: string
  intents?: CopilotIntent[]
  primaryIntent?: string
  summary?: string
  suggestionCount?: number
  actionTypes?: string[]
}

export interface CopilotListenerOptions {
  /** Hook opcional invocado ante cada evento del copiloto (p.ej. refresh UI). */
  onEvent?: (record: CopilotEventRecord) => void
}

export function registerCopilotListener(bus: EventBus, options: CopilotListenerOptions = {}) {
  const store = new Map<string, CopilotEventRecord>()
  const onEvent = options.onEvent

  const off = bus.subscribeAll((event: DomainEvent) => {
    if (!COPILOT_EVENTS.includes(event.type as (typeof COPILOT_EVENTS)[number])) return
    const data = (event.data ?? {}) as Record<string, unknown>
    if (data.domain !== COPILOT_EVENT_DOMAIN) return

    const conversationId = typeof data.conversationId === "string" ? data.conversationId : event.aggregateId ?? ""
    if (!conversationId) return

    const record: CopilotEventRecord = {
      conversationId,
      tenantId: event.tenantId,
      type: event.type,
      occurredAt: event.occurredAt,
      intents: Array.isArray(data.intents) ? (data.intents as CopilotIntent[]) : undefined,
      primaryIntent: typeof data.primaryIntent === "string" ? data.primaryIntent : undefined,
      summary: typeof data.summary === "string" ? data.summary : undefined,
      suggestionCount: Array.isArray(data.suggestions) ? data.suggestions.length : undefined,
      actionTypes: Array.isArray(data.actions) ? (data.actions as Array<{ type?: string }>).map((a) => a.type ?? "").filter(Boolean) : undefined,
    }
    store.set(conversationId, record)
    onEvent?.(record)
  })

  return {
    register: (): (() => void) => off,
    getByConversation(conversationId: string): CopilotEventRecord | null {
      return store.get(conversationId) ?? null
    },
    list(): CopilotEventRecord[] {
      return [...store.values()]
    },
    clear(): void {
      store.clear()
    },
  }
}

export type CopilotListener = ReturnType<typeof registerCopilotListener>
