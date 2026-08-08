/**
 * Communication Integration Layer (FASE 7C) — Middleware de validación.
 *
 * Valida el mensaje de salida antes de que toque al proveedor: canal,
 * destinatario y contenido (texto o adjunto). Lanza `ServiceError` 400.
 */
import { serviceError } from "@/services/errors"
import { PROVIDER_CHANNEL_TYPES } from "../provider-types"
import type { SendMiddleware } from "./middleware-types"

export const MAX_TEXT_LENGTH = 4096

export const validateOutboundMiddleware: SendMiddleware = async (input, next) => {
  if (!PROVIDER_CHANNEL_TYPES.includes(input.channel)) {
    throw serviceError(`Canal inválido: ${input.channel}`, 400, "INVALID_CHANNEL")
  }
  if (!input.recipient || !input.recipient.trim()) {
    throw serviceError("Falta el destinatario del mensaje", 400, "MISSING_RECIPIENT")
  }
  if (!input.conversationId || !input.conversationId.trim()) {
    throw serviceError("Falta la conversación de origen", 400, "MISSING_CONVERSATION")
  }

  const text = input.text?.trim() ?? ""
  const hasAttachment = Array.isArray(input.attachments) && input.attachments.length > 0
  if (!text && !hasAttachment) {
    throw serviceError("El mensaje debe tener texto o al menos un adjunto", 400, "EMPTY_MESSAGE")
  }
  if (text.length > MAX_TEXT_LENGTH) {
    throw serviceError(`El mensaje excede el límite de ${MAX_TEXT_LENGTH} caracteres`, 400, "MESSAGE_TOO_LONG")
  }

  return next()
}
