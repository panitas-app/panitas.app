/**
 * Factory del Conversation Engine (FASE 3C).
 *
 * Cablea el Agent Core por defecto (FASE 3A + OpenRouter) con el ConversationService.
 * Único punto de wiring; los tests inyectan dependencias mockeadas directamente.
 */
import { createDefaultAgentCore } from "@/lib/agent-core"
import { ConversationService } from "@/services/conversation.service"
import { ConversationEngine } from "./engine"

export function createConversationEngine(): ConversationEngine {
  return new ConversationEngine({
    agent: createDefaultAgentCore(),
    conversations: new ConversationService(),
  })
}
