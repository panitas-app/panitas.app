import { Prisma, PrismaClient } from "@prisma/client"
import { prisma } from "@/lib/prisma"

export type CustomerListFilters = {
  storeId: string
  q?: string
  sort?: string
  order?: string
  skip?: number
  take?: number
}

export class CustomerRepository {
  constructor(private readonly db: PrismaClient = prisma) {}

  private buildWhere(filters: CustomerListFilters): Prisma.CustomerWhereInput {
    const where: Prisma.CustomerWhereInput = { storeId: filters.storeId }
    if (filters.q) {
      where.OR = [
        { name: { contains: filters.q, mode: "insensitive" } },
        { phone: { contains: filters.q } },
        { email: { contains: filters.q, mode: "insensitive" } },
        { documentId: { contains: filters.q, mode: "insensitive" } },
      ]
    }
    return where
  }

  private buildOrderBy(filters: CustomerListFilters): Prisma.CustomerOrderByWithRelationInput {
    const sort = filters.sort || "name"
    const order = filters.order === "desc" ? "desc" : "asc"
    if (sort === "totalSpent") return { totalSpent: order }
    if (sort === "totalOrders") return { totalOrders: order }
    if (sort === "lastPurchaseAt") return { lastPurchaseAt: order }
    return { name: order }
  }

  async list(filters: CustomerListFilters) {
    const where = this.buildWhere(filters)
    const orderBy = this.buildOrderBy(filters)
    const [customers, total] = await Promise.all([
      this.db.customer.findMany({ where, orderBy, skip: filters.skip, take: filters.take }),
      this.db.customer.count({ where }),
    ])
    return { customers, total }
  }

  findByStorePhone(storeId: string, phone: string) {
    return this.db.customer.findUnique({
      where: { storeId_phone: { storeId, phone } },
    })
  }

  findById(id: string) {
    return this.db.customer.findUnique({ where: { id } })
  }

  create(data: Prisma.CustomerUncheckedCreateInput) {
    return this.db.customer.create({ data })
  }

  update(id: string, data: Prisma.CustomerUpdateInput) {
    return this.db.customer.update({ where: { id }, data })
  }

  updateTotals(id: string, totalSpentInc: number, totalOrdersInc: number) {
    return this.db.customer.update({
      where: { id },
      data: {
        totalSpent: { increment: totalSpentInc },
        totalOrders: { increment: totalOrdersInc },
      },
    })
  }

  updateLastPurchase(id: string, date = new Date()) {
    return this.db.customer.update({
      where: { id },
      data: { lastPurchaseAt: date },
    })
  }

  /** Métricas de la cartera: totales, nuevos, recurrentes, inactivos y valor medio. */
  async metrics(storeId: string, inactiveDays = 60) {
    const monthStart = new Date()
    monthStart.setDate(1)
    monthStart.setHours(0, 0, 0, 0)

    const inactiveCutoff = new Date()
    inactiveCutoff.setDate(inactiveCutoff.getDate() - inactiveDays)

    const [total, newThisMonth, recurrent, inactive, spent] = await Promise.all([
      this.db.customer.count({ where: { storeId, isActive: true } }),
      this.db.customer.count({ where: { storeId, createdAt: { gte: monthStart } } }),
      this.db.customer.count({ where: { storeId, totalOrders: { gt: 1 } } }),
      this.db.customer.count({
        where: {
          storeId,
          isActive: true,
          OR: [{ lastPurchaseAt: null }, { lastPurchaseAt: { lt: inactiveCutoff } }],
        },
      }),
      this.db.customer.aggregate({ where: { storeId }, _sum: { totalSpent: true } }),
    ])

    return {
      total,
      newThisMonth,
      recurrent,
      inactive,
      inactiveDays,
      averageCustomerValue: total > 0 ? (spent._sum.totalSpent ?? 0) / total : 0,
      totalSpent: spent._sum.totalSpent ?? 0,
    }
  }

  /** Historial de pedidos de un cliente. */
  ordersByCustomer(storeId: string, customerId: string, take = 20) {
    return this.db.order.findMany({
      where: { storeId, customerId },
      orderBy: { createdAt: "desc" },
      take,
      include: { items: true },
    })
  }
}
