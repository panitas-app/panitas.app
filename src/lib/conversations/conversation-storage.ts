/**
 * Conversation Storage (FASE 5C).
 *
 * Único punto de persistencia del layer de memoria conversacional. Delega en
 * `ConversationService` (que a su vez aplica el aislamiento por tenant en BD).
 * El resto de módulos de `conversations/*` NO conocen Prisma ni servicios.
 */
import { ConversationService, type SaveMessageInput } from "@/services/conversation.service"
import type { StoreServiceContext } from "@/services/context"
import type { Message } from "@/lib/agent-core/types"
import type { ConversationContextState, ConversationListItem, ConversationSummaryState } from "./conversation-types"

export type StorageMessage = Message

export class ConversationStorage {
  constructor(private readonly service: ConversationService = new ConversationService()) {}

  ensureConversation(ctx: StoreServiceContext, conversationId?: string) {
    return this.service.ensureConversation(ctx, conversationId)
  }

  getConversation(ctx: StoreServiceContext, id: string) {
    return this.service.getConversation(ctx, id)
  }

  list(ctx: StoreServiceContext, opts: { skip?: number; take?: number; status?: string } = {}) {
    return this.service.list(ctx, opts)
  }

  getHistory(ctx: StoreServiceContext, id: string, opts: { limit?: number } = {}) {
    return this.service.getHistory(ctx, id, opts)
  }

  saveMessage(ctx: StoreServiceContext, conversationId: string, input: SaveMessageInput) {
    return this.service.saveMessage(ctx, conversationId, input)
  }

  deleteConversation(ctx: StoreServiceContext, id: string) {
    return this.service.deleteConversation(ctx, id)
  }

  rename(ctx: StoreServiceContext, id: string, title: string) {
    return this.service.rename(ctx, id, title)
  }

  async readContext(ctx: StoreServiceContext, id: string): Promise<ConversationContextState | null> {
    return this.service.readContext(ctx, id)
  }

  writeContext(ctx: StoreServiceContext, id: string, state: ConversationContextState) {
    return this.service.writeContext(ctx, id, state)
  }

  async readSummary(ctx: StoreServiceContext, id: string): Promise<ConversationSummaryState | null> {
    return this.service.readSummary(ctx, id)
  }

  writeSummary(ctx: StoreServiceContext, id: string, state: ConversationSummaryState) {
    return this.service.writeSummary(ctx, id, state)
  }

  async search(
    ctx: StoreServiceContext,
    query: string,
    opts: { skip?: number; take?: number; status?: string; updatedAfter?: Date; updatedBefore?: Date } = {},
  ): Promise<{ conversations: ConversationListItem[]; total: number }> {
    return this.service.search(ctx, query, opts)
  }
}
