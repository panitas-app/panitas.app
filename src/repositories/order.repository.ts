import { Prisma, PrismaClient } from "@prisma/client"
import { prisma } from "@/lib/prisma"

export type OrderFilters = {
  storeId: string
  status?: string
  paymentStatus?: string
  q?: string
  from?: string
  to?: string
  skip?: number
  take?: number
}

export class OrderRepository {
  constructor(private readonly db: PrismaClient = prisma) {}

  private buildWhere(filters: OrderFilters): Prisma.OrderWhereInput {
    const where: Prisma.OrderWhereInput = { storeId: filters.storeId }
    if (filters.status && filters.status !== "all") where.status = filters.status
    if (filters.paymentStatus) where.paymentStatus = filters.paymentStatus
    if (filters.q) {
      where.OR = [
        { orderNumber: { contains: filters.q } },
        { customerName: { contains: filters.q, mode: "insensitive" } },
        { customerPhone: { contains: filters.q } },
      ]
    }
    if (filters.from || filters.to) {
      where.createdAt = {}
      if (filters.from) where.createdAt.gte = new Date(filters.from)
      if (filters.to) where.createdAt.lte = new Date(filters.to)
    }
    return where
  }

  async list(filters: OrderFilters) {
    const where = this.buildWhere(filters)
    const [orders, total] = await Promise.all([
      this.db.order.findMany({
        where,
        include: {
          items: { include: { product: true } },
          payments: true,
        },
        orderBy: { createdAt: "desc" },
        skip: filters.skip,
        take: filters.take,
      }),
      this.db.order.count({ where }),
    ])
    return { orders, total }
  }

  findById(id: string) {
    return this.db.order.findUnique({
      where: { id },
      include: {
        items: { include: { product: true } },
        payments: true,
        installments: true,
      },
    })
  }

  findByNumber(orderNumber: string) {
    return this.db.order.findUnique({
      where: { orderNumber },
      include: {
        items: { include: { product: true } },
        payments: true,
        installments: true,
      },
    })
  }

  countToday(storeId: string, start: Date, end: Date) {
    return this.db.order.count({
      where: { storeId, createdAt: { gte: start, lte: end } },
    })
  }

  findStoreById(id: string) {
    return this.db.store.findUnique({ where: { id } })
  }

  findCouponById(id: string) {
    return this.db.coupon.findUnique({ where: { id } })
  }

  findLatestBcvRate() {
    return this.db.bcvRate.findFirst({ orderBy: { date: "desc" } })
  }

  findSellerById(id: string) {
    return this.db.seller.findUnique({ where: { id } })
  }

  create(data: Prisma.OrderUncheckedCreateInput) {
    return this.db.order.create({ data })
  }

  createItem(data: Prisma.OrderItemUncheckedCreateInput) {
    return this.db.orderItem.create({ data })
  }

  createPayment(data: Prisma.OrderPaymentUncheckedCreateInput) {
    return this.db.orderPayment.create({ data })
  }

  createInstallment(data: Prisma.InstallmentUncheckedCreateInput) {
    return this.db.installment.create({ data })
  }

  createSellerCommission(data: Prisma.SellerCommissionUncheckedCreateInput) {
    return this.db.sellerCommission.create({ data })
  }

  decrementStock(productId: string, quantity: number) {
    return this.db.product.update({
      where: { id: productId },
      data: { stock: { decrement: quantity } },
    })
  }

  recordStockMovement(data: Prisma.StockMovementUncheckedCreateInput) {
    return this.db.stockMovement.create({ data })
  }

  updateCouponUsedCount(id: string) {
    return this.db.coupon.update({
      where: { id },
      data: { usedCount: { increment: 1 } },
    })
  }

  update(id: string, data: Prisma.OrderUncheckedUpdateInput) {
    return this.db.order.update({ where: { id }, data })
  }

  updateStatus(id: string, status: string, extra?: Prisma.OrderUncheckedUpdateInput) {
    return this.db.order.update({ where: { id }, data: { status, ...extra } })
  }

  markClientNotified(id: string) {
    return this.db.order.update({ where: { id }, data: { clientNotified: true } })
  }

  delete(id: string) {
    return this.db.order.delete({ where: { id } })
  }
}
