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
      status: { not: "cancelled" },
    }
    const [revenue, count, products] = await Promise.all([
      this.db.order.aggregate({
        where,
        _sum: { total: true },
      }),
      this.db.order.count({ where }),
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

  /** Productos vendidos (por cantidad) en un rango, excluyendo canceladas. */
  topProducts(storeId: string, from?: Date, to?: Date, take = 10) {
    return this.db.orderItem.groupBy({
      by: ["productId"],
      where: {
        order: {
          storeId,
          status: { not: "cancelled" },
          createdAt: from || to ? { gte: from, lte: to ?? undefined } : undefined,
        },
      },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: "desc" } },
      take,
    })
  }

  /** Clientes con más compras en un rango (con total gastado). */
  frequentCustomers(storeId: string, from?: Date, to?: Date, take = 10) {
    return this.db.order.groupBy({
      by: ["customerId"],
      where: {
        storeId,
        customerId: { not: null },
        status: { not: "cancelled" },
        createdAt: from || to ? { gte: from, lte: to ?? undefined } : undefined,
      },
      _count: { _all: true },
      _sum: { total: true },
      orderBy: { _sum: { total: "desc" } },
      take,
    })
  }

  productsByIds(ids: string[]) {
    return this.db.product.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } })
  }

  customersByIds(ids: string[]) {
    return this.db.customer.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, phone: true } })
  }
}
