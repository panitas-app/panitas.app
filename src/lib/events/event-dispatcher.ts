/**
 * Event Dispatcher (FASE 5H).
 *
 * Registro de listeners + despacho por prioridad con reintentos y aislamiento
 * de errores. Responsabilidades:
 *
 *   - suscribir/desuscribir listeners por tipo (y wildcard `*`),
 *   - ordenar por prioridad (mayor primero, estable en el resto),
 *   - ejecutar cada listener con reintentos y backoff corto,
 *   - aislar errores: un listener que falla NO impide a los demás,
 *   - reportar el resultado por listener (duración, reintentos, error).
 *
 * El bus NO ejecuta lógica de negocio aquí: solo coordina la entrega.
 */
import { randomUUID } from "node:crypto"
import type { DomainEvent, EventLogger, Listener, ListenerOptions, ListenerResult } from "./event-types"

export interface RegisteredListener {
  id: string
  /** Tipo al que se suscribió (`*` = wildcard). */
  eventType: string
  listener: Listener
  priority: number
  retries: number
}

export class EventListenerRegistry {
  private readonly byType = new Map<string, RegisteredListener[]>()
  private readonly byId = new Map<string, RegisteredListener>()

  subscribe(eventType: string, listener: Listener, options: ListenerOptions = {}): () => void {
    const id = options.id ?? `listener_${randomUUID()}`
    const entry: RegisteredListener = {
      id,
      eventType,
      listener,
      priority: options.priority ?? 0,
      retries: options.retries ?? 0,
    }
    const list = this.byType.get(eventType) ?? []
    list.push(entry)
    this.byType.set(eventType, list)
    this.byId.set(id, entry)
    return () => this.unsubscribe(id)
  }

  unsubscribe(id: string): boolean {
    const entry = this.byId.get(id)
    if (!entry) return false
    this.byId.delete(id)
    const list = this.byType.get(entry.eventType)
    if (list) {
      const index = list.findIndex((l) => l.id === id)
      if (index >= 0) list.splice(index, 1)
      if (list.length === 0) this.byType.delete(entry.eventType)
    }
    return true
  }

  /** Listeners exactos + wildcard, ordenados por prioridad descendente. */
  listenersFor(eventType: string): RegisteredListener[] {
    const exact = this.byType.get(eventType) ?? []
    const wildcard = this.byType.get("*") ?? []
    return [...exact, ...wildcard].sort((a, b) => b.priority - a.priority)
  }

  get size(): number {
    return this.byId.size
  }

  clear(): void {
    this.byType.clear()
    this.byId.clear()
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function messageOf(error: unknown): string {
  if (error instanceof Error) return error.message
  return String(error)
}

export interface DispatchOptions {
  logger?: EventLogger
  defaultRetries?: number
  retryDelayMs?: number
}

export interface DispatchOutcome {
  results: ListenerResult[]
  ok: boolean
  failed: number
}

/**
 * Despacha el evento a todos los listeners relevantes.
 * Nunca lanza: cada listener corre aislado con reintentos.
 */
export async function dispatchEvent(
  registry: EventListenerRegistry,
  event: DomainEvent,
  options: DispatchOptions = {},
): Promise<DispatchOutcome> {
  const listeners = registry.listenersFor(event.type)
  const results: ListenerResult[] = []
  let failed = 0

  for (const reg of listeners) {
    const retries = reg.retries ?? options.defaultRetries ?? 0
    const started = Date.now()
    let attempts = 0
    let lastError: unknown

    for (let attempt = 0; attempt <= retries; attempt++) {
      attempts = attempt + 1
      try {
        const outcome = reg.listener(event)
        if (outcome && typeof (outcome as Promise<void>).then === "function") {
          await (outcome as Promise<void>)
        }
        lastError = undefined
        break
      } catch (error) {
        lastError = error
        if (attempt < retries) {
          options.logger?.log({
            level: "warn",
            message: "reintentando listener",
            eventType: event.type,
            eventId: event.id,
            error: messageOf(error),
          })
          await sleep(options.retryDelayMs ?? 5)
        }
      }
    }

    const ok = lastError === undefined
    if (!ok) failed++
    results.push({
      listenerId: reg.id,
      eventType: reg.eventType,
      ok,
      durationMs: Date.now() - started,
      retries: Math.max(0, attempts - 1),
      error: ok ? undefined : messageOf(lastError),
    })
  }

  return { results, ok: failed === 0, failed }
}
