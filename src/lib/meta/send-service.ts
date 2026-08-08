/**
 * Instagram + Messenger (FASE 8B) — Envío saliente desde el inbox.
 *
 * Punto único por el que el inbox envía mensajes de agente por Instagram o
 * Messenger. Resuelve el `CommunicationService` de la tienda+canal (provider
 * REAL si hay conexión activa; MOCK si no, config-gated) y envía. Devuelve el
 * `externalId` real (mid) para reflejar el estado del mensaje.
 *
 * El resto de canales no se ven afectados: esta función se invoca solo para
 * instagram/messenger; WhatsApp usa su propio send-service.
 */
import { prisma as defaultPrisma } from "@/lib/prisma"
import type { PrismaClient } from "@prisma/client"
import { serviceError } from "@/services/errors"
import { fireDomainEvent } from "@/lib/events"
import type { InboxAttachment, InboxContentType, InboxContext } from "@/lib/inbox"
import type { ProviderAttachment } from "@/lib/communication"
import { getMetaCommunicationService } from "./communication-service"
import { externalRefPrefix, type MetaChannel } from "./config"

export interface MetaSendOutcome {
  externalId: string | null
  sentVia: "instagram" | "messenger" | "mock" | "none"
}

export interface MetaSendInput {
  text: string
  contentType?: InboxContentType
  attachments?: InboxAttachment[]
}

function clientIdOf(channel: MetaChannel, externalRef: string | null | undefined): string {
  const prefix = externalRefPrefix(channel)
  if (externalRef && externalRef.startsWith(`${prefix}:`)) return externalRef.slice(prefix.length + 1)
  return ""
}

export async function sendMetaAgentMessage(
  ctx: InboxContext,
  conversationId: string,
  channel: MetaChannel,
  input: MetaSendInput,
  db: PrismaClient = defaultPrisma,
): Promise<MetaSendOutcome> {
  const conversation = await db.inboxConversation.findUnique({
    where: { id: conversationId },
    select: {
      storeId: true,
      channel: { select: { type: true } },
      externalRef: true,
    },
  })
  if (!conversation || conversation.storeId !== ctx.storeId) {
    throw serviceError("Conversación no encontrada", 404, "INBOX_CONVERSATION_NOT_FOUND")
  }
  if (conversation.channel.type !== channel) return { externalId: null, sentVia: "none" }

  const recipient = clientIdOf(channel, conversation.externalRef)
  if (!recipient) {
    throw serviceError(
      `La conversación de ${channel} no tiene destinatario`,
      400,
      "META_NO_RECIPIENT",
    )
  }

  const service = await getMetaCommunicationService(ctx.storeId, channel)
  const attachments: ProviderAttachment[] = (input.attachments ?? []).map((a) => ({
    type: a.type,
    url: a.url,
    name: a.name,
    size: a.size,
  }))

  const result = await service.sendMessage({
    channel,
    conversationId,
    recipient,
    text: input.text,
    attachments,
  })

  fireDomainEvent({
    type: `${channel}.message.sent`,
    data: {
      domain: channel,
      conversationId,
      externalId: result.externalMessageId,
      sentVia: result.providerId,
      latencyMs: result.latencyMs,
    },
    aggregateId: conversationId,
    aggregateType: "InboxConversation",
    tenantId: ctx.storeId,
    actorId: ctx.userId,
    source: "meta.send-service",
  })

  return {
    externalId: result.externalMessageId,
    sentVia: result.providerId === channel ? channel : "mock",
  }
}
