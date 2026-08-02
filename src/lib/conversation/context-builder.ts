/**
 * Context Builder conversacional (FASE 3C).
 *
 * Limita el historial que se envía al proveedor por tres criterios — cantidad,
 * tamaño y antigüedad — para mantener el prompt acotado y el costo de tokens
 * predecible. Esta es la puerta preparada para futuras fases de resumen/compresión:
 * aquí se puede insertar la compresión sin tocar el resto del sistema.
 */
import type { Message } from "@/lib/agent-core/types"

export const CONVERSATION_CONTEXT_LIMITS = {
  maxMessages: 30,
  maxChars: 8000,
  maxAgeDays: 30,
} as const

export type ConversationContextLimits = {
  maxMessages?: number
  maxChars?: number
  maxAgeDays?: number
}

/** Filtra y recorta el historial respetando los límites (siempre conserva el mensaje más reciente). */
export function buildConversationalHistory(
  messages: Message[],
  limits: ConversationContextLimits = {}
): Message[] {
  const maxMessages = limits.maxMessages ?? CONVERSATION_CONTEXT_LIMITS.maxMessages
  const maxChars = limits.maxChars ?? CONVERSATION_CONTEXT_LIMITS.maxChars
  const maxAgeDays = limits.maxAgeDays ?? CONVERSATION_CONTEXT_LIMITS.maxAgeDays

  const cutoff = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000
  const recent = messages.filter((m) => new Date(m.timestamp).getTime() >= cutoff)
  const last = recent.slice(-maxMessages)

  const kept: Message[] = []
  let total = 0
  for (let i = last.length - 1; i >= 0; i--) {
    const size = last[i].content.length
    if (total + size > maxChars && kept.length > 0) break
    kept.unshift(last[i])
    total += size
  }
  return kept
}
