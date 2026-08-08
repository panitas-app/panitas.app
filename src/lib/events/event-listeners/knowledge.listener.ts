/**
 * Listener: Business Knowledge Base (FASE 7D).
 *
 * Observa los eventos del dominio `knowledge` y mantiene un índice ligero en
 * memoria por tienda: últimos documentos creados/actualizados/eliminados,
 * documentos indexados y búsquedas ejecutadas. Sirve como hook desacoplado
 * para notificaciones en tiempo real del panel sin acoplar el servicio a un
 * canal concreto.
 */
import type { EventBus } from "../event-bus"
import type { DomainEvent } from "../event-types"
import {
  KNOWLEDGE_EVENTS,
  KNOWLEDGE_EVENT_DOMAIN,
  type KnowledgeEventName,
  type KnowledgeEventRecord,
} from "@/lib/knowledge"

export type KnowledgeListenerState = {
  tenantId: string
  lastEvent: KnowledgeEventName
  lastEventAt: string
  created: number
  updated: number
  deleted: number
  indexed: number
  searches: number
}

export type { KnowledgeEventRecord } from "@/lib/knowledge"

export interface KnowledgeListenerOptions {
  onEvent?: (record: KnowledgeEventRecord) => void
}

export function registerKnowledgeListener(bus: EventBus, options: KnowledgeListenerOptions = {}) {
  const store = new Map<string, KnowledgeListenerState>()
  const onEvent = options.onEvent

  const off = bus.subscribeAll((event: DomainEvent) => {
    if (!KNOWLEDGE_EVENTS.includes(event.type as KnowledgeEventName)) return
    const data = (event.data ?? {}) as Record<string, unknown>
    if (data.domain !== KNOWLEDGE_EVENT_DOMAIN) return

    const tenantId = event.tenantId
    const state = store.get(tenantId) ?? {
      tenantId,
      lastEvent: event.type as KnowledgeEventName,
      lastEventAt: event.occurredAt,
      created: 0,
      updated: 0,
      deleted: 0,
      indexed: 0,
      searches: 0,
    }
    state.lastEvent = event.type as KnowledgeEventName
    state.lastEventAt = event.occurredAt
    if (event.type === "knowledge.document.created") state.created += 1
    else if (event.type === "knowledge.document.updated") state.updated += 1
    else if (event.type === "knowledge.document.deleted") state.deleted += 1
    else if (event.type === "knowledge.document.indexed") state.indexed += 1
    else if (event.type === "knowledge.search.executed") state.searches += 1
    store.set(tenantId, state)

    onEvent?.({
      tenantId,
      type: event.type as KnowledgeEventName,
      documentId: typeof data.documentId === "string" ? data.documentId : undefined,
      title: typeof data.title === "string" ? data.title : undefined,
      query: typeof data.query === "string" ? data.query : undefined,
      hits: typeof data.hits === "number" ? data.hits : undefined,
      occurredAt: event.occurredAt,
    })
  })

  return {
    register: (): (() => void) => off,
    get(tenantId: string): KnowledgeListenerState | null {
      return store.get(tenantId) ?? null
    },
    list(): KnowledgeListenerState[] {
      return [...store.values()]
    },
    clear(): void {
      store.clear()
    },
  }
}

export type KnowledgeListener = ReturnType<typeof registerKnowledgeListener>
