/**
 * Conversation Engine (FASE 3C).
 *
 * Coordina un turno de chat persistente:
 *
 *   1. Asegura la conversación (reutiliza si `conversationId` es del usuario, si no crea).
 *   2. Guarda el mensaje del usuario en BD.
 *   3. Construye el contexto conversacional con historial limitado.
 *   4. Delega el turno al Agent Core (pipeline 3A + Tool System 3B).
 *   5. Guarda la respuesta del asistente (+ toolCalls y metadatos).
 *   6. Devuelve `{ conversationId, message, response, metadata }`.
 *
 * El agent NUNCA toca la BD: recibe el historial vía `AgentRequest.history`.
 */
import { ConversationService } from "@/services/conversation.service"
import { permissionsForRole } from "@/lib/agent/permissions/agent.roles"
import type { PanitasAgent } from "@/lib/agent-core"
import type { AgentRequest, Message, ResolvedToolCall, UsageInfo } from "@/lib/agent-core/types"
import { buildConversationalHistory } from "./context-builder"
import type { StoreServiceContext } from "@/services/context"

export type ChatTurnInput = {
  conversationId?: string
  message: string
}

export type ChatTurnResult = {
  conversationId: string
  message: Message
  response: {
    reply: string
    provider: string
    model: string
    toolCalls: ResolvedToolCall[]
    usage?: UsageInfo
    ok: boolean
    error?: string
  }
  metadata: Record<string, unknown>
}

export type ConversationEngineDeps = {
  agent: PanitasAgent
  conversations: ConversationService
}

export class ConversationEngine {
  constructor(private readonly deps: ConversationEngineDeps) {}

  async chat(ctx: StoreServiceContext, input: ChatTurnInput): Promise<ChatTurnResult> {
    const conversation = await this.deps.conversations.ensureConversation(ctx, input.conversationId)

    const userMessage = await this.deps.conversations.saveMessage(ctx, conversation.id, {
      role: "user",
      content: input.message,
    })

    const { messages: history } = await this.deps.conversations.getHistory(ctx, conversation.id)
    const limitedHistory = buildConversationalHistory(history)

    const request: AgentRequest = {
      userId: ctx.userId,
      storeId: ctx.storeId,
      negocioId: ctx.negocioId ?? null,
      plan: ctx.plan ?? "business",
      role: ctx.role ?? "admin",
      permissions: permissionsForRole(ctx.role ?? "admin"),
      message: input.message,
      sessionId: conversation.id,
      history: limitedHistory,
      taskType: "chat",
      metadata: {
        businessName: ctx.storeName,
        conversationId: conversation.id,
      },
    }

    const response = await this.deps.agent.handle(request)

    await this.deps.conversations.saveMessage(ctx, conversation.id, {
      role: "assistant",
      content: response.reply,
      toolCalls: response.toolCalls,
      metadata: {
        provider: response.provider,
        model: response.model,
        usage: response.usage,
        taskType: response.taskType,
      },
    })

    return {
      conversationId: conversation.id,
      message: userMessage,
      response: {
        reply: response.reply,
        provider: response.provider,
        model: response.model,
        toolCalls: response.toolCalls,
        usage: response.usage,
        ok: response.ok,
        error: response.error,
      },
      metadata: {
        taskType: response.taskType,
        status: response.ok ? "completed" : "error",
      },
    }
  }
}
