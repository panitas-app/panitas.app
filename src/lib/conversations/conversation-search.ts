/**
 * Conversation Search (FASE 5C).
 *
 * Búsqueda de conversaciones por título, contenido o fecha. Delega en el
 * `ConversationStorage` (que aplica aislamiento por tenant). Devuelve DTOs
 * ligeros con snippet de coincidencia.
 */
import type { StoreServiceContext } from "@/services/context"
import type { ConversationListItem } from "./conversation-types"
import { ConversationStorage } from "./conversation-storage"

export interface ConversationSearchOptions {
  skip?: number
  take?: number
  status?: string
  /** Buscar solo conversaciones actualizadas desde esta fecha (ISO). */
  updatedAfter?: string
  /** Buscar solo conversaciones actualizadas hasta esta fecha (ISO). */
  updatedBefore?: string
}

export class ConversationSearch {
  constructor(private readonly storage: ConversationStorage = new ConversationStorage()) {}

  /** Busca por título o contenido (fragmento del mensaje). */
  async search(ctx: StoreServiceContext, query: string, options: ConversationSearchOptions = {}): Promise<ConversationListItem[]> {
    if (!query || !query.trim()) return this.list(ctx, options)
    const { conversations } = await this.storage.search(ctx, query.trim(), {
      skip: options.skip,
      take: options.take,
      status: options.status,
      updatedAfter: options.updatedAfter ? new Date(options.updatedAfter) : undefined,
      updatedBefore: options.updatedBefore ? new Date(options.updatedBefore) : undefined,
    })
    return conversations
  }

  /** Lista conversaciones recientes (equivalente a buscar sin término). */
  async list(ctx: StoreServiceContext, options: ConversationSearchOptions = {}): Promise<ConversationListItem[]> {
    if (options.updatedAfter || options.updatedBefore) {
      const { conversations } = await this.storage.search(ctx, "", {
        skip: options.skip,
        take: options.take,
        status: options.status,
        updatedAfter: options.updatedAfter ? new Date(options.updatedAfter) : undefined,
        updatedBefore: options.updatedBefore ? new Date(options.updatedBefore) : undefined,
      })
      return conversations
    }
    const { conversations } = await this.storage.list(ctx, {
      skip: options.skip,
      take: options.take,
      status: options.status,
    })
    return conversations
  }
}
