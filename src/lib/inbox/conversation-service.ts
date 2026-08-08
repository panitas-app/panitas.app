/**
 * Omnichannel Inbox — Servicio de conversaciones (FASE 7A).
 *
 * Ciclo de vida de las conversaciones del Centro Unificado: listado con
 * filtros (canal, estado, etiqueta, búsqueda), creación multi-canal,
 * asociación con CRM, estados, prioridad, asignación, etiquetas y notas.
 * Cada mutación emite eventos de negocio (`data.domain === "inbox"`) y
 * registra auditoría.
 */
import { prisma as defaultPrisma } from "@/lib/prisma"
import { createAuditEntry } from "@/lib/audit"
import { fireDomainEvent } from "@/lib/events"
import type { PrismaClient, Prisma } from "@prisma/client"
import { serviceError } from "@/services/errors"
import { InboxChannelManager } from "./channel-manager"
import { InboxMessageService } from "./message-service"
import {
  INBOX_STATUSES,
  INBOX_TAG_COLORS,
  INBOX_TAGS,
  type InboxChannelType,
  type InboxContext,
  type InboxConversationDetail,
  type InboxConversationSummary,
  type InboxCreateInput,
  type InboxCustomerSummary,
  type InboxListOptions,
  type InboxNoteDTO,
  type InboxParticipantDTO,
  type InboxPriority,
  type InboxStatus,
  type InboxTagDTO,
  type InboxUpdateInput,
} from "./conversation-types"

const LIST_INCLUDE = {
  channel: true,
  customer: true,
  assignedTo: true,
  messages: { orderBy: { createdAt: "desc" as const }, take: 1 },
  tags: { include: { tag: true } },
  _count: { select: { messages: true } },
} satisfies Prisma.InboxConversationInclude

type ListRow = Prisma.InboxConversationGetPayload<{ include: typeof LIST_INCLUDE }>

const DETAIL_INCLUDE = {
  channel: true,
  customer: true,
  assignedTo: true,
  messages: { orderBy: { createdAt: "asc" as const } },
  participants: { orderBy: { createdAt: "asc" as const } },
  notes: { orderBy: { createdAt: "desc" as const } },
  tags: { include: { tag: true } },
  _count: { select: { messages: true } },
} satisfies Prisma.InboxConversationInclude

type DetailRow = Prisma.InboxConversationGetPayload<{ include: typeof DETAIL_INCLUDE }>

const VALID_STATUSES = new Set<string>(INBOX_STATUSES)
const VALID_PRIORITIES = new Set<string>(["baja", "normal", "alta", "urgente"])

function toCustomer(customer: DetailRow["customer"]): InboxCustomerSummary | null {
  if (!customer) return null
  return {
    id: customer.id,
    name: customer.name,
    phone: customer.phone,
    email: customer.email,
  }
}

function toTags(row: { tags: Array<{ tag: { name: string } }> }): string[] {
  return row.tags.map((t) => t.tag.name).sort()
}

