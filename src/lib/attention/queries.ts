/**
 * Capa de datos del Sistema de Atención (FASE 8C).
 *
 * Única capa que toca Prisma. Devuelve los datos tipados que consumen los
 * detectors (puros). Mantener aquí todas las consultas hace que el motor sea
 * testeable con un `prisma` simulado y que los detectors sean 100% puros.
 */
import type { PrismaClient } from "@prisma/client"
import { prisma as defaultPrisma } from "@/lib/prisma"
import { ATTENTION_CONFIG } from "./config"
import type { ChannelData, ConversationData, CreditData, InventoryData, OrderData, SupplierData } from "./detectors"

export interface AttentionDataPort {
  fetchInventory(storeId: string, now?: Date): Promise<InventoryData>
  fetchCredits(storeId: string): Promise<CreditData>
  fetchSuppliers(storeId: string): Promise<SupplierData>
  fetchOrders(storeId: string): Promise<OrderData>
  fetchConversations(storeId: string): Promise<ConversationData>
  fetchChannels(storeId: string): Promise<ChannelData>
}

export function createAttentionDataPort(db: PrismaClient = defaultPrisma): AttentionDataPort {
  return {
    async fetchInventory(storeId, now = new Date()) {
      const [products, movements] = await Promise.all([
        db.product.findMany({
          where: { storeId, isActive: true },
          select: { id: true, name: true, stock: true, createdAt: true },
        }),
        db.stockMovement.findMany({
          where: {
            storeId,
            createdAt: { gte: new Date(now.getTime() - ATTENTION_CONFIG.noMovementDays * 24 * 60 * 60 * 1000) },
          },
          select: { productId: true },
          distinct: ["productId"],
        }),
      ])
      return {
        products,
        activeProductIds: movements.map((m) => m.productId),
      }
    },

    async fetchCredits(storeId) {
      const rows = await db.installment.findMany({
        where: {
          order: { storeId },
          status: { in: ["pending", "late"] },
        },
        select: {
          id: true,
          number: true,
          amount: true,
          dueDate: true,
          status: true,
          order: {
            select: {
              id: true,
              orderNumber: true,
              customerName: true,
            },
          },
        },
      })
      return {
        installments: rows.map((row) => ({
          id: row.id,
          number: row.number,
          amount: row.amount,
          dueDate: row.dueDate,
          status: row.status,
          orderId: row.order.id,
          orderNumber: row.order.orderNumber,
          customerName: row.order.customerName || "Cliente",
        })),
      }
    },

    async fetchSuppliers(storeId) {
      const rows = await db.supplierInvoice.findMany({
        where: { storeId, status: { in: ["pending", "partial"] } },
        select: {
          id: true,
          number: true,
          description: true,
          amount: true,
          paidAmount: true,
          status: true,
          dueDate: true,
          supplier: { select: { name: true } },
        },
      })
      return {
        invoices: rows.map((row) => ({
          id: row.id,
          number: row.number,
          description: row.description,
          amount: row.amount,
          paidAmount: row.paidAmount,
          status: row.status,
          dueDate: row.dueDate,
          supplierName: row.supplier.name || "Proveedor",
        })),
      }
    },

    async fetchOrders(storeId) {
      const rows = await db.order.findMany({
        where: { storeId, status: { in: ["pending", "confirmed", "preparing", "shipped"] } },
        select: {
          id: true,
          orderNumber: true,
          status: true,
          paymentStatus: true,
          posPin: true,
          customerName: true,
          createdAt: true,
          updatedAt: true,
        },
      })
      return { orders: rows }
    },

    async fetchConversations(storeId) {
      const rows = await db.inboxConversation.findMany({
        where: { storeId, status: { in: ["nueva", "pendiente"] } },
        select: {
          id: true,
          title: true,
          status: true,
          priority: true,
          unreadCount: true,
          lastMessageAt: true,
          channel: { select: { name: true, type: true } },
          customer: { select: { name: true } },
        },
      })
      return {
        conversations: rows.map((row) => ({
          id: row.id,
          title: row.title,
          status: row.status,
          priority: row.priority,
          channelName: row.channel.name || row.channel.type,
          customerName: row.customer?.name ?? null,
          lastMessageAt: row.lastMessageAt,
          unreadCount: row.unreadCount,
        })),
      }
    },

    async fetchChannels(storeId) {
      const rows = await db.channelConnection.findMany({
        where: { storeId, status: { in: ["disconnected", "error"] } },
        select: {
          id: true,
          channelId: true,
          provider: true,
          status: true,
          errorMessage: true,
          channel: { select: { name: true, type: true } },
        },
      })
      return {
        connections: rows.map((row) => ({
          id: row.id,
          channelId: row.channelId,
          channelName: row.channel.name || row.channel.type,
          provider: row.provider,
          status: row.status,
          errorMessage: row.errorMessage,
        })),
      }
    },
  }
}
