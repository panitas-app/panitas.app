import { Prisma, PrismaClient } from "@prisma/client"
import { prisma } from "@/lib/prisma"

export type StockMovementFilters = {
  storeId: string
  productId?: string
  type?: string
  from?: Date
  to?: Date
  skip?: number
  take?: number
}

export class InventoryRepository {
  constructor(private readonly db: PrismaClient = prisma) {}

  private buildWhere(filters: StockMovementFilters): Prisma.StockMovementWhereInput {
    const where: Prisma.StockMovementWhereInput = { storeId: filters.storeId }
    if (filters.productId) where.productId = filters.productId
    if (filters.type) where.type = filters.type
    if (filters.from || filters.to) {
      where.createdAt = {}
      if (filters.from) where.createdAt.gte = filters.from
      if (filters.to) where.createdAt.lte = filters.to
    }
    return where
  }

  async listMovements(filters: StockMovementFilters) {
    const where = this.buildWhere(filters)
    const [movements, total] = await Promise.all([
      this.db.stockMovement.findMany({
        where,
        include: { product: { select: { id: true, name: true, sku: true, images: true } } },
        orderBy: { createdAt: "desc" },
        skip: filters.skip,
        take: filters.take,
      }),
      this.db.stockMovement.count({ where }),
    ])
    return { movements, total }
  }

  recordMovement(data: {
    productId: string
    storeId: string
    type: string
    quantity: number
    balance: number
    concept?: string | null
    reference?: string | null
  }) {
    return this.db.stockMovement.create({ data })
  }

  findProductById(id: string) {
    return this.db.product.findUnique({ where: { id } })
  }

  findProductsByIds(ids: string[]) {
    return this.db.product.findMany({ where: { id: { in: ids } } })
  }

  findProductByStoreSku(storeId: string, sku: string) {
    return this.db.product.findFirst({
      where: { storeId, sku: sku.toUpperCase() },
    })
  }

  updateStock(id: string, quantity: number, operator: "increment" | "decrement" | "set") {
    const data = operator === "set" ? { stock: quantity } : { stock: { [operator]: quantity } }
    return this.db.product.update({ where: { id }, data })
  }

  /** Productos con stock menor o igual al umbral. */
  lowStock(storeId: string, threshold: number, take = 50) {
    return this.db.product.findMany({
      where: { storeId, isActive: true, stock: { lte: threshold } },
      orderBy: { stock: "asc" },
      take,
    })
  }

  /** Productos sin movimiento de stock en los últimos `days` días. */
  noMovement(storeId: string, days: number, take = 50) {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - days)
    return this.db.product.findMany({
      where: {
        storeId,
        isActive: true,
        stockMovements: { none: { createdAt: { gte: cutoff } } },
      },
      orderBy: { updatedAt: "desc" },
      take,
    })
  }

  /** Productos más vendidos por cantidad, en un rango de fechas (excluye canceladas). */
  bestSellers(storeId: string, from?: Date, to?: Date, take = 10) {
    const where: Prisma.OrderItemWhereInput = {
      order: {
        storeId,
        status: { not: "cancelled" },
        createdAt:
          from || to ? { gte: from, lte: to ?? undefined } : undefined,
      },
    }
    return this.db.orderItem.groupBy({
      by: ["productId"],
      where,
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: "desc" } },
      take,
    })
  }

  /** Resumen del inventario: totales, bajo stock y flujo de movimientos recientes. */
  async overview(storeId: string, lowStockThreshold = 5, windowDays = 30) {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - windowDays)

    const [totalProducts, totalUnits, lowStockProducts, movements] = await Promise.all([
      this.db.product.count({ where: { storeId, isActive: true } }),
      this.db.product.aggregate({ where: { storeId, isActive: true }, _sum: { stock: true } }),
      this.db.product.count({ where: { storeId, isActive: true, stock: { lte: lowStockThreshold } } }),
      this.db.stockMovement.aggregate({
        where: { storeId, createdAt: { gte: cutoff } },
        _sum: { quantity: true },
      }),
    ])

    const entries = await this.db.stockMovement.aggregate({
      where: { storeId, createdAt: { gte: cutoff }, quantity: { gt: 0 } },
      _sum: { quantity: true },
    })
    const exits = await this.db.stockMovement.aggregate({
      where: { storeId, createdAt: { gte: cutoff }, quantity: { lt: 0 } },
      _sum: { quantity: true },
    })

    return {
      totalProducts,
      totalUnits: totalUnits._sum.stock ?? 0,
      lowStockCount: lowStockProducts,
      lowStockThreshold,
      entries: entries._sum.quantity ?? 0,
      exits: Math.abs(exits._sum.quantity ?? 0),
      netMovement: movements._sum.quantity ?? 0,
      windowDays,
    }
  }
}
