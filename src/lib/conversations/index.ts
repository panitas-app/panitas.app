/**
 * Memoria Conversacional Inteligente (FASE 5C).
 *
 * Capa nueva que da al asistente memoria estructurada por conversación:
 * intención, entidad activa, parámetros conocidos/pendientes, cambio de tema,
 * resumen y contexto optimizado — sin enviar el historial completo al LLM.
 *
 * Fachada principal: `ConversationManager`.
 */
export { ConversationManager, generateTitle } from "./conversation-manager"
export type { PreparedTurn, ConversationManagerDeps } from "./conversation-manager"

export {
  createInitialContext,
  isContextStale,
  resolveReferences,
  detectTopicChange,
  applyTurnToContext,
  extractEntity,
  extractParams,
  detectDomain,
  DEFAULT_CONTEXT_LIFECYCLE,
} from "./conversation-context"
export type { ReferenceResolution } from "./conversation-context"

export { buildMemoryFragment, formatContextMemory, formatSummaryMemory, CONVERSATION_MEMORY_LIMITS } from "./conversation-memory"
export type { MemoryFormatOptions } from "./conversation-memory"

export { createEmptySummary, updateSummary, buildInitialSummary, factFromContext, DEFAULT_SUMMARY_LIMITS } from "./conversation-summary"
export type { SummaryLimits, SummaryTurnInput } from "./conversation-summary"

export { ConversationStorage } from "./conversation-storage"
export { ConversationSession } from "./conversation-session"
export { ConversationSearch } from "./conversation-search"
export type { ConversationSearchOptions } from "./conversation-search"

export {
  CONVERSATION_DOMAINS,
  CONVERSATION_ENTITY_TYPES,
} from "./conversation-types"
export type {
  ActiveEntity,
  ConversationDomain,
  ConversationEntityType,
  ConversationContextState,
  ConversationSummaryState,
  SummaryTopic,
  ConversationTenant,
  ConversationSessionState,
  ContextLifecycleOptions,
  ConversationListItem,
  PendingParameter,
  TurnOutcome,
} from "./conversation-types"
