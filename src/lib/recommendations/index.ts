/**
 * Recommendations (FASE 4D) — API pública.
 *
 * Motor de recomendaciones operativas, determinista y sin predicciones:
 * consume el Business Monitor (FASE 4B) y sugiere puntos que "podría ser
 * conveniente revisar", con anti-spam persistente (cooldown + estado).
 */
export * from "./types"
export { RECOMMENDATION_RULES, recommendationRule, CATEGORY_PRIORITY, PRIORITY_ORDER } from "./rules"
export {
  RecommendationInventoryAnalyzer,
  RecommendationSalesAnalyzer,
  RecommendationCustomerAnalyzer,
  RecommendationOrderAnalyzer,
  RecommendationPricingAnalyzer,
  candidateFromObservation,
  candidatesFromObservations,
} from "./analyzers"
export { RecommendationEngine } from "./engine/recommendation-engine"
export type { RecommendationAnalyzer, RecommendationEngineOptions } from "./engine/recommendation-engine"
export {
  prioritizeRecommendations,
  compareRecommendations,
} from "./engine/prioritization"
export { RecommendationSummaryGenerator } from "./generators/summary-generator"
export type { RecommendationSummaryGeneratorOptions } from "./generators/summary-generator"
export { RecommendationService } from "./services/recommendation.service"
export type { RecommendationServiceDeps } from "./services/recommendation.service"
export { createRecommendationEngine, createRecommendationSummaryGenerator, createRecommendationService } from "./factory"
