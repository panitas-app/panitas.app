/**
 * Motor de Atención (FASE 8C).
 *
 * Conecta el evento de negocio con la re-evaluación de las reglas y provee un
 * throttling por tienda para no recalcular el negocio en cada request. La
 * evaluación en sí vive en `AttentionService.sync`; este módulo solo decide
 * CUÁNDO y contra QUÉ eventos dispararla.
 *
 * Los triggers se derivan del catálogo de reglas (`rules.ts`): cada regla
 * declara qué eventos de negocio invalidan su situación.
 */
import type { EventBus } from "../events/event-bus"
import type { DomainEvent } from "../events/event-types"
import { ATTENTION_RULES } from "./rules"
import { AttentionService, type AttentionSyncResult } from "./service"

/** Conjunto de eventos que invalidan alguna regla de atención. */
export function attentionTriggerEvents(): ReadonlySet<string> {
  const set = new Set<string>()
  for (const rule of Object.values(ATTENTION_RULES)) {
    for (const trigger of rule.eventTriggers) set.add(trigger)
  }
  return set
}

export interface AttentionListenerOptions {
  /** Función de sincronización (inyectable en tests). Por defecto noop. */
  sync?: (storeId: string) => void | Promise<unknown>
  /** Servicio por defecto si no se pasa `sync` (también opcional). */
  service?: AttentionService
  /** Intervalo mínimo entre sincronizaciones por tienda. */
  throttleMs?: number
}

/**
 * Listener del bus de eventos (FASE 27/28): en eventos que invalidan reglas,
 * agenda un re-sync del negocio (throttled). El listener NO crea items
 * directamente: solo re-evalúa reglas deterministas sobre datos reales.
 */
export function registerAttentionListener(bus: EventBus, options: AttentionListenerOptions = {}) {
  const service = options.service ?? (options.sync ? undefined : new AttentionService())
  const sync = options.sync ?? (service ? (storeId: string) => service.sync(storeId) : async () => {})
  const throttleMs = options.throttleMs ?? 30_000
  const lastByTenant = new Map<string, number>()
  const triggers = attentionTriggerEvents()

  return bus.subscribeAll(async (event: DomainEvent) => {
    if (!triggers.has(event.type)) return

    const now = Date.now()
    const last = lastByTenant.get(event.tenantId) ?? 0
    if (now - last < throttleMs) return
    lastByTenant.set(event.tenantId, now)

    try {
      await sync(event.tenantId)
    } catch (error) {
      console.error(
        "[attention] sync disparado por evento falló:",
        error instanceof Error ? error.message : String(error),
      )
    }
  })
}

const lastSyncAt = new Map<string, number>()

/**
 * Ejecuta `service.sync` si la tienda no se sincronizó recientemente.
 * Devuelve el resultado, o `null` si fue throttled (ya se sincronizó).
 * Usado por la API GET para mantener el centro de atención fresco.
 */
export async function syncIfStale(
  service: Pick<AttentionService, "sync">,
  storeId: string,
  throttleMs = 10_000,
): Promise<AttentionSyncResult | null> {
  const now = Date.now()
  const last = lastSyncAt.get(storeId) ?? 0
  if (now - last < throttleMs) return null
  lastSyncAt.set(storeId, now)
  return service.sync(storeId)
}

/** Resetea los throttles (útil en tests). */
export function resetAttentionSyncThrottle(): void {
  lastSyncAt.clear()
}
