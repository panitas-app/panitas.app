import { PrismaClient } from "@prisma/client"
import { prisma } from "@/lib/prisma"

export type SalesSummaryFilters = {
  storeId: string
  from?: Date
  to?: Date
}

export class SalesRepository {
  constructor(private readonly db: PrismaClient = prisma) {}

  async summary(filters: SalesSummaryFilters) {
    const { storeId, from, to } = filters
    const where = {
      storeId,
      createdAt:
        from || to ? { gte: from, lte: to ?? undefined } : undefined,
    }
    const [revenue, count, products] = await Promise.all([
      this.db.order.aggregate({
        where: {
          ...where,
          paymentStatus: { in: ["paid", "verified"] },
        },
        _sum: { total: true },
      }),
      this.db.order.count({ where: { ...where, status: { not: "cancelled" } } }),
      this.db.orderItem.aggregate({
        where: { order: where },
        _sum: { quantity: true },
      }),
    ])
    return {
      revenue: revenue._sum.total ?? 0,
      totalOrders: count,
      totalItems: products._sum.quantity ?? 0,
    }
  }

  recent(storeId: string, take = 10) {
    return this.db.order.findMany({
      where: { storeId },
      orderBy: { createdAt: "desc" },
      take,
      include: { items: true },
    })
  }
}
