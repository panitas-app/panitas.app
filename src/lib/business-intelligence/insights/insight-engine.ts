/**
 * Insight Engine (FASE 4B).
 *
 * Convierte observaciones crudas de los analizadores en insights finales:
 *   - asigna `id` y `createdAt`,
 *   - elimina duplicados por (categoría + título),
 *   - ordena por prioridad (importancia → categoría),
 *   - limita el volumen máximo para no saturar la respuesta.
 *
 * No modifica la importancia reportada por las reglas: respeta el catálogo.
 */
import { prioritize } from "./prioritization"
import type { Insight, Observation } from "../types"

export interface InsightEngineOptions {
  /** Máximo de insights que devuelve por ejecución. */
  maxInsights?: number
}

export class InsightEngine {
  private readonly maxInsights: number

  constructor(options: InsightEngineOptions = {}) {
    this.maxInsights = options.maxInsights ?? 12
  }

  build(observations: Observation[]): Insight[] {
    const seen = new Set<string>()
    const insights: Insight[] = []
    const createdAt = new Date().toISOString()

    for (const obs of observations) {
      const key = `${obs.category}:${obs.title}`
      if (seen.has(key)) continue
      seen.add(key)

      insights.push({
        id: `insight:${obs.ruleId}`,
        category: obs.category,
        importance: obs.importance,
        title: obs.title,
        description: obs.description,
        dataSource: obs.dataSource,
        createdAt,
        action: obs.action,
        metricValue: obs.metricValue,
        entityId: obs.entityId,
      })
    }

    return prioritize(insights).slice(0, this.maxInsights)
  }
}
