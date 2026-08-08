/**
 * Vista cliente del resultado del chat (FASE 5B).
 *
 * Convierte el resultado interno del engine en un objeto seguro para el cliente:
 * sin tool names, sin traces, sin nombres de providers, sin modelos ni prompts.
 * Aplica la sanitización de respuestas como capa de defensa del servidor.
 */

import type { ChatTurnResult } from "@/lib/conversation/engine"
import type { RichResponse } from "@/lib/conversational-actions"

import { sanitizeAssistantReply } from "./sanitize"

/** Acción de confirmación en lenguaje natural (sin tool names). */
export interface ClientConfirmationAction {
  stepId: string
  description: string
  impact: string
}

export interface ClientChatView {
  conversationId: string
  message: {
    id: string
    role: string
    content: string
    timestamp: string
    kind?: string
  }
  response: {
    reply: string
    ok: boolean
    error?: string
  }
  metadata: {
    status: string
    intent?: string
  }
  confirmation?: {
    actions: ClientConfirmationAction[]
  }
  /** FASE 5D: respuesta enriquecida (tarjetas, tablas, resúmenes). */
  rich?: RichResponse
}

function mapConfirmation(confirmation?: ChatTurnResult["confirmation"]): ClientChatView["confirmation"] | undefined {
  if (!confirmation) return undefined
  return {
    actions: confirmation.actions.map((action) => ({
      stepId: action.stepId,
      description: action.description,
      impact: action.impact,
    })),
  }
}

/** Construye la vista segura para el cliente de un resultado de turno. */
export function toClientChatView(result: ChatTurnResult): ClientChatView {
  return {
    conversationId: result.conversationId,
    message: {
      id: result.message.id,
      role: result.message.role,
      content: sanitizeAssistantReply(result.message.content),
      timestamp: result.message.timestamp,
    },
    response: {
      reply: sanitizeAssistantReply(result.response.reply),
      ok: result.response.ok,
      ...(result.response.error ? { error: sanitizeAssistantReply(result.response.error) } : {}),
    },
    metadata: {
      status: String(result.metadata.status ?? "completed"),
      intent: typeof result.metadata.intent === "string" ? result.metadata.intent : undefined,
    },
    confirmation: mapConfirmation(result.confirmation),
    rich: result.rich,
  }
}
