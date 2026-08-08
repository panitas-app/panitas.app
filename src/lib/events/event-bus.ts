/**
 * Event Bus central (FASE 5H).
 *
 * Única responsabilidad: distribuir eventos de dominio. NO ejecuta lógica de
 * negocio; toda lógica pertenece a listeners especializados.
 *
 * Soporta:
 *   - publish / subscribe / unsubscribe (incluido wildcard `*`),
 *   - middlewares (pipeline antes del despacho; un middleware corta el flujo
 *     sin llamar a `next()`),
 *   - retry por listener con backoff corto,
 *   - logging (vía `EventLogger`),
 *   - prioridades (mayor = primero),
 *   - `onDispatched` para auditoría/telemetría tras cada despacho,
 *   - protección anti bucles (profundidad de reentrada máxima).
 *
 * Multi-tenant: cada evento lleva su `tenantId`; el bus no filtra ni comparte
 * nada entre tiendas. El aislamiento de almacenamiento vive en los listeners.
 */
import { randomUUID } from "node:crypto"
import { dispatchEvent, EventListenerRegistry } from "./event-dispatcher"
import { NoopEventLogger } from "./event-logger"
import { getEventMeta } from "./event-registry"
import type {
  DispatchContext,
  DispatchReport,
  DomainEvent,
  EventInput,
  EventLogger,
  EventMiddleware,
  EventStats,
  Listener,
  ListenerOptions,
  ListenerResult,
} from "./event-types"

export interface EventBusOptions {
  logger?: EventLogger
  /** Reintentos por defecto por listener (por defecto 0). */
  defaultRetries?: number
  /** Retardo entre reintentos (por defecto 5ms). */
  retryDelayMs?: number
  /** Profundidad máxima de reentrada antes de cortar un posible bucle. */
  maxReentrancy?: number
}

function buildDomainEvent(input: EventInput): DomainEvent {
  const meta = getEventMeta(input.type)
  return {
    id: `evt_${randomUUID()}`,
    type: input.type,
    data: input.data,
    aggregateId: input.aggregateId,
    aggregateType: input.aggregateType ?? meta?.aggregateType,
    tenantId: input.tenantId,
    actorId: input.actorId,
    source: input.source,
    occurredAt: input.occurredAt ?? new Date().toISOString(),
    correlationId: input.correlationId,
    dedupeKey: input.dedupeKey,
    metadata: input.metadata,
  }
}

function buildRejectedReport(input: EventInput, message: string): DispatchReport {
  const now = new Date().toISOString()
  return {
    event: {
      id: `evt_${randomUUID()}`,
      type: input.type,
      data: input.data,
      tenantId: input.tenantId,
      source: input.source,
      occurredAt: now,
      aggregateId: input.aggregateId,
    },
    startedAt: now,
    durationMs: 0,
    results: [],
    ok: false,
    attempts: 0,
    rejected: message,
  }
}

export class EventBus {
  private readonly registry = new EventListenerRegistry()
  private readonly middlewares: EventMiddleware[] = []
  private readonly onDispatchedHandlers: Array<(report: DispatchReport) => void | Promise<void>> = []
  private readonly logger: EventLogger
  private readonly defaultRetries: number
  private readonly retryDelayMs: number
  private readonly maxReentrancy: number
  private depth = 0
  private readonly counters = { published: 0, delivered: 0, failedListeners: 0, retried: 0, rejected: 0 }
  private readonly since = new Date().toISOString()

  constructor(options: EventBusOptions = {}) {
    this.logger = options.logger ?? new NoopEventLogger()
    this.defaultRetries = options.defaultRetries ?? 0
    this.retryDelayMs = options.retryDelayMs ?? 5
    this.maxReentrancy = options.maxReentrancy ?? 32
  }

  subscribe(eventType: string, listener: Listener, options?: ListenerOptions): () => void {
    return this.registry.subscribe(eventType, listener, options)
  }

