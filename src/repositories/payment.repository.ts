import { PrismaClient } from "@prisma/client"
import { prisma } from "@/lib/prisma"

export class PaymentRepository {
  constructor(private readonly db: PrismaClient = prisma) {}

  listAccounts(storeId: string, activeOnly = false) {
    return this.db.paymentAccount.findMany({
      where: { storeId, ...(activeOnly ? { isActive: true } : {}) },
      orderBy: { createdAt: "asc" },
    })
  }

  findAccountById(id: string) {
    return this.db.paymentAccount.findUnique({ where: { id } })
  }

  createAccount(data: Parameters<typeof this.db.paymentAccount.create>[0]["data"]) {
    return this.db.paymentAccount.create({ data })
  }

  updateAccount(id: string, data: Parameters<typeof this.db.paymentAccount.update>[0]["data"]) {
    return this.db.paymentAccount.update({ where: { id }, data })
  }

  deleteAccount(id: string) {
    return this.db.paymentAccount.delete({ where: { id } })
  }

  findByOrderId(orderId: string) {
    return this.db.orderPayment.findMany({
      where: { orderId },
      include: { paymentAccount: true },
      orderBy: { createdAt: "desc" },
    })
  }
}
