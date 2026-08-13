/**
 * Wiring de producción del Sistema de Atención (FASE 8C).
 *
 * Instancia el `AttentionService` global con:
 *  - canal(es) externo(s) de notificación (ninguno conectado en v1: la
 *    arquitectura queda preparada para email/WhatsApp/push sin envíos
 *    automáticos),
 *  - sink de eventos de dominio (`attention.item.*`) hacia el bus 5H para
 *    auditoría y feed del dashboard.
 *
 * Este módulo NO se importa desde el grafo del bus de eventos (solo lo usan
 * las rutas API), evitando ciclos de dependencia.
 */
import { fireDomainEvent } from "@/lib/events"
import { FilteredAttentionNotifier, type ExternalAttentionChannel } from "./notifier"
import { AttentionService } from "./service"

/** Canales externos reales. Vacío en v1: se inyectan cuando existan. */
const externalChannels: ExternalAttentionChannel[] = []

export const attentionService = new AttentionService({
  notifier: new FilteredAttentionNotifier(externalChannels, { minPriority: "high" }),
  onEvent: (payload) => {
    fireDomainEvent({
      type: payload.type,
      tenantId: payload.storeId,
      aggregateId: payload.itemId,
      aggregateType: "attention_item",
      source: "attention-center",
      actorId: payload.actorId,
      data: {
        itemId: payload.itemId,
        attentionType: payload.itemType,
        priority: payload.priority,
      },
    })
  },
})
