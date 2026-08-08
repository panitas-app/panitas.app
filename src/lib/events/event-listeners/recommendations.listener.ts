/**
 * Listener: Recommendation Engine (FASE 5H).
 *
 * Cuando el monitor de negocio genera un resumen (`assistant.monitor.updated`),
 * este listener (opcional) dispara el motor de recomendaciones 4D y publica el
 * resultado como `assistant.recommendation.created`.
 *
 * Sin `generate` inyectado no hace nada (noop). El motor nunca es llamado por
 * módulos de negocio directamente: solo vía eventos.
 */
import type { EventBus } from "../event-bus"
import type { DomainEvent } from "../event-types"

export interface RecommendationGenerationInput {
  tenantId: string
  actorId?: string
  correlationId?: string
}

export interface RecommendationsListenerOptions {
  generate?: (input: RecommendationGenerationInput) => Promise<unknown[]>
}

export function registerRecommendationsListener(bus: EventBus, options: RecommendationsListenerOptions = {}) {
  const generate = options.generate

  return bus.subscribe("assistant.monitor.updated", async (event: DomainEvent) => {
    if (!generate) return
    try {
      const recommendations = await generate({
        tenantId: event.tenantId,
        actorId: event.actorId,
        correlationId: event.correlationId,
      })
      await bus.publish({
        type: "assistant.recommendation.created",
        data: { recommendations, count: recommendations.length },
        tenantId: event.tenantId,
        actorId: event.actorId,
        source: "events:recommendations",
        correlationId: event.correlationId,
      })
    } catch (error) {
      console.error(
        "[events] generación de recomendaciones falló:",
        error instanceof Error ? error.message : String(error),
      )
    }
  })
}
