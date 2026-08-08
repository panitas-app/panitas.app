/**
 * Conversational AI Copilot (FASE 7B) — Contexto del cliente.
 *
 * Panel lateral del copiloto: información básica, historial de compras,
 * productos favoritos, créditos activos, saldo pendiente, última compra,
 * última conversación y notas. Reutiliza el servicio de contexto del inbox
 * (FASE 7A) y lo enriquece con pedidos pendientes y deuda total. Incluye la
 * búsqueda de productos del inventario para anclar respuestas en datos reales.
 */
import type { PrismaClient } from "@prisma/client"
import { prisma as defaultPrisma } from "@/lib/prisma"
import { InboxConversationContextService } from "@/lib/inbox"
import type { InboxContext } from "@/lib/inbox/conversation-types"
import type {
  CopilotCustomerContext,
  CopilotProductHit,
} from "./conversation-types"

const TERMINAL_ORDER_STATUSES = new Set(["delivered", "cancelled", "refunded"])

/** Enriquecimiento puro (testeable) del contexto del inbox → contexto copiloto. */
export function enrichContext(
  inbox: Awaited<ReturnType<InboxConversationContextService["build"]>>,
): CopilotCustomerContext {
  const pendingOrders = inbox.orders.filter((o) => !TERMINAL_ORDER_STATUSES.has(o.status))
  const lastConversation = inbox.recentInteractions[0]?.summary ?? null
  return {
    ...inbox,
    pendingOrders,
    totalDebt: inbox.credits.pendingAmount + inbox.credits.overdueAmount,
    lastConversation,
  }
}

export interface CopilotCustomerContextServiceOptions {
  db?: PrismaClient
}

export class CopilotCustomerContextService {
  private readonly contextService: InboxConversationContextService

  constructor(private readonly db: PrismaClient = defaultPrisma) {
    this.contextService = new InboxConversationContextService(db)
  }

  /** Contexto completo del cliente asociado a la conversación. */
  async build(ctx: InboxContext, conversationId: string): Promise<CopilotCustomerContext> {
    const inbox = await this.contextService.build(ctx, conversationId)
    return enrichContext(inbox)
  }

  /** Busca productos reales del inventario por nombre (para sugerencias y consultas). */
  async findProducts(ctx: InboxContext, query: string, limit = 5): Promise<CopilotProductHit[]> {
    const q = query.trim()
    if (!q) return []
    const rows = await this.db.product.findMany({
      where: {
        storeId: ctx.storeId,
        isActive: true,
        OR: [{ name: { contains: q, mode: "insensitive" } }, { description: { contains: q, mode: "insensitive" } }],
      },
      include: { category: { select: { name: true } } },
      orderBy: { stock: "desc" },
      take: limit,
    })
    return rows.map((p) => ({
      productId: p.id,
      name: p.name,
      price: p.price,
      stock: p.stock,
      sku: p.sku,
      categoryName: p.category?.name ?? null,
    }))
  }
}
