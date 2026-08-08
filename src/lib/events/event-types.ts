/**
 * Contratos del Business Events Engine (FASE 5H).
 *
 * Un `DomainEvent` es el contrato mínimo que viaja por el bus. El bus NO ejecuta
 * lógica de negocio: solo distribuye. Toda lógica vive en listeners
 * especializados, cada uno en su propio módulo, sin depender entre sí.
 */

export type EventCategory =
  | "sales"
  | "products"
  | "customers"
  | "credits"
  | "expenses"
  | "suppliers"
  | "orders"
  | "agenda"
  | "conversations"
  | "assistant"
  | "collection"
  | "system"

export interface EventMeta {
  category: EventCategory
  aggregateType: string
  description: string
}

export interface EventInput<TData = unknown> {
  type: string
  data: TData
  aggregateId?: string
  aggregateType?: string
  /** Frontera de aislamiento multi-tenant. TODO evento pertenece a una tienda. */
  tenantId: string
  actorId?: string
  /** Módulo que originó el evento (ej: "order.service", "tool:analytics.businessMonitor"). */
  source: string
  occurredAt?: string
  correlationId?: string
  /** Si se define, el middleware de dedupe descarta duplicados dentro del TTL. */
  dedupeKey?: string
  metadata?: Record<string, unknown>
}

export interface DomainEvent<TData = unknown> extends EventInput<TData> {
  id: string
  occurredAt: string
}

export type Listener<TData = unknown> = (event: DomainEvent<TData>) => void | Promise<void>

export interface ListenerOptions {
  id?: string
  /** Mayor = se ejecuta primero (por defecto 0). */
  priority?: number
  /** Reintentos tras el primer fallo (por defecto usa `defaultRetries` del bus). */
  retries?: number
}

export interface ListenerResult {
  listenerId: string
  eventType: string
  ok: boolean
  durationMs: number
  /** Veces que el listener falló antes de tener éxito (o antes de agotar retries). */
  retries: number
  error?: string
}

export interface DispatchReport {
  event: DomainEvent
  startedAt: string
  durationMs: number
  results: ListenerResult[]
  /** true si todos los listeners terminaron bien y ningún middleware rechazó. */
  ok: boolean
  /** Número de listeners invocados. */
  attempts: number
  /** Mensaje de rechazo de middleware (si el evento fue cortado antes de despachar). */
  rejected?: string
}

/** Contexto que fluye por la cadena de middlewares hacia el despacho. */
export interface DispatchContext {
  event: DomainEvent
  correlationId: string
}

/**
 * Middleware del bus. Un middleware corta el flujo simplemente NO llamando a
 * `next()` (el evento no se despacha y el reporte queda marcado como rechazado).
 */
export type EventMiddleware = (ctx: DispatchContext, next: () => Promise<void>) => Promise<void>

export interface EventStats {
  published: number
  delivered: number
  failedListeners: number
  retried: number
  rejected: number
  listeners: number
  since: string
}

export type LogLevel = "debug" | "info" | "warn" | "error"

export interface EventLogEntry {
  level: LogLevel
  message: string
  eventType?: string
  tenantId?: string
  eventId?: string
  durationMs?: number
  error?: string
}

export interface EventLogger {
  log(entry: EventLogEntry): void
}
