/**
 * Instagram + Messenger (FASE 8B) — Ingesta de mensajes entrantes al inbox.
 *
 * Procesa los eventos unificados que produce el webhook (o el provider) hacia
 * el Omnichannel Inbox:
 *
 *  - dedup persistente por `externalId` (idempotencia del webhook),
 *  - upsert de la conversación por tenant + canal + participante
 *    (externalRef = `ig:<id>` / `fb:<id>`), reutilizando `InboxConversationService`,
 *  - matching de cliente sin duplicados (`resolveCustomer`),
 *  - estados delivered (por mid) y read (por watermark de conversación).
 *
 * Cada evento emite `instagram.*` / `messenger.*` en el bus de negocio.
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
import { defaultCustomerName, externalRefPrefix, type MetaChannel } from "./config"

export interface MetaIngestResult {
  ingested: number
  skipped: number
  statuses: number
}

const STATUS_BY_UPDATE: Record<string, InboxMessageStatus> = {
  delivered: "delivered",
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

export class MetaIngestionService {
  private readonly conversations: InboxConversationService
  private readonly messages: InboxMessageService
  private readonly channel: MetaChannel
  private readonly prefix: string
  private readonly domain: string
  private readonly db: PrismaClient

  constructor(channel: MetaChannel, db: PrismaClient = defaultPrisma) {
    this.channel = channel
    this.conversations = new InboxConversationService(db)
    this.messages = new InboxMessageService(db)
    this.prefix = externalRefPrefix(channel)
    this.domain = channel
    this.db = db
  }

  async processInbound(ctx: InboxContext, events: ProviderInboundEvent[]): Promise<MetaIngestResult> {
    let ingested = 0
    let skipped = 0
    let statuses = 0

    for (const event of events) {
      if (event.statusUpdate) {
        await this.applyStatus(ctx, event)
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
    const clientId = message.conversationId || (message.metadata.psid as string) || ""
    if (!clientId) return "skipped"

    if (externalId) {
      const existing = await this.db.inboxMessage.findUnique({
        where: { storeId_externalId: { storeId: ctx.storeId, externalId } },
        select: { id: true },
      })
      if (existing) return "skipped"
    }

    const externalRef = `${this.prefix}:${clientId}`

    const existingConversation = await this.db.inboxConversation.findFirst({
      where: { storeId: ctx.storeId, externalRef, channel: { type: this.channel } },
      select: { id: true },
    })

    let conversationId: string
    if (existingConversation) {
      conversationId = existingConversation.id
    } else {
      const created = await this.conversations.create(ctx, {
        channelType: this.channel,
        identifier: clientId,
        customerName: defaultCustomerName(this.channel),
        externalRef,
      })
      conversationId = created.id
      fireDomainEvent({
        type: `${this.domain}.conversation.upserted`,
        data: { domain: this.domain, conversationId, clientId, externalRef },
        aggregateId: conversationId,
        aggregateType: "InboxConversation",
        tenantId: ctx.storeId,
        actorId: ctx.userId,
        source: "meta.ingestion-service",
      })
    }

    try {
      await this.messages.addMessage(ctx, {
        conversationId,
        sender: "customer",
        content: message.text,
        contentType: contentTypeOf(message),
        attachments: message.attachments,
        channel: this.channel,
        recipient: message.recipient,
        senderName: "Cliente",
        externalId,
      })
      fireDomainEvent({
        type: `${this.domain}.message.incoming`,
        data: {
          domain: this.domain,
          conversationId,
          externalId,
          clientId,
          text: message.text.slice(0, 500),
        },
        aggregateId: conversationId,
        aggregateType: "InboxConversation",
        tenantId: ctx.storeId,
        actorId: ctx.userId,
        source: "meta.ingestion-service",
      })
      return "ingested"
    } catch (error: unknown) {
      if (isUniqueViolation(error)) return "skipped"
      throw error
    }
  }

  private async applyStatus(ctx: InboxContext, event: ProviderInboundEvent): Promise<void> {
    const update = event.statusUpdate as ProviderStatusUpdate
    if (update.type === "read") {
      await this.applyConversationRead(ctx, event)
      return
    }
    const status = STATUS_BY_UPDATE[update.type]
    if (!status) return
    const result = await this.db.inboxMessage.updateMany({
      where: { storeId: ctx.storeId, externalId: update.externalMessageId },
      data: { status },
    })
    if (result.count > 0) {
      fireDomainEvent({
        type: `${this.domain}.message.${update.type}`,
        data: {
          domain: this.domain,
          externalId: update.externalMessageId,
          error: update.error ?? null,
        },
        aggregateId: update.externalMessageId,
        aggregateType: "InboxMessage",
        tenantId: ctx.storeId,
        actorId: ctx.userId,
        source: "meta.ingestion-service",
      })
    }
  }

  /** Meta messaging lee por watermark: marca como leídos los entregados previos. */
  private async applyConversationRead(ctx: InboxContext, event: ProviderInboundEvent): Promise<void> {
    const clientId = event.conversationId
    if (!clientId) return
    const externalRef = `${this.prefix}:${clientId}`
    const conversation = await this.db.inboxConversation.findFirst({
      where: { storeId: ctx.storeId, externalRef, channel: { type: this.channel } },
      select: { id: true },
    })
    if (!conversation) return
    const result = await this.db.inboxMessage.updateMany({
      where: {
        storeId: ctx.storeId,
        conversationId: conversation.id,
        status: { in: ["sent", "delivered"] },
      },
      data: { status: "read" },
    })
    if (result.count > 0) {
      fireDomainEvent({
        type: `${this.domain}.message.read`,
        data: { domain: this.domain, conversationId: conversation.id, count: result.count },
        aggregateId: conversation.id,
        aggregateType: "InboxConversation",
        tenantId: ctx.storeId,
        actorId: ctx.userId,
        source: "meta.ingestion-service",
      })
    }
  }
}
