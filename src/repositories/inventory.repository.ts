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

  updateStock(id: string, quantity: number, operator: "increment" | "decrement" | "set") {
    const data = operator === "set" ? { stock: quantity } : { stock: { [operator]: quantity } }
    return this.db.product.update({ where: { id }, data })
  }
}
