/**
 * Helper compartido de los analizadores de recomendaciones (FASE 4D).
 *
 * Convierte una observación del Business Health Monitor (4B) en un candidato
 * de recomendación usando el catálogo de reglas. El motor SOLO consume datos
 * ya analizados por la capa de Business Intelligence (nunca consulta BD).
 */
import type { Observation } from "@/lib/business-intelligence"
import { recommendationRule } from "../rules"
import type { RecommendationCandidate } from "../types"

/** Mapea una observación 4B a un candidato 4D (null si la regla no está en el catálogo). */
export function candidateFromObservation(obs: Observation): RecommendationCandidate | null {
  const ruleDef = recommendationRule(obs.ruleId)
  if (!ruleDef) return null
  return {
    ruleId: ruleDef.id,
    category: ruleDef.category,
    priority: ruleDef.priority,
    title: obs.title,
    description: obs.description,
    reason: ruleDef.reason,
    dataSource: ruleDef.dataSource,
    suggestedAction: ruleDef.suggestedAction,
    entityId: obs.entityId,
    metricValue: obs.metricValue,
    dedupeKey: ruleDef.id,
  }
}

/** Filtra observaciones por ids de reglas y las convierte en candidatos. */
export function candidatesFromObservations(
  observations: Observation[],
  ruleIds: string[]
): RecommendationCandidate[] {
  const allowed = new Set(ruleIds)
  const result: RecommendationCandidate[] = []
  for (const obs of observations) {
    if (!allowed.has(obs.ruleId)) continue
    const candidate = candidateFromObservation(obs)
    if (candidate) result.push(candidate)
  }
  return result
}
