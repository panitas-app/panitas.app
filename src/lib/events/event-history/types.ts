/**
 * Event History — contratos (FASE 5H).
 *
 * Almacena la auditoría de eventos: qué evento ocurrió, cuándo, de quién,
 * en qué tienda, con qué origen, resultado, duración y estado. El registro de
 * auditoría NO depende de listeners concretos: lo produce el bus vía
 * `onDispatched` y lo persiste un listener especializado.
 */
import type { ListenerResult } from "../event-types"

export interface EventHistoryRecord {
  id: string
  eventId: string
  eventType: string
  category: string
  tenantId: string
  actorId?: string
  source: string
  aggregateId?: string
  aggregateType?: string
  /** ok | error | rejected */
  result: "ok" | "error" | "rejected"
  /** delivered | failed | rejected */
  status: "delivered" | "failed" | "rejected"
  durationMs: number
  occurredAt: string
  dispatchedAt: string
  listeners: ListenerResult[]
  error?: string
  metadata?: Record<string, unknown>
}

export interface EventHistoryListOptions {
  tenantId?: string
  eventType?: string
  limit?: number
  offset?: number
}

export interface EventHistoryCountOptions {
  tenantId?: string
}

export interface EventHistoryStore {
  record(entry: EventHistoryRecord): Promise<void>
  list(options?: EventHistoryListOptions): Promise<EventHistoryRecord[]>
  count(options?: EventHistoryCountOptions): Promise<number>
}
