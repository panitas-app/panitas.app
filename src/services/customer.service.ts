import { CustomerRepository } from "@/repositories/customer.repository"
import { eventService } from "@/events/event.service"
import { serviceError } from "@/services/errors"
import type { StoreServiceContext } from "@/services/context"

export type CustomerListOptions = {
  q?: string
  sort?: string
  order?: string
  skip?: number
  take?: number
}

export type CustomerFindOrCreateInput = {
  phone: string
  name?: string | null
  documentId?: string | null
  email?: string | null
  address?: string | null
  city?: string | null
  state?: string | null
}

export class CustomerService {
  constructor(private readonly repo = new CustomerRepository()) {}

  list(ctx: StoreServiceContext, options: CustomerListOptions) {
    return this.repo.list({ storeId: ctx.storeId, ...options })
  }

  async findOrCreateByPhone(ctx: StoreServiceContext, input: CustomerFindOrCreateInput) {
    const existing = await this.repo.findByStorePhone(ctx.storeId, input.phone)
    if (existing) {
      await this.repo.updateLastPurchase(existing.id)
      return { customer: existing, created: false }
    }

    const customer = await this.repo.create({
      storeId: ctx.storeId,
      name: input.name || "Cliente",
      phone: input.phone,
      documentId: input.documentId || null,
      email: input.email || null,
      address: input.address || null,
      city: input.city || null,
      state: input.state || null,
      totalSpent: 0,
      totalOrders: 0,
      lastPurchaseAt: new Date(),
    })

    eventService.emit("customer.created", {
      customerId: customer.id,
      storeId: ctx.storeId,
      name: customer.name,
    })

    return { customer, created: true }
  }

  async updateTotals(ctx: StoreServiceContext, customerId: string, totalSpentInc: number, totalOrdersInc: number) {
    const customer = await this.repo.findById(customerId)
    if (!customer) throw serviceError("Cliente no encontrado", 404)
    if (customer.storeId !== ctx.storeId) throw serviceError("No autorizado", 403)
    return this.repo.updateTotals(customerId, totalSpentInc, totalOrdersInc)
  }
}
