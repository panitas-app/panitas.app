/**
 * Conversation Session (FASE 5C).
 *
 * Crea y restaura sesiones de conversación independientes. Al reabrir una
 * conversación devuelve historial + contexto + entidad activa + resumen, para
 * que el cliente (y el manager) reanuden sin repetir preguntas.
 *
 * Regla de aislamiento: toda operación pasa por `ConversationStorage`, que
 * fuerza `userId` + `storeId` en BD.
 */
import type { StoreServiceContext } from "@/services/context"
import type { Message } from "@/lib/agent-core/types"
import type { ConversationContextState, ConversationSessionState, ConversationSummaryState } from "./conversation-types"
import { ConversationStorage } from "./conversation-storage"
import { buildInitialSummary } from "./conversation-summary"

export class ConversationSession {
  constructor(private readonly storage: ConversationStorage = new ConversationStorage()) {}

  /** Crea una sesión nueva (conversación vacía sin título). */
  async create(ctx: StoreServiceContext, title?: string): Promise<ConversationSessionState> {
    const dto = await this.storage.ensureConversation(ctx)
    const state = this.toSessionState(dto, [], null, null)
    if (title && title.trim() && dto.title === "Nueva conversación") {
      await this.storage.rename(ctx, dto.id, title.trim())
      return { ...state, title: title.trim() }
    }
    return state
  }

  /** Restaura una sesión completa (historial + contexto + resumen). */
  async restore(ctx: StoreServiceContext, conversationId: string): Promise<ConversationSessionState> {
    const dto = await this.storage.getConversation(ctx, conversationId)
    const { messages } = await this.storage.getHistory(ctx, conversationId)
    const context = await this.storage.readContext(ctx, conversationId)
    const storedSummary = await this.storage.readSummary(ctx, conversationId)
    // Conversaciones creadas antes de FASE 5C: resumen construido bajo demanda.
    const summary = storedSummary ?? buildInitialSummary(messages, new Date().toISOString())
    return this.toSessionState(dto, messages, context, summary)
  }

  async rename(ctx: StoreServiceContext, id: string, title: string) {
    return this.storage.rename(ctx, id, title)
  }

  async delete(ctx: StoreServiceContext, id: string) {
    return this.storage.deleteConversation(ctx, id)
  }

  async list(ctx: StoreServiceContext, opts: { skip?: number; take?: number; status?: string } = {}) {
    return this.storage.list(ctx, opts)
  }

  private toSessionState(
    dto: { id: string; title: string; status: string; createdAt: string; updatedAt: string; messageCount: number },
    messages: Message[],
    context: ConversationContextState | null,
    summary: ConversationSummaryState | null,
  ): ConversationSessionState {
    return {
      conversationId: dto.id,
      title: dto.title,
      status: dto.status,
      context,
      summary,
      messages: messages
        .filter((m) => m.role === "user" || m.role === "assistant")
        .map((m) => ({
          id: m.id,
          role: m.role as "user" | "assistant",
          content: m.content,
          timestamp: m.timestamp,
        })),
      messageCount: dto.messageCount,
      updatedAt: dto.updatedAt,
    }
  }
}
