/**
 * Omnichannel Inbox — Contexto del cliente (FASE 7A).
 *
 * Columna 3 del Centro de Conversaciones: información del CRM, últimas
 * compras, productos favoritos, créditos pendientes, últimas interacciones,
 * notas y recomendaciones de Panitas IA. Las recomendaciones son 100% basadas
 * en datos reales del negocio (nunca inventadas).
 */
import { prisma as defaultPrisma } from "@/lib/prisma"
import { serviceError } from "@/services/errors"
import type { PrismaClient } from "@prisma/client"
import {
  buildInboxRecommendations,
  type InboxContext,
  type InboxCustomerContext,
  type InboxInteractionView,
  type InboxNoteView,
  type InboxOrderView,
  type InboxProductView,
  type RecommendationSeed,
} from "./conversation-types"

export type {
  InboxCreditView,
  InboxCustomerContext,
  InboxInteractionView,
  InboxNoteView,
  InboxOrderView,
  InboxProductView,
  InboxRecommendation,
  RecommendationSeed,
  RecommendationTone,
} from "./conversation-types"
export { buildInboxRecommendations } from "./conversation-types"
export class InboxConversationContextService {
  constructor(private readonly db: PrismaClient = defaultPrisma) {}

  async build(ctx: InboxContext, conversationId: string): Promise<InboxCustomerContext> {
    const conversation = await this.db.inboxConversation.findUnique({
      where: { id: conversationId },
      select: {
        storeId: true,
        status: true,
        customerId: true,
        messages: { orderBy: { createdAt: "desc" as const }, take: 20 },
        notes: { orderBy: { createdAt: "desc" as const }, take: 10 },
      },
    })
    if (!conversation || conversation.storeId !== ctx.storeId) {
      throw new Error("ConversaciÃ³n no encontrada")
    }

    const notes: InboxNoteView[] = conversation.notes.map((n) => ({
      type: "conversation" as const,
      content: n.content,
      createdAt: n.createdAt.toISOString(),
    }))

    if (!conversation.customerId) {
      return {
        customer: null,
        orders: [],
        favoriteProducts: [],
        purchasedProductsCount: 0,
        credits: { activeCredits: 0, pendingAmount: 0, overdueAmount: 0, nextDueDate: null },
        recentInteractions: conversation.messages.slice(0, 5).map((m) => ({
          type: "message" as const,
          channel: m.channel,
          summary: m.content.slice(0, 120),
          createdAt: m.createdAt.toISOString(),
        })),
        notes,
        aiRecommendations: [],
      }
    }

    const [customer, orders, creditOrders, recentMessages, collectionContacts] = await Promise.all([
      this.db.customer.findUnique({
        where: { id: conversation.customerId },
        include: {
          customerNotes: { orderBy: { createdAt: "desc" as const }, take: 5 },
          tags: { include: { tag: true } },
        },
      }),
      this.db.order.findMany({
        where: { storeId: ctx.storeId, customerId: conversation.customerId, status: { not: "cancelled" } },
        orderBy: { createdAt: "desc" as const },
        take: 5,
        include: { items: { select: { productName: true, productId: true, quantity: true } } },
      }),
      this.db.order.findMany({
        where: { storeId: ctx.storeId, customerId: conversation.customerId, creditStatus: "active" },
        select: { id: true },
      }),
      this.db.inboxMessage.findMany({
        where: { storeId: ctx.storeId, conversation: { customerId: conversation.customerId } },
        orderBy: { createdAt: "desc" as const },
        take: 5,
      }),
      this.db.collectionContactLog.findMany({
        where: { storeId: ctx.storeId, customerId: conversation.customerId },
        orderBy: { createdAt: "desc" as const },
        take: 5,
      }),
    ])

    if (!customer) {
      throw serviceError("Cliente no encontrado", 404)
    }

    const orderViews: InboxOrderView[] = orders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      total: o.total,
      status: o.status,
      createdAt: o.createdAt.toISOString(),
      items: o.items.map((i) => ({ productName: i.productName ?? "", quantity: i.quantity })),
    }))

    const productMap = new Map<string, InboxProductView>()
    for (const order of orders) {
      for (const item of order.items) {
        const key = item.productId ?? item.productName ?? "unknown"
        const current = productMap.get(key)
        if (current) {
          current.quantity += item.quantity
        } else {
          productMap.set(key, {
            productId: item.productId,
            productName: item.productName ?? "Producto",
            quantity: item.quantity,
          })
        }
      }
    }
    const favoriteProducts = [...productMap.values()].sort((a, b) => b.quantity - a.quantity).slice(0, 5)

    const installments = await this.db.installment.findMany({
      where: { order: { storeId: ctx.storeId, customerId: conversation.customerId, creditStatus: "active" } },
      select: { amount: true, paidAmount: true, dueDate: true, status: true },
    })

    let pendingAmount = 0
    let overdueAmount = 0
    let nextDue: Date | null = null
    for (const inst of installments) {
      if (inst.status === "paid") continue
      const remaining = inst.amount - (inst.paidAmount ?? 0)
      if (remaining <= 0) continue
      pendingAmount += remaining
      if (inst.dueDate.getTime() < Date.now()) {
        overdueAmount += remaining
      } else if (!nextDue || inst.dueDate < nextDue) {
        nextDue = inst.dueDate
      }
    }

    const recentInteractions: InboxInteractionView[] = [
      ...recentMessages.map((m) => ({
        type: "message" as const,
        channel: m.channel,
        summary: m.content.slice(0, 120),
        createdAt: m.createdAt.toISOString(),
      })),
      ...collectionContacts.map((c) => ({
        type: "collection" as const,
        channel: c.channel,
        summary: c.message?.slice(0, 120) ?? `Contacto de cobranza (${c.category ?? "aviso"})`,
        createdAt: c.createdAt.toISOString(),
      })),
    ].sort((a, b) => b.createdAt.localeCompare(a.createdAt))

    const customerNotes: InboxNoteView[] = customer.customerNotes.map((n) => ({
      type: "customer" as const,
      content: n.content,
      createdAt: n.createdAt.toISOString(),
    }))

    const lastMessage = recentMessages[0]
    const seed: RecommendationSeed = {
      customerName: customer.name,
      lastPurchaseAt: customer.lastPurchaseAt?.toISOString() ?? null,
      totalSpent: customer.totalSpent,
      totalOrders: customer.totalOrders,
      activeCredits: creditOrders.length,
      pendingAmount,
      overdueAmount,
      status: conversation.status,
      lastMessageFromCustomer: lastMessage?.sender === "customer",
      messageCount: recentMessages.length,
    }

    return {
      customer: {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        address: customer.address,
        city: customer.city,
        totalSpent: customer.totalSpent,
        totalOrders: customer.totalOrders,
        lastPurchaseAt: customer.lastPurchaseAt?.toISOString() ?? null,
        tags: customer.tags.map((t) => t.tag.name),
      },
      orders: orderViews,
      favoriteProducts,
      purchasedProductsCount: productMap.size,
      credits: {
        activeCredits: creditOrders.length,
        pendingAmount,
        overdueAmount,
        nextDueDate: nextDue?.toISOString() ?? null,
      },
      recentInteractions,
      notes: [...customerNotes, ...notes].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      aiRecommendations: buildInboxRecommendations(seed),
    }
  }
}
