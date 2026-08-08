import { Prisma, PrismaClient } from "@prisma/client"
import { prisma } from "@/lib/prisma"

export type ExpenseListFilters = {
  storeId: string
  category?: string
  from?: string
  to?: string
  search?: string
  vendor?: string
  skip?: number
  take?: number
}

export class ExpenseRepository {
  constructor(private readonly db: PrismaClient = prisma) {}

  private buildWhere(filters: ExpenseListFilters): Prisma.ExpenseWhereInput {
    const where: Prisma.ExpenseWhereInput = { storeId: filters.storeId }
    if (filters.category && filters.category !== "todas") where.category = filters.category
    if (filters.vendor) where.vendor = { contains: filters.vendor, mode: "insensitive" }
    if (filters.search) where.description = { contains: filters.search, mode: "insensitive" }
    if (filters.from || filters.to) {
      where.date = {}
      if (filters.from) where.date.gte = new Date(filters.from)
      if (filters.to) where.date.lte = new Date(filters.to)
    }
    return where
  }

  async list(filters: ExpenseListFilters) {
    const where = this.buildWhere(filters)
    const [expenses, total] = await Promise.all([
      this.db.expense.findMany({
        where,
        orderBy: { date: "desc" },
        skip: filters.skip,
        take: filters.take,
      }),
      this.db.expense.count({ where }),
    ])
    return { expenses, total }
  }

  findById(id: string) {
    return this.db.expense.findUnique({ where: { id } })
  }

  create(data: Prisma.ExpenseUncheckedCreateInput) {
    return this.db.expense.create({ data })
  }

  update(id: string, data: Prisma.ExpenseUncheckedUpdateInput) {
    return this.db.expense.update({ where: { id }, data })
  }

  remove(id: string) {
    return this.db.expense.delete({ where: { id } })
  }

  /** Totales agregados por categoría para una tienda. */
  async totalsByCategory(storeId: string) {
    const rows = await this.db.expense.groupBy({
      by: ["category"],
      where: { storeId },
      _sum: { amount: true },
    })
    return rows.map((r) => ({ category: r.category, total: r._sum.amount ?? 0 }))
  }

  /** Total de gastos en un período (para resúmenes). */
  async totalInRange(storeId: string, from?: Date, to?: Date) {
    const agg = await this.db.expense.aggregate({
      where: { storeId, ...(from || to ? { date: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}) },
      _sum: { amount: true },
      _count: true,
    })
    return { total: agg._sum.amount ?? 0, count: agg._count }
  }
}
