/**
 * Listener: Auditoría (FASE 5H).
 *
 * Se registra vía `bus.onDispatched` (recibe el reporte completo del despacho,
 * no solo el evento) y persiste en el `EventHistoryStore`. Así la auditoría
 * captura Evento, Fecha, Usuario, Tenant, Origen, Resultado, Duración y Estado
 * automáticamente, sin que ningún módulo tenga que llamarla.
 *
 * La escritura es best-effort: la auditoría nunca debe romper la publicación.
 */
import type { EventBus } from "../event-bus"
import { buildEventHistoryRecord, InMemoryEventHistoryStore } from "../event-history"
import type { EventHistoryStore } from "../event-history"

export interface AuditLogListenerOptions {
  store?: EventHistoryStore
}

export function createAuditLogListener(options: AuditLogListenerOptions = {}) {
  const store = options.store ?? new InMemoryEventHistoryStore()

  return {
    store,
    register(bus: EventBus): () => void {
      return bus.onDispatched(async (report) => {
        try {
          await store.record(buildEventHistoryRecord(report))
        } catch (error) {
          console.error(
            "[events] audit listener falló:",
            error instanceof Error ? error.message : String(error),
          )
        }
      })
    },
  }
}
