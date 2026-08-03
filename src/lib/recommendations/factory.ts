/**
 * Factories de la capa de Recommendations (FASE 4D).
 *
 * Instancias por defecto con dependencias reales. Permiten inyectar
 * dependencias en tests y en las tools del agente.
 */
import { RecommendationEngine } from "./engine/recommendation-engine"
import { RecommendationSummaryGenerator } from "./generators/summary-generator"
import { RecommendationService } from "./services/recommendation.service"

export function createRecommendationEngine(): RecommendationEngine {
  return new RecommendationEngine()
}

export function createRecommendationSummaryGenerator(): RecommendationSummaryGenerator {
  return new RecommendationSummaryGenerator()
}

export function createRecommendationService(): RecommendationService {
  return new RecommendationService()
}
