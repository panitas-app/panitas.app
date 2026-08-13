/**
 * Detector de conversaciones (FASE 8C).
 *
 * Regla determinista: una conversación sin respuesta del negocio después de
 * un tiempo de gracia genera UN item por conversación (NUNCA uno por mensaje).
 * Si el cliente envía varios mensajes, se sigue mostrando la misma situación.
 * La conversación se resuelve automáticamente cuando el negocio responde
 * (desaparece de la detección).
 */
import { ATTENTION_CONFIG } from "../config"
import type { Situation } from "../types"

export interface ConversationRow {
  id: string
  title: string
  status: string
  priority: string
  channelName: string
  customerName: string | null
  lastMessageAt: Date | null
  unreadCount: number
}

export interface ConversationData {
  conversations: ConversationRow[]
}

const HOUR_MS = 60 * 60 * 1000
const MINUTE_MS = 60 * 1000

export function detectConversations(data: ConversationData, now: Date = new Date()): Situation[] {
  const graceMs = ATTENTION_CONFIG.conversationGraceMinutes * MINUTE_MS
  const urgentMs = ATTENTION_CONFIG.conversationUrgentHours * HOUR_MS
  const situations: Situation[] = []

  for (const conversation of data.conversations) {
    const lastActivity = conversation.lastMessageAt
    if (!lastActivity) continue

    const waitingMs = now.getTime() - lastActivity.getTime()
    if (waitingMs < graceMs) continue

    const isUrgent = waitingMs >= urgentMs
    const person = conversation.customerName || conversation.title || "el cliente"

    situations.push({
      type: "conversation.pending",
      priority: isUrgent ? "high" : "medium",
      entityType: "inbox_conversation",
      entityId: conversation.id,
      title: `${isUrgent ? "Conversación urgente" : "Conversación sin responder"} con ${person}`,
      description: `El cliente ${person} espera respuesta desde hace más de ${Math.max(1, Math.floor(waitingMs / HOUR_MS))} h en ${conversation.channelName}.`,
      recommendation: "Responde al cliente para cerrar la conversación.",
      metadata: {
        channelName: conversation.channelName,
        waitingMs,
        unreadCount: conversation.unreadCount,
        customerName: person,
      },
    })
  }

  return situations
}
