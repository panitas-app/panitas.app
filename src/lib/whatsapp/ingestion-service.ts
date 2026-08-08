/**
 * WhatsApp Cloud API (FASE 8A) — Ingesta de mensajes entrantes al inbox.
 *
 * Procesa los eventos unificados que produce el webhook (o el provider) hacia
 * el Omnichannel Inbox:
 *
 *  - dedup persistente por `externalId` (idempotencia del webhook),
 *  - upsert de la conversación por tenant + canal whatsapp + participante
 *    (externalRef = `wa:<waId>`), reutilizando `InboxConversationService`,
 *  - matching de cliente por teléfono sin duplicados (`resolveCustomer`),
 *  - actualización de estados delivered/read/failed de mensajes salientes.
 *
 * Cada evento emite `whatsapp.*` en el bus de negocio.
 */
import { prisma as defaultPrisma } from "@/lib/prisma"
import type { PrismaClient } from "@prisma/client"
import { fireDomainEvent } from "@/lib/events"
import { InboxConversationService, InboxMessageService } from "@/lib/inbox"
import type {
  InboxContentType,
  InboxContext,
  InboxMessageStatus,
} from "@/lib/inbox"
import type { ProviderInboundEvent, ProviderMessage, ProviderStatusUpdate } from "@/lib/communication"

export interface WhatsAppIngestResult {
  ingested: number
  skipped: number
  statuses: number
}

const STATUS_BY_UPDATE: Record<string, InboxMessageStatus> = {
  delivered: "delivered",
  read: "read",
  failed: "failed",
}

function isUniqueViolation(error: unknown): boolean {
  return Boolean(error && typeof error === "object" && (error as { code?: string }).code === "P2002")
}

function contentTypeOf(message: ProviderMessage): InboxContentType {
  const type = message.attachments[0]?.type?.toLowerCase()
  if (type === "image" || type === "audio" || type === "video") return type
  if (type) return "file"
  return "text"
}

export class WhatsAppIngestionService {
  private readonly conversations: InboxConversationService
  private readonly messages: InboxMessageService

  constructor(private readonly db: PrismaClient = defaultPrisma) {
    this.conversations = new InboxConversationService(db)
    this.messages = new InboxMessageService(db)
  }

  async processInbound(
    ctx: InboxContext,
    events: ProviderInboundEvent[],
  ): Promise<WhatsAppIngestResult> {
    let ingested = 0
    let skipped = 0
    let statuses = 0

    for (const event of events) {
      if (event.statusUpdate) {
        await this.applyStatus(ctx, event.statusUpdate)
        statuses += 1
        continue
      }
      const outcome = await this.ingestMessage(ctx, event)
      if (outcome === "ingested") ingested += 1
      else if (outcome === "skipped") skipped += 1
    }

    return { ingested, skipped, statuses }
  }

  private async ingestMessage(
    ctx: InboxContext,
    event: ProviderInboundEvent,
  ): Promise<"ingested" | "skipped"> {
    const message = event.message
    const externalId = message.id
    const waId = message.conversationId || (message.metadata.waId as string) || ""
    if (!waId) return "skipped"

    if (externalId) {
      const existing = await this.db.inboxMessage.findUnique({
        where: { storeId_externalId: { storeId: ctx.storeId, externalId } },
        select: { id: true },
      })
      if (existing) return "skipped"
    }

    const profileName = (message.metadata.profileName as string | undefined)?.trim()
    const externalRef = `wa:${waId}`

    const existingConversation = await this.db.inboxConversation.findFirst({
      where: { storeId: ctx.storeId, externalRef, channel: { type: "whatsapp" } },
      select: { id: true },
    })

    let conversationId: string
    if (existingConversation) {
      conversationId = existingConversation.id
    } else {
      const created = await this.conversations.create(ctx, {
        channelType: "whatsapp",
        identifier: waId,
        customerPhone: waId,
        customerName: profileName || "Cliente de WhatsApp",
        externalRef,
      })
      conversationId = created.id
      fireDomainEvent({
        type: "whatsapp.conversation.upserted",
        data: { domain: "whatsapp", conversationId, waId, externalRef },
        aggregateId: conversationId,
        aggregateType: "InboxConversation",
        tenantId: ctx.storeId,
        actorId: ctx.userId,
        source: "whatsapp.ingestion-service",
      })
    }

    try {
      await this.messages.addMessage(ctx, {
        conversationId,
        sender: "customer",
        content: message.text,
        contentType: contentTypeOf(message),
        attachments: message.attachments,
        channel: "whatsapp",
        recipient: message.recipient,
        senderName: profileName || "Cliente",
        externalId,
      })
      fireDomainEvent({
        type: "whatsapp.message.incoming",
        data: {
          domain: "whatsapp",
          conversationId,
          externalId,
          waId,
          text: message.text.slice(0, 500),
        },
        aggregateId: conversationId,
        aggregateType: "InboxConversation",
        tenantId: ctx.storeId,
        actorId: ctx.userId,
        source: "whatsapp.ingestion-service",
      })
      return "ingested"
    } catch (error: unknown) {
      if (isUniqueViolation(error)) return "skipped"
      throw error
    }
  }

  private async applyStatus(ctx: InboxContext, update: ProviderStatusUpdate): Promise<void> {
    const status = STATUS_BY_UPDATE[update.type]
    if (!status) return
    const result = await this.db.inboxMessage.updateMany({
      where: { storeId: ctx.storeId, externalId: update.externalMessageId },
      data: { status },
    })
    if (result.count > 0) {
      fireDomainEvent({
        type: `whatsapp.message.${update.type}`,
        data: {
          domain: "whatsapp",
          externalId: update.externalMessageId,
          error: update.error ?? null,
        },
        aggregateId: update.externalMessageId,
        aggregateType: "InboxMessage",
        tenantId: ctx.storeId,
        actorId: ctx.userId,
        source: "whatsapp.ingestion-service",
      })
    }
  }
}
