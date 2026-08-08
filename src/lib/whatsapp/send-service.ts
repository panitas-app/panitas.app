/**
 * WhatsApp Cloud API (FASE 8A) — Envío saliente desde el inbox.
 *
 * Punto único por el que el inbox envía mensajes de agente por WhatsApp. Si la
 * conversación es del canal whatsapp, resuelve el `CommunicationService` de la
 * tienda (provider REAL si hay conexión activa; MOCK si no, config-gated) y
 * envía. Devuelve el `externalId` real (wamid) para reflejar el estado.
 *
 * El resto de canales (webchat, email, instagram, messenger) no se ven
 * afectados: esta función hace no-op y la ruta conserva su comportamiento.
 */
import { prisma as defaultPrisma } from "@/lib/prisma"
import type { PrismaClient } from "@prisma/client"
import { serviceError } from "@/services/errors"
import { fireDomainEvent } from "@/lib/events"
import type { InboxAttachment, InboxContentType, InboxContext } from "@/lib/inbox"
import type { ProviderAttachment } from "@/lib/communication"
import { getCommunicationService } from "./communication-service"

export interface WhatsAppSendOutcome {
  externalId: string | null
  sentVia: "whatsapp" | "mock" | "none"
}

export interface WhatsAppSendInput {
  text: string
  contentType?: InboxContentType
  attachments?: InboxAttachment[]
}

function waIdOf(externalRef: string | null | undefined, phone: string | null | undefined): string {
  if (externalRef && externalRef.startsWith("wa:")) return externalRef.slice(3)
  return phone ?? ""
}

export async function sendAgentMessage(
  ctx: InboxContext,
  conversationId: string,
  input: WhatsAppSendInput,
  db: PrismaClient = defaultPrisma,
): Promise<WhatsAppSendOutcome> {
  const conversation = await db.inboxConversation.findUnique({
    where: { id: conversationId },
    select: {
      storeId: true,
      channel: { select: { type: true } },
      externalRef: true,
      customer: { select: { phone: true } },
    },
  })
  if (!conversation || conversation.storeId !== ctx.storeId) {
    throw serviceError("Conversación no encontrada", 404, "INBOX_CONVERSATION_NOT_FOUND")
  }
  if (conversation.channel.type !== "whatsapp") return { externalId: null, sentVia: "none" }

  const recipient = waIdOf(conversation.externalRef, conversation.customer?.phone)
  if (!recipient) {
    throw serviceError("La conversación de WhatsApp no tiene destinatario", 400, "WHATSAPP_NO_RECIPIENT")
  }

  const service = await getCommunicationService(ctx.storeId)
  const attachments: ProviderAttachment[] = (input.attachments ?? []).map((a) => ({
    type: a.type,
    url: a.url,
    name: a.name,
    size: a.size,
  }))

  const result = await service.sendMessage({
    channel: "whatsapp",
    conversationId,
    recipient,
    text: input.text,
    attachments,
  })

  fireDomainEvent({
    type: "whatsapp.message.sent",
    data: {
      domain: "whatsapp",
      conversationId,
      externalId: result.externalMessageId,
      sentVia: result.providerId,
      latencyMs: result.latencyMs,
    },
    aggregateId: conversationId,
    aggregateType: "InboxConversation",
    tenantId: ctx.storeId,
    actorId: ctx.userId,
    source: "whatsapp.send-service",
  })

  return {
    externalId: result.externalMessageId,
    sentVia: result.providerId === "whatsapp" ? "whatsapp" : "mock",
  }
}