  subscribeAll(listener: Listener, options?: ListenerOptions): () => void {
    return this.registry.subscribe("*", listener, options)
  }

  unsubscribe(id: string): boolean {
    return this.registry.unsubscribe(id)
  }

  use(middleware: EventMiddleware): () => void {
    this.middlewares.push(middleware)
    return () => {
      const index = this.middlewares.indexOf(middleware)
      if (index >= 0) this.middlewares.splice(index, 1)
    }
  }

  onDispatched(handler: (report: DispatchReport) => void | Promise<void>): () => void {
    this.onDispatchedHandlers.push(handler)
    return () => {
      const index = this.onDispatchedHandlers.indexOf(handler)
      if (index >= 0) this.onDispatchedHandlers.splice(index, 1)
    }
  }

  async publish(input: EventInput): Promise<DispatchReport> {
    this.depth++
    if (this.depth > this.maxReentrancy) {
      this.depth--
      this.counters.rejected++
      const message = `Bucle de eventos detectado (profundidad ${this.maxReentrancy}). Evento '${input.type}' descartado.`
      this.logger.log({ level: "error", message, eventType: input.type })
      return buildRejectedReport(input, message)
    }

    try {
      const startedAt = new Date().toISOString()
      const startMs = Date.now()
      const event = buildDomainEvent(input)
      this.counters.published++
      this.logger.log({
        level: "debug",
        message: "publicando",
        eventType: event.type,
        tenantId: event.tenantId,
        eventId: event.id,
      })

      const ctx: DispatchContext = {
        event,
        correlationId: event.correlationId ?? event.id,
      }

      let dispatched = false
      const runPipeline = async (index: number): Promise<void> => {
        if (index < this.middlewares.length) {
          await this.middlewares[index](ctx, () => runPipeline(index + 1))
        } else {
          dispatched = true
        }
      }
      await runPipeline(0)

      let results: ListenerResult[] = []
      let rejected: string | undefined
      if (dispatched) {
        const outcome = await dispatchEvent(this.registry, event, {
          logger: this.logger,
          defaultRetries: this.defaultRetries,
          retryDelayMs: this.retryDelayMs,
        })
        results = outcome.results
        this.counters.delivered += outcome.results.length
        this.counters.failedListeners += outcome.failed
        this.counters.retried += outcome.results.reduce((sum, r) => sum + r.retries, 0)
      } else {
        this.counters.rejected++
        rejected = `Evento '${event.type}' rechazado por middleware.`
        this.logger.log({
          level: "warn",
          message: rejected,
          eventType: event.type,
          tenantId: event.tenantId,
        })
      }

      const report: DispatchReport = {
        event,
        startedAt,
        durationMs: Date.now() - startMs,
        results,
        ok: rejected === undefined && results.every((r) => r.ok),
        attempts: results.length,
        rejected,
      }

      await this.notifyDispatched(report)

      this.logger.log({
        level: "debug",
        message: "despachado",
        eventType: event.type,
        tenantId: event.tenantId,
        eventId: event.id,
        durationMs: report.durationMs,
      })

      return report
    } finally {
      this.depth--
    }
  }

  private async notifyDispatched(report: DispatchReport): Promise<void> {
    for (const handler of this.onDispatchedHandlers) {
      try {
        const outcome = handler(report)
        if (outcome && typeof (outcome as Promise<void>).then === "function") {
          await (outcome as Promise<void>)
        }
      } catch (error) {
        this.logger.log({
          level: "error",
          message: "handler onDispatched falló",
          eventType: report.event.type,
          eventId: report.event.id,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }
  }

  stats(): EventStats {
    return {
      published: this.counters.published,
      delivered: this.counters.delivered,
      failedListeners: this.counters.failedListeners,
      retried: this.counters.retried,
      rejected: this.counters.rejected,
      listeners: this.registry.size,
      since: this.since,
    }
  }

  clear(): void {
    this.registry.clear()
    this.middlewares.length = 0
    this.onDispatchedHandlers.length = 0
  }
}
