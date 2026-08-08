import { ConversationRepository, type ConversationScope } from "@/repositories/conversation.repository"
import { eventService } from "@/events/event.service"
import { fireDomainEvent } from "@/lib/events"
import { serviceError } from "@/services/errors"
import type { StoreServiceContext } from "@/services/context"
import type { Message, MessageRole, ResolvedToolCall } from "@/lib/agent-core/types"
import type { ConversationContextState, ConversationListItem, ConversationSummaryState } from "@/lib/conversations/conversation-types"
import { createAuditEntry } from "@/lib/audit"

export type SaveMessageInput = {
  role: MessageRole
  content: string
  toolCalls?: ResolvedToolCall[]
  metadata?: Record<string, unknown>
}

export type ConversationDTO = {
  id: string
  title: string
  status: string
  createdAt: string
  updatedAt: string
  messageCount: number
}

type PrismaConversationMessage = {
  id: string
  role: string
  content: string
  toolCalls: string | null
  metadata: string | null
  createdAt: Date
  conversationId: string
}

type PrismaConversation = {
  id: string
  title: string
  status: string
  createdAt: Date
  updatedAt: Date
  messages?: PrismaConversationMessage[]
  _count?: { messages: number }
}

export class ConversationService {
  constructor(private readonly repo = new ConversationRepository()) {}

  private scope(ctx: StoreServiceContext): ConversationScope {
    return { userId: ctx.userId, storeId: ctx.storeId }
  }

  private toMessage(m: PrismaConversationMessage): Message {
    return {
      id: m.id,
      role: m.role as MessageRole,
      content: m.content,
      timestamp: m.createdAt.toISOString(),
      toolCalls: m.toolCalls ? ConversationService.parseToolCalls(m.toolCalls) : undefined,
    }
  }

  private toDTO(c: PrismaConversation): ConversationDTO {
    return {
      id: c.id,
      title: c.title,
      status: c.status,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
      messageCount: c._count ? c._count.messages : c.messages?.length ?? 0,
    }
  }

  static parseToolCalls(raw: string): ResolvedToolCall[] {
    try {
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? (parsed as ResolvedToolCall[]) : []
    } catch {
      return []
    }
  }

  async createConversation(ctx: StoreServiceContext, input: { title?: string } = {}) {
    const conversation = await this.repo.create({
      userId: ctx.userId,
      storeId: ctx.storeId,
      negocioId: ctx.negocioId ?? null,
      title: input.title || "Nueva conversación",
    })

    eventService.emit("conversation.created", {
      conversationId: conversation.id,
      storeId: ctx.storeId,
      userId: ctx.userId,
    })
    fireDomainEvent({
      type: "conversation.started",
      data: { conversationId: conversation.id, title: conversation.title },
      aggregateId: conversation.id,
      aggregateType: "Conversation",
      tenantId: ctx.storeId,
      actorId: ctx.userId,
      source: "conversation.service",
    })
    createAuditEntry({
      action: "conversation.created",
      entity: "Conversation",
      entityId: conversation.id,
      userId: ctx.userId,
      storeId: ctx.storeId,
    }).catch(() => undefined)

    return this.toDTO({ ...conversation, messages: [] })
  }

  /** Devuelve la conversación si pertenece al usuario; en caso contrario, error 404. */
  async getConversation(ctx: StoreServiceContext, id: string): Promise<ConversationDTO> {
    const conversation = await this.repo.findById(id, this.scope(ctx))
    if (!conversation) throw serviceError("Conversación no encontrada", 404)
    return this.toDTO(conversation)
  }

  /** Si `conversationId` viene y pertenece al usuario, lo reutiliza; si no, crea uno nuevo. */
  async ensureConversation(ctx: StoreServiceContext, conversationId?: string): Promise<ConversationDTO> {
    if (conversationId) {
      return this.getConversation(ctx, conversationId)
    }
    return this.createConversation(ctx)
  }

  async list(ctx: StoreServiceContext, opts: { skip?: number; take?: number; status?: string }) {
    const { conversations, total } = await this.repo.listByUser(this.scope(ctx), {
      skip: opts.skip,
      take: opts.take,
      status: opts.status,
    })
    return { conversations: conversations.map((c) => this.toDTO(c)), total }
  }

  async getHistory(ctx: StoreServiceContext, id: string, opts: { limit?: number } = {}) {
    const conversation = await this.repo.findById(id, this.scope(ctx))
    if (!conversation) throw serviceError("Conversación no encontrada", 404)
    const messages = await this.repo.listMessages(id, this.scope(ctx), { take: opts.limit })
    return {
      conversation: this.toDTO(conversation),
      messages: messages.map((m) => this.toMessage(m)),
    }
  }

