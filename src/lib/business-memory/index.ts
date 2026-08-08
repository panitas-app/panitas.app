/**
 * Business Memory Engine (FASE 5G).
 *
 * Memoria ESTABLE del negocio (terminología, preferencias, reglas operativas y
 * patrones de uso), separada del historial conversacional. Antes de responder,
 * el asistente recupera SOLO los recuerdos relevantes por intención; aprende por
 * repetición con umbral (nunca con una sola acción) o por configuración explícita.
 */
export * from "./memory-types"
export * from "./memory-rules"
export * from "./memory-store"
export * from "./memory-learning"
export * from "./memory-query"
export * from "./memory-ui"
export * from "./memory-engine"
export * from "./factory"
export * from "./credit-preferences"
export * from "./collection-preferences"
export * from "./supplier-preferences"
export * from "./financial-preferences"
export * from "./inbox-preferences"
