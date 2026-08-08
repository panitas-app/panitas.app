/**
 * Assistant Behavior (FASE 5F) — API pública.
 *
 * Capa que convierte a Panitas en un gerente virtual proactivo: analiza el
 * Business Summary (4B), decide con reglas SI sugerir algo y CÓMO decirlo.
 * Siempre sugiere, nunca ejecuta; nunca interrumpe sin hallazgos reales.
 */
export * from "./types"
export { BehaviorEngine } from "./behavior-engine"
export type { BehaviorEngineDeps } from "./behavior-engine"
export { DEFAULT_CACHE_TTL_MS, DEFAULT_MAX_RECOMMENDATIONS } from "./behavior-engine"
export {
  FORBIDDEN_PHRASES,
  CATEGORY_LABELS,
  PRIORITY_LABELS,
  containsForbiddenPhrase,
  sanitizeAssistantText,
  assertPersonalitySafe,
  FINDINGS_GREETING_TEMPLATES,
  NEUTRAL_GREETING_CLOSERS,
  findingsCountPhrase,
  greetingPartOfDay,
  pickGreetingTemplateIndex,
} from "./assistant-personality"
export {
  compareAssistantRecommendations,
  prioritizeAssistantRecommendations,
  PRIORITY_ORDER,
  CATEGORY_ORDER,
} from "./recommendation-priority"
export { PROACTIVE_RULES, proactiveRuleFor, CATEGORY_DEFAULT_ACTIONS } from "./proactive-rules"
export type { ProactiveRuleDef } from "./proactive-rules"
export {
  detectBusinessEvents,
  ruleIdFromInsight,
  isActionableInsight,
  CATEGORY_FALLBACK,
  PRIORITY_FROM_IMPORTANCE,
} from "./business-events"
export { buildAssistantGreeting } from "./greeting-generator"
export type { GreetingOptions } from "./greeting-generator"
export { createBehaviorEngine } from "./factory"