  async saveMessage(ctx: StoreServiceContext, conversationId: string, input: SaveMessageInput) {
    const conversation = await this.repo.findById(conversationId, this.scope(ctx))
    if (!conversation) throw serviceError("Conversación no encontrada", 404)

    const message = await this.repo.saveMessage({
      conversationId,
      role: input.role,
      content: input.content,
      toolCalls: input.toolCalls && input.toolCalls.length > 0 ? JSON.stringify(input.toolCalls) : null,
      metadata: input.metadata ? JSON.stringify(input.metadata) : null,
    })
    await this.repo.touch(conversationId, this.scope(ctx))

    eventService.emit("message.created", {
      conversationId,
      storeId: ctx.storeId,
      role: input.role,
    })

    fireDomainEvent({
      type: "conversation.message.created",
      data: { conversationId, role: input.role, content: input.content.slice(0, 500) },
      aggregateId: conversationId,
      aggregateType: "Conversation",
      tenantId: ctx.storeId,
      actorId: ctx.userId,
      source: "conversation.service",
    })

    return this.toMessage(message)
  }

  async deleteConversation(ctx: StoreServiceContext, id: string) {
    const result = await this.repo.delete(id, this.scope(ctx))
    if (result.count === 0) throw serviceError("Conversación no encontrada", 404)

    eventService.emit("conversation.deleted", {
      conversationId: id,
      storeId: ctx.storeId,
      userId: ctx.userId,
    })
    fireDomainEvent({
      type: "conversation.deleted",
      data: { conversationId: id },
      aggregateId: id,
      aggregateType: "Conversation",
      tenantId: ctx.storeId,
      actorId: ctx.userId,
      source: "conversation.service",
    })
    createAuditEntry({
      action: "conversation.deleted",
      entity: "Conversation",
      entityId: id,
      userId: ctx.userId,
      storeId: ctx.storeId,
    }).catch(() => undefined)

    return { deleted: true }
  }

  // ── FASE 5C: renombrar, estado de contexto/resumen y búsqueda ──────────────

  /** Renombra la conversación (solo si pertenece al scope). */
  async rename(ctx: StoreServiceContext, id: string, title: string): Promise<ConversationDTO> {
    const clean = title.trim().slice(0, 60)
    if (!clean) throw serviceError("El título no puede estar vacío", 400)

    const result = await this.repo.update(id, this.scope(ctx), { title: clean })
    if (result.count === 0) throw serviceError("Conversación no encontrada", 404)

    createAuditEntry({
      action: "conversation.renamed",
      entity: "Conversation",
      entityId: id,
      userId: ctx.userId,
      storeId: ctx.storeId,
    }).catch(() => undefined)

    return this.getConversation(ctx, id)
  }

  /** Lee el estado del contexto de la conversación (JSON deserializado). */
  async readContext(ctx: StoreServiceContext, id: string): Promise<ConversationContextState | null> {
    const meta = await this.repo.findMetaById(id, this.scope(ctx))
    if (!meta) throw serviceError("Conversación no encontrada", 404)
    if (!meta.contextState) return null
    try {
      return JSON.parse(meta.contextState) as ConversationContextState
    } catch {
      return null
    }
  }

  /** Persiste el estado del contexto de la conversación. */
  async writeContext(ctx: StoreServiceContext, id: string, state: ConversationContextState): Promise<void> {
    const result = await this.repo.update(id, this.scope(ctx), { contextState: JSON.stringify(state) })
    if (result.count === 0) throw serviceError("Conversación no encontrada", 404)
  }

  /** Lee el resumen estructurado de la conversación (JSON deserializado). */
  async readSummary(ctx: StoreServiceContext, id: string): Promise<ConversationSummaryState | null> {
    const meta = await this.repo.findMetaById(id, this.scope(ctx))
    if (!meta) throw serviceError("Conversación no encontrada", 404)
    if (!meta.summary) return null
    try {
      return JSON.parse(meta.summary) as ConversationSummaryState
    } catch {
      return null
    }
  }

  /** Persiste el resumen estructurado de la conversación. */
  async writeSummary(ctx: StoreServiceContext, id: string, state: ConversationSummaryState): Promise<void> {
    const result = await this.repo.update(id, this.scope(ctx), { summary: JSON.stringify(state) })
    if (result.count === 0) throw serviceError("Conversación no encontrada", 404)
  }

  /** Busca conversaciones del usuario por título o contenido. */
  async search(
    ctx: StoreServiceContext,
    query: string,
    opts: { skip?: number; take?: number; status?: string; updatedAfter?: Date; updatedBefore?: Date } = {},
  ): Promise<{ conversations: ConversationListItem[]; total: number }> {
    const { conversations, total } = await this.repo.search(this.scope(ctx), query, {
      skip: opts.skip,
      take: opts.take,
      status: opts.status,
      updatedAfter: opts.updatedAfter,
      updatedBefore: opts.updatedBefore,
    })
    return {
      conversations: conversations.map((c) => {
        const dto = this.toDTO(c)
        const firstUser = c.messages?.[0]?.content
        return {
          ...dto,
          snippet: firstUser ? (firstUser.length > 120 ? `${firstUser.slice(0, 117)}…` : firstUser) : undefined,
        }
      }),
      total,
    }
  }
}
