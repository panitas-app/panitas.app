/**
 * Communication Integration Layer (FASE 7C) — Middleware y utilidades de
 * normalización.
 *
 * Normaliza los mensajes de salida (texto recortado, arrays y metadata
 * garantizados) y los payloads entrantes de los proveedores hacia el modelo
 * unificado `ProviderMessage`.
 */
import type {
  ProviderAttachment,
  ProviderChannelType,
  ProviderInboundEvent,
  ProviderMessage,
  ProviderMessageStatus,
  ProviderSender,
} from "../provider-types"
import type { SendMiddleware } from "./middleware-types"

/** Normaliza un mensaje de salida antes de enviarlo. */
export const normalizeOutboundMiddleware: SendMiddleware = async (input, next) => {
  const normalized = {
    ...input,
    text: input.text?.trim() ?? "",
    attachments: Array.isArray(input.attachments) ? input.attachments : [],
    metadata: input.metadata && typeof input.metadata === "object" ? input.metadata : {},
  }
  return next(normalized)
}

let inboundCounter = 0

function nextInboundId(channel: ProviderChannelType): string {
  inboundCounter += 1
  return `${channel}-${Date.now().toString(36)}-${inboundCounter}`
}

/**
 * Convierte un payload entrante de un proveedor al modelo unificado.
 * Extrae `conversationId`, `sender`, `recipient`, `text` y `attachments` de
 * campos genéricos (el proveedor mapea los suyos antes de llamar aquí).
 */
export function normalizeInboundEvent(input: {
  providerId: string
  channel: ProviderChannelType
  conversationId: string
  sender?: ProviderSender
  recipient: string
  text: string
  attachments?: ProviderAttachment[]
  externalMessageId?: string
  metadata?: Record<string, unknown>
}): ProviderInboundEvent {
  const message: ProviderMessage = {
    id: input.externalMessageId ?? nextInboundId(input.channel),
    channel: input.channel,
    conversationId: input.conversationId,
    sender: input.sender ?? "customer",
    recipient: input.recipient,
    text: input.text?.trim() ?? "",
    attachments: Array.isArray(input.attachments) ? input.attachments : [],
    timestamp: new Date().toISOString(),
    metadata: input.metadata && typeof input.metadata === "object" ? input.metadata : {},
    status: "received" as ProviderMessageStatus,
  }
  return {
    providerId: input.providerId,
    channel: input.channel,
    conversationId: input.conversationId,
    message,
  }
}
