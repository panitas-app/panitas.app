/**
 * Omnichannel Inbox — Servicio de mensajes (FASE 7A).
 *
 * Cada mensaje guarda canal, conversación, emisor, destinatario, contenido,
 * timestamp y metadata (archivos adjuntos, estado de entrega). El servicio
 * gestiona no leídos y lastMessageAt de la conversación y emite el evento
 * `conversation.message.created` (`data.domain === "inbox"`).
 */
import { prisma as defaultPrisma } from "@/lib/prisma"
import { fireDomainEvent } from "@/lib/events"
import type { PrismaClient } from "@prisma/client"
import { serviceError } from "@/services/errors"
import {
  INBOX_CHANNEL_TYPES,
  type InboxChannelType,
  type InboxContext,
  type InboxContentType,
  type InboxMessageDTO,
  type InboxSender,
} from "./conversation-types"

const VALID_SENDERS = new Set<string>(["customer", "agent", "system"])
const VALID_CONTENT_TYPES = new Set<string>(["text", "image", "file", "audio", "video"])

export interface InboxMessageInput {
  conversationId: string
  sender: InboxSender
  content: string
  contentType?: InboxContentType
  attachments?: Array<{ type: string; url: string; name?: string; size?: number }>
  channel?: InboxChannelType
  recipient?: string
  senderName?: string
  authorId?: string
  externalId?: string
}

function parseAttachments(raw: string | null): InboxMessageDTO["attachments"] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as InboxMessageDTO["attachments"]) : []
  } catch {
    return []
  }
}

export class InboxMessageService {
  constructor(private readonly db: PrismaClient = defaultPrisma) {}

  toDTO(m: {
    id: string
    conversationId: string
    channel: string
    sender: string
    authorId: string | null
    senderName: string
    recipient: string
    content: string
    contentType: string
    attachments: string | null
    status: string
    createdAt: Date
  }): InboxMessageDTO {
    return {
      id: m.id,
      conversationId: m.conversationId,
      channel: (INBOX_CHANNEL_TYPES as readonly string[]).includes(m.channel)
        ? (m.channel as InboxChannelType)
        : "other",
      sender: m.sender as InboxSender,
      authorId: m.authorId,
      senderName: m.senderName,
      recipient: m.recipient,
      content: m.content,
      contentType: m.contentType as InboxContentType,
      attachments: parseAttachments(m.attachments),
      status: m.status as InboxMessageDTO["status"],
      createdAt: m.createdAt.toISOString(),
    }
  }

  async addMessage(ctx: InboxContext, input: InboxMessageInput): Promise<InboxMessageDTO> {
    if (!VALID_SENDERS.has(input.sender)) throw serviceError("Emisor inválido: ${input.sender}")
    if (!input.conversationId) throw new Error("Falta la conversación")

    const conversation = await this.db.inboxConversation.findUnique({
      where: { id: input.conversationId },
      select: { id: true, storeId: true, channelId: true, channel: { select: { type: true } } },
    })
    if (!conversation || conversation.storeId !== ctx.storeId) {
      throw new Error("Conversación no encontrada")
    }

    const contentType = input.contentType ?? "text"
    if (!VALID_CONTENT_TYPES.has(contentType)) throw serviceError("Tipo de contenido inválido: ${contentType}")

    const isCustomerMessage = input.sender === "customer"
    const unreadDelta = isCustomerMessage ? 1 : 0

    const message = await this.db.inboxMessage.create({
      data: {
        storeId: ctx.storeId,
        conversationId: input.conversationId,
        channel: input.channel ?? conversation.channel.type,
        sender: input.sender,
        authorId: input.sender === "agent" ? (input.authorId ?? ctx.userId ?? null) : null,
        senderName: input.senderName ?? (isCustomerMessage ? "Cliente" : ""),
        recipient: input.recipient ?? "",
        content: input.content.slice(0, 4000),
        contentType,
        attachments: input.attachments && input.attachments.length > 0
          ? JSON.stringify(input.attachments.slice(0, 10))
          : null,
        status: isCustomerMessage ? "received" : "sent",
        externalId: input.externalId ?? null,
      },
    })

    await this.db.inboxConversation.update({
      where: { id: input.conversationId },
      data: {
        lastMessageAt: message.createdAt,
        unreadCount: unreadDelta > 0 ? { increment: unreadDelta } : undefined,
      },
    })

    fireDomainEvent({
      type: "conversation.message.created",
      data: {
        domain: "inbox",
        conversationId: input.conversationId,
        sender: input.sender,
        content: input.content.slice(0, 500),
      },
      aggregateId: input.conversationId,
      aggregateType: "InboxConversation",
      tenantId: ctx.storeId,
      actorId: ctx.userId,
      source: "inbox.message-service",
    })

    return this.toDTO(message)
  }

  async list(ctx: InboxContext, conversationId: string, limit = 200): Promise<InboxMessageDTO[]> {
    const conversation = await this.db.inboxConversation.findUnique({
      where: { id: conversationId },
      select: { storeId: true },
    })
    if (!conversation || conversation.storeId !== ctx.storeId) {
      throw new Error("Conversación no encontrada")
    }
    const rows = await this.db.inboxMessage.findMany({
      where: { conversationId, storeId: ctx.storeId },
      orderBy: { createdAt: "asc" },
      take: limit,
    })
    return rows.map((m) => this.toDTO(m))
  }

  async markRead(ctx: InboxContext, conversationId: string): Promise<void> {
    const conversation = await this.db.inboxConversation.findUnique({
      where: { id: conversationId },
      select: { storeId: true },
    })
    if (!conversation || conversation.storeId !== ctx.storeId) {
      throw new Error("Conversación no encontrada")
    }
    await this.db.inboxConversation.update({
      where: { id: conversationId },
      data: { unreadCount: 0 },
    })
  }
}