function toSummary(row: ListRow): InboxConversationSummary {
  const last = row.messages[0]
  const type = row.channel.type as InboxChannelType
  return {
    id: row.id,
    title: row.title || (row.customer?.name ?? "Conversación"),
    channelType: type,
    channelName: row.channel.name,
    status: row.status as InboxStatus,
    priority: row.priority as InboxPriority,
    unreadCount: row.unreadCount,
    isPinned: row.isPinned,
    customer: toCustomer(row.customer),
    assignedTo: row.assignedTo
      ? { id: row.assignedTo.id, name: row.assignedTo.name, email: row.assignedTo.email }
      : null,
    tags: toTags(row),
    lastMessage: last ? last.content.slice(0, 120) : "",
    lastMessageAt: row.lastMessageAt?.toISOString() ?? null,
    messageCount: row._count.messages,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

export class InboxConversationService {
  private readonly channels: InboxChannelManager
  private readonly messages: InboxMessageService

  constructor(
    private readonly db: PrismaClient = defaultPrisma,
    messages?: InboxMessageService,
  ) {
    this.channels = new InboxChannelManager(db)
    this.messages = messages ?? new InboxMessageService(db)
  }

  private emit(
    ctx: InboxContext,
    type: string,
    conversationId: string,
    data: Record<string, unknown> = {},
  ): void {
    fireDomainEvent({
      type,
      data: { domain: "inbox", conversationId, ...data },
      aggregateId: conversationId,
      aggregateType: "InboxConversation",
      tenantId: ctx.storeId,
      actorId: ctx.userId,
      source: "inbox.conversation-service",
    })
  }

  private audit(
    ctx: InboxContext,
    action: string,
    conversationId: string,
    metadata?: Record<string, unknown>,
  ): void {
    void createAuditEntry({
      action,
      entity: "InboxConversation",
      entityId: conversationId,
      metadata,
      userId: ctx.userId,
      storeId: ctx.storeId,
    })
  }

  async list(ctx: InboxContext, options: InboxListOptions = {}): Promise<{
    conversations: InboxConversationSummary[]
    total: number
  }> {
    const { status = "all", channel = "all", tag, search, assigned, limit = 100 } = options
    const where: Prisma.InboxConversationWhereInput = { storeId: ctx.storeId }

    if (status !== "all" && VALID_STATUSES.has(status)) where.status = status
    if (channel !== "all") where.channel = { type: channel }
    if (tag) where.tags = { some: { tag: { name: tag, storeId: ctx.storeId } } }
    if (assigned) where.assignedToId = assigned
    if (search && search.trim()) {
      const q = search.trim()
      where.OR = [
        { title: { contains: q, mode: "insensitive" } },
        { customer: { name: { contains: q, mode: "insensitive" } } },
        { customer: { phone: { contains: q } } },
      ]
    }

    const [rows, total] = await Promise.all([
      this.db.inboxConversation.findMany({
        where,
        include: LIST_INCLUDE,
        orderBy: [{ isPinned: "desc" }, { updatedAt: "desc" }],
        take: limit,
      }),
      this.db.inboxConversation.count({ where }),
    ])

    return { conversations: rows.map(toSummary), total }
  }

  async get(ctx: InboxContext, conversationId: string): Promise<InboxConversationDetail> {
    const row = await this.loadDetail(ctx, conversationId)
    const messages = row.messages.map((m) => this.messages.toDTO(m))
    const participants: InboxParticipantDTO[] = row.participants.map((p) => ({
      id: p.id,
      conversationId: p.conversationId,
      role: p.role,
      name: p.name,
      identifier: p.identifier,
      channel: p.channel,
      userId: p.userId,
    }))
    const notes: InboxNoteDTO[] = row.notes.map((n) => ({
      id: n.id,
      conversationId: n.conversationId,
      content: n.content,
      createdBy: n.createdBy,
      createdAt: n.createdAt.toISOString(),
    }))

    const last = row.messages[row.messages.length - 1]
    return {
      ...toSummary(row as unknown as ListRow),
      messages,
      participants,
      notes,
      externalRef: row.externalRef,
      lastMessage: last ? last.content.slice(0, 120) : "",
      lastMessageAt: row.lastMessageAt?.toISOString() ?? null,
      messageCount: row._count.messages,
    }
  }

  async create(ctx: InboxContext, input: InboxCreateInput): Promise<InboxConversationDetail> {
    if (!input.channelType) {
      throw new Error("El canal es obligatorio")
    }
    const channel = await this.channels.ensureChannel(ctx, input.channelType)

    const customerId = await this.resolveCustomer(ctx, input)

    const conversation = await this.db.inboxConversation.create({
      data: {
        storeId: ctx.storeId,
        channelId: channel.id,
        title: input.title ?? input.customerName ?? "Nueva conversación",
        status: "nueva",
        priority: "normal",
        customerId,
        externalRef: input.externalRef ?? null,
      },
    })

    await this.db.inboxParticipant.create({
      data: {
        storeId: ctx.storeId,
        conversationId: conversation.id,
        role: "customer",
        name: input.customerName ?? input.customerPhone ?? "Cliente",
        identifier: input.identifier ?? input.customerPhone ?? "",
        channel: input.channelType,
        userId: null,
      },
    })

    await this.ensureDefaultTags(ctx)

    this.emit(ctx, "conversation.created", conversation.id, {
      channelType: input.channelType,
      customerId,
    })
    this.audit(ctx, "inbox.conversation.created", conversation.id, { channelType: input.channelType })

    if (input.initialMessage && input.initialMessage.trim()) {
      await this.messages.addMessage(ctx, {
        conversationId: conversation.id,
        sender: "customer",
        senderName: input.customerName ?? "Cliente",
        recipient: input.identifier ?? input.customerPhone ?? "",
        channel: input.channelType,
        content: input.initialMessage.trim(),
      })
    }

    return this.get(ctx, conversation.id)
  }

  async updateStatus(ctx: InboxContext, conversationId: string, status: InboxStatus): Promise<void> {
    if (!VALID_STATUSES.has(status)) throw serviceError("Estado inválido: ${status}")
    const current = await this.loadDetail(ctx, conversationId)
    if (current.status === status) return

    await this.db.inboxConversation.update({
      where: { id: conversationId },
      data: { status },
    })
    this.emit(ctx, "conversation.updated", conversationId, { status })
    if (status === "resuelta") {
      this.emit(ctx, "conversation.completed", conversationId, { status })
    }
    this.audit(ctx, "inbox.conversation.status_changed", conversationId, { status })
  }

  async update(
    ctx: InboxContext,
    conversationId: string,
    patch: InboxUpdateInput,
  ): Promise<InboxConversationDetail> {
    const current = await this.loadDetail(ctx, conversationId)
    const data: Prisma.InboxConversationUpdateInput = {}
    if (patch.status !== undefined) {
      if (!VALID_STATUSES.has(patch.status)) throw serviceError("Estado inválido: ${patch.status}")
      data.status = patch.status
    }
    if (patch.priority !== undefined) {
      if (!VALID_PRIORITIES.has(patch.priority)) throw serviceError("Prioridad inválida: ${patch.priority}")
      data.priority = patch.priority
    }
    if (patch.isPinned !== undefined) data.isPinned = patch.isPinned
    if (patch.title !== undefined && patch.title.trim()) data.title = patch.title.trim()

    if (Object.keys(data).length === 0) return this.get(ctx, conversationId)

    await this.db.inboxConversation.update({ where: { id: conversationId }, data })

    if (patch.status === "resuelta" && current.status !== "resuelta") {
      this.emit(ctx, "conversation.completed", conversationId, { status: patch.status })
    } else {
      this.emit(ctx, "conversation.updated", conversationId, {
        status: patch.status,
        priority: patch.priority,
        isPinned: patch.isPinned,
      })
    }
    this.audit(ctx, "inbox.conversation.updated", conversationId, {
      status: patch.status,
      priority: patch.priority,
      isPinned: patch.isPinned,
    })

    return this.get(ctx, conversationId)
  }

  async assign(ctx: InboxContext, conversationId: string, assignedToId: string | null): Promise<void> {
    await this.loadDetail(ctx, conversationId)
    await this.db.inboxConversation.update({
      where: { id: conversationId },
      data: { assignedToId },
    })
    this.emit(ctx, "conversation.assigned", conversationId, { assignedToId })
    this.audit(ctx, "inbox.conversation.assigned", conversationId, { assignedToId })
  }

  async complete(ctx: InboxContext, conversationId: string): Promise<void> {
    await this.updateStatus(ctx, conversationId, "resuelta")
  }

  async setCustomer(ctx: InboxContext, conversationId: string, customerId: string): Promise<void> {
    await this.loadDetail(ctx, conversationId)
    const customer = await this.db.customer.findUnique({ where: { id: customerId } })
    if (!customer || customer.storeId !== ctx.storeId) {
      throw serviceError("Cliente no encontrado", 404)
    }
    await this.db.inboxConversation.update({
      where: { id: conversationId },
      data: { customerId },
    })
    await this.db.inboxParticipant.updateMany({
      where: { conversationId, role: "customer" },
      data: { name: customer.name, identifier: customer.phone },
    })
    this.emit(ctx, "conversation.updated", conversationId, { customerId })
  }

  async addTag(ctx: InboxContext, conversationId: string, tagName: string): Promise<void> {
    await this.loadDetail(ctx, conversationId)
    const name = tagName.trim().toLowerCase()
    if (!name) throw new Error("Etiqueta vacía")
    const tag = await this.db.inboxTag.upsert({
      where: { storeId_name: { storeId: ctx.storeId, name } },
      create: { storeId: ctx.storeId, name, color: INBOX_TAG_COLORS[name] ?? "#94a3b8" },
      update: {},
    })
    await this.db.inboxConversationTag.upsert({
      where: { conversationId_tagId: { conversationId, tagId: tag.id } },
      create: { conversationId, tagId: tag.id },
      update: {},
    })
    this.emit(ctx, "conversation.tagged", conversationId, { tag: name })
    this.audit(ctx, "inbox.conversation.tagged", conversationId, { tag: name })
  }

  async removeTag(ctx: InboxContext, conversationId: string, tagId: string): Promise<void> {
    await this.loadDetail(ctx, conversationId)
    await this.db.inboxConversationTag.deleteMany({
      where: { conversationId, tagId, conversation: { storeId: ctx.storeId } },
    })
    this.emit(ctx, "conversation.updated", conversationId, { tagRemoved: tagId })
    this.audit(ctx, "inbox.conversation.tag_removed", conversationId, { tagId })
  }

  async addNote(ctx: InboxContext, conversationId: string, content: string): Promise<InboxNoteDTO> {
    await this.loadDetail(ctx, conversationId)
    if (!content.trim()) throw new Error("La nota está vacía")
    const note = await this.db.inboxNote.create({
      data: {
        storeId: ctx.storeId,
        conversationId,
        content: content.trim().slice(0, 2000),
        createdBy: ctx.userId ?? null,
      },
    })
    this.audit(ctx, "inbox.conversation.note_added", conversationId, { content: content.trim().slice(0, 200) })
    return {
      id: note.id,
      conversationId: note.conversationId,
      content: note.content,
      createdBy: note.createdBy,
      createdAt: note.createdAt.toISOString(),
    }
  }

  async listTags(ctx: InboxContext): Promise<InboxTagDTO[]> {
    await this.ensureDefaultTags(ctx)
    const rows = await this.db.inboxTag.findMany({
      where: { storeId: ctx.storeId },
      orderBy: [{ name: "asc" }],
    })
    return rows.map((t) => ({ id: t.id, name: t.name, color: t.color }))
  }

  private async ensureDefaultTags(ctx: InboxContext): Promise<void> {
    const existing = await this.db.inboxTag.findMany({
      where: { storeId: ctx.storeId },
      select: { name: true },
    })
    const present = new Set(existing.map((t) => t.name))
    const missing = INBOX_TAGS.filter((name) => !present.has(name))
    if (missing.length === 0) return
    await this.db.inboxTag.createMany({
      data: missing.map((name) => ({
        storeId: ctx.storeId,
        name,
        color: INBOX_TAG_COLORS[name] ?? "#94a3b8",
      })),
      skipDuplicates: true,
    })
  }

  private async resolveCustomer(ctx: InboxContext, input: InboxCreateInput): Promise<string | null> {
    if (input.customerId) {
      const customer = await this.db.customer.findUnique({ where: { id: input.customerId } })
      if (!customer || customer.storeId !== ctx.storeId) throw serviceError("Cliente no encontrado", 404)
      return customer.id
    }
    const phone = input.customerPhone?.trim()
    if (phone) {
      const existing = await this.db.customer.findUnique({
        where: { storeId_phone: { storeId: ctx.storeId, phone } },
      })
      if (existing) return existing.id
      return this.db.customer
        .create({
          data: {
            storeId: ctx.storeId,
            name: input.customerName?.trim() || "Cliente del chat",
            phone,
            email: input.customerEmail?.trim() || null,
          },
        })
        .then((c) => c.id)
    }
    return null
  }

  private async loadDetail(ctx: InboxContext, conversationId: string): Promise<DetailRow> {
    const row = await this.db.inboxConversation.findUnique({
      where: { id: conversationId },
      include: DETAIL_INCLUDE,
    })
    if (!row || row.storeId !== ctx.storeId) {
      throw new Error("Conversación no encontrada")
    }
    return row
  }
}
