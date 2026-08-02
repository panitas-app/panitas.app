import { SalesRepository } from "@/repositories/sales.repository"
import type { StoreServiceContext } from "@/services/context"

export type SalesSummaryOptions = {
  from?: string | null
  to?: string | null
}

export class SalesService {
  constructor(private readonly repo = new SalesRepository()) {}

  summary(ctx: StoreServiceContext, options: SalesSummaryOptions = {}) {
    return this.repo.summary({
      storeId: ctx.storeId,
      from: options.from ? new Date(options.from) : undefined,
      to: options.to ? new Date(options.to) : undefined,
    })
  }

  recent(ctx: StoreServiceContext, take = 10) {
    return this.repo.recent(ctx.storeId, take)
  }
}
