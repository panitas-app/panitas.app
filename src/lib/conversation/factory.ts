/**
 * Factory del Conversation Engine (FASE 3C + 3D).
 *
 * Cablea el Agent Core por defecto (FASE 3A + OpenRouter) con el ConversationService,
 * el Memory System (FASE 3D) y el Business Context Builder. Único punto de wiring;
 * los tests inyectan dependencias mockeadas directamente.
 */
import { createDefaultAgentCore } from "@/lib/agent-core"
import { createIntelligenceLayer } from "@/lib/agent-intel"
import { ConversationService } from "@/services/conversation.service"
import { MemoryManager } from "@/lib/agent/memory"
import { BusinessProfileBuilder } from "@/lib/agent/profile"
import { BusinessContextBuilder } from "@/lib/agent/context"
import { ConversationEngine } from "./engine"

export function createConversationEngine(): ConversationEngine {
  const memory = new MemoryManager()
  const context = new BusinessContextBuilder({
    profile: new BusinessProfileBuilder(),
    memory,
  })

  return new ConversationEngine({
    agent: createDefaultAgentCore(),
    conversations: new ConversationService(),
    memory,
    context,
    intelligence: createIntelligenceLayer(),
  })
}
