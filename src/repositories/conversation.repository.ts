import { Prisma, PrismaClient } from "@prisma/client"
import { prisma } from "@/lib/prisma"

/**
 * Conversation Repository (FASE 3C).
 *
 * Único punto de acceso a BD para conversaciones y mensajes. Regla de aislamiento:
 * TODA query lleva el scope del usuario autenticado (userId + storeId) en el `where`,
 * de modo que un usuario jamás lee/escribe conversaciones de otro negocio o de otro usuario.
 */
export type ConversationScope = {
  userId: string
  storeId: string
}

export type ConversationListFilters = {
  skip?: number
  take?: number
  status?: string
  updatedAfter?: Date
  updatedBefore?: Date
}

export class ConversationRepository {
  constructor(private readonly db: PrismaClient = prisma) {}

  findById(id: string, scope: ConversationScope) {
    return this.db.conversation.findFirst({
      where: { id, userId: scope.userId, storeId: scope.storeId },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    })
  }

  /** Metadatos ligeros de una conversación (contexto y resumen serializados). */
  findMetaById(id: string, scope: ConversationScope) {
    return this.db.conversation.findFirst({
      where: { id, userId: scope.userId, storeId: scope.storeId },
      select: { contextState: true, summary: true },
    })
  }

  async listByUser(scope: ConversationScope, filters: ConversationListFilters) {
    const where: Prisma.ConversationWhereInput = {
      userId: scope.userId,
      storeId: scope.storeId,
      ...(filters.status ? { status: filters.status } : {}),
    }
    const [conversations, total] = await Promise.all([
      this.db.conversation.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        skip: filters.skip,
        take: filters.take,
      }),
      this.db.conversation.count({ where }),
    ])
    return { conversations, total }
  }

  create(data: Prisma.ConversationUncheckedCreateInput) {
    return this.db.conversation.create({ data })
  }

  /** Actualiza solo si la conversación pertenece al scope. */
  update(id: string, scope: ConversationScope, data: Prisma.ConversationUpdateManyMutationInput) {
    return this.db.conversation.updateMany({
      where: { id, userId: scope.userId, storeId: scope.storeId },
      data,
    })
  }

  touch(id: string, scope: ConversationScope) {
    return this.update(id, scope, { updatedAt: new Date() })
  }

  /** Mensajes de una conversación, validando la propiedad de la conversación a nivel BD. */
  listMessages(conversationId: string, scope: ConversationScope, filters: { skip?: number; take?: number } = {}) {
    return this.db.conversationMessage.findMany({
      where: {
        conversationId,
        conversation: { userId: scope.userId, storeId: scope.storeId },
      },
      orderBy: { createdAt: "asc" },
      skip: filters.skip,
      take: filters.take,
    })
  }

  saveMessage(data: Prisma.ConversationMessageUncheckedCreateInput) {
    return this.db.conversationMessage.create({ data })
  }

  /** Elimina solo si la conversación pertenece al scope; devuelve el número de filas afectadas. */
  delete(id: string, scope: ConversationScope) {
    return this.db.conversation.deleteMany({
      where: { id, userId: scope.userId, storeId: scope.storeId },
    })
  }

  /**
   * Busca conversaciones del scope por título o contenido de mensajes (FASE 5C).
   * `snippet` = primer mensaje de usuario (para mostrar coincidencia).
   */
  async search(scope: ConversationScope, query: string, filters: ConversationListFilters = {}) {
    const where: Prisma.ConversationWhereInput = {
      userId: scope.userId,
      storeId: scope.storeId,
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.updatedAfter ? { updatedAt: { gte: filters.updatedAfter } } : {}),
      ...(filters.updatedBefore ? { updatedAt: { lte: filters.updatedBefore } } : {}),
      ...(query
        ? {
            OR: [
              { title: { contains: query, mode: "insensitive" } },
              { messages: { some: { content: { contains: query, mode: "insensitive" } } } },
            ],
          }
        : {}),
    }
    const [conversations, total] = await Promise.all([
      this.db.conversation.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        skip: filters.skip,
        take: filters.take,
        include: {
          _count: { select: { messages: true } },
          messages: {
            where: { role: "user" },
            orderBy: { createdAt: "asc" },
            take: 1,
          },
        },
      }),
      this.db.conversation.count({ where }),
    ])
    return { conversations, total }
  }
}
