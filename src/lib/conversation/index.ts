/**
 * Conversation Engine (FASE 3C) — barrel público.
 */
export { ConversationEngine } from "./engine"
export type { ChatTurnInput, ChatTurnResult, ConversationEngineDeps } from "./engine"
export { createConversationEngine } from "./factory"
export { buildConversationalHistory, CONVERSATION_CONTEXT_LIMITS } from "./context-builder"
export type { ConversationContextLimits } from "./context-builder"
