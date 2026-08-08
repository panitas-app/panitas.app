/**
 * Conversational AI Copilot (FASE 7B).
 *
 * Capa de IA para el Centro de Conversaciones (7A). El copiloto analiza la
 * conversación, detecta multi-intención, resume incrementalmente, sugiere
 * 1-3 respuestas ancladas en datos reales del negocio, propone acciones
 * inteligentes, responde consultas en lenguaje natural y aprende la memoria
 * conversacional del negocio. NUNCA responde automáticamente: solo sugiere.
 */
export * from "./conversation-types"
export * from "./intent-detector"
export * from "./conversation-summary"
export * from "./customer-context"
export * from "./response-generator"
export * from "./action-suggestions"
export * from "./query-answer"
export * from "./conversation-memory"
export * from "./copilot-llm"
export * from "./copilot-service"
