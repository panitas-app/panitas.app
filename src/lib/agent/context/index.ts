export { buildBusinessContext } from "@/lib/agent/context/business.context"
export type { BusinessContext, BusinessConfig, BusinessSource, NegocioSource } from "@/lib/agent/context/business.context"
export { buildUserContext } from "@/lib/agent/context/user.context"
export type { UserContext, UserSource } from "@/lib/agent/context/user.context"
export { buildAgentContext } from "@/lib/agent/context/session.context"
export {
  buildConversationContext,
  addMessage,
  lastMessages,
  recordAction,
} from "@/lib/agent/context/conversation.context"
export type {
  ConversationContext,
  ConversationMessage,
  ConversationRole,
  ConversationAction,
} from "@/lib/agent/context/conversation.context"
// FASE 3D — Business Context & Memory System.
export { BusinessContextBuilder } from "@/lib/agent/context/business-context-builder"
export type {
  BusinessContextBundle,
  BusinessContextBuilderOptions,
  BusinessContextProviders,
  AgentMemoryItem,
} from "@/lib/agent/context/business-context-builder"
