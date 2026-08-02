import { SalesRepository } from "@/repositories/sales.repository"
import type { StoreServiceContext } from "@/services/context"

export type SalesSummaryOptions = {
  from?: string | null
  to?: string | null
}

export type SalesOverview = {
  today: SalesPeriod
  week: SalesPeriod
  month: SalesPeriod
  averageTicket: number
  topProducts: Array<{ productId: string; name: string; quantity: number }>
  frequentCustomers: Array<{ customerId: string; name: string; orders: number; total: number }>
}

export type SalesPeriod = {
  revenue: number
  totalOrders: number
  totalItems: number
  averageTicket: number
}

function startOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function startOfWeek(date: Date): Date {
  const d = startOfDay(date)
  const day = (d.getDay() + 6) % 7 // lunes = 0
  d.setDate(d.getDate() - day)
  return d
}

function startOfMonth(date: Date): Date {
  const d = startOfDay(date)
  d.setDate(1)
  return d
}

function toPeriod(summary: { revenue: number; totalOrders: number; totalItems: number }): SalesPeriod {
  return {
    revenue: summary.revenue,
    totalOrders: summary.totalOrders,
    totalItems: summary.totalItems,
    averageTicket: summary.totalOrders > 0 ? summary.revenue / summary.totalOrders : 0,
  }
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

  /** Resumen diario, semanal y mensual de ventas. */
  async dailySummary(ctx: StoreServiceContext): Promise<SalesOverview> {
    const now = new Date()
    const [today, week, month] = await Promise.all([
      this.repo.summary({ storeId: ctx.storeId, from: startOfDay(now) }),
      this.repo.summary({ storeId: ctx.storeId, from: startOfWeek(now) }),
      this.repo.summary({ storeId: ctx.storeId, from: startOfMonth(now) }),
    ])

    const topRows = await this.repo.topProducts(ctx.storeId, startOfMonth(now), now, 10)
    const productIds = topRows.map((r) => r.productId)
    const products = productIds.length > 0
      ? await this.repo.productsByIds(productIds)
      : []
    const byId = new Map(products.map((p) => [p.id, p]))

    const freqRows = await this.repo.frequentCustomers(ctx.storeId, startOfMonth(now), now, 5)
    const customerIds = freqRows.map((r) => r.customerId).filter((id): id is string => Boolean(id))
    const customers = customerIds.length > 0
      ? await this.repo.customersByIds(customerIds)
      : []
    const custById = new Map(customers.map((c) => [c.id, c]))

    return {
      today: toPeriod(today),
      week: toPeriod(week),
      month: toPeriod(month),
      averageTicket: toPeriod(month).averageTicket,
      topProducts: topRows
        .map((r) => ({ productId: r.productId, name: byId.get(r.productId)?.name ?? "Producto", quantity: r._sum.quantity ?? 0 }))
        .filter((p) => p.quantity > 0),
      frequentCustomers: freqRows
        .map((r) => ({
          customerId: r.customerId as string,
          name: custById.get(r.customerId as string)?.name ?? "Cliente",
          orders: r._count._all,
          total: r._sum.total ?? 0,
        }))
        .filter((c) => c.orders > 0),
    }
  }

  /** Ticket promedio en un rango. */
  async averageTicket(ctx: StoreServiceContext, from?: string, to?: string) {
    const summary = await this.repo.summary({
      storeId: ctx.storeId,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
    })
    return toPeriod(summary).averageTicket
  }

  /** Productos vendidos en un rango (nombre + cantidad). */
  async productsSold(ctx: StoreServiceContext, from?: string, to?: string, take = 10) {
    const rows = await this.repo.topProducts(
      ctx.storeId,
      from ? new Date(from) : undefined,
      to ? new Date(to) : undefined,
      take
    )
    const productIds = rows.map((r) => r.productId)
    if (productIds.length === 0) return []
    const products = await this.repo.productsByIds(productIds)
    const byId = new Map(products.map((p) => [p.id, p]))
    return rows
      .map((r) => ({ productId: r.productId, name: byId.get(r.productId)?.name ?? "Producto", quantity: r._sum.quantity ?? 0 }))
      .filter((p) => p.quantity > 0)
  }

  /** Clientes frecuentes en un rango. */
  async frequentCustomers(ctx: StoreServiceContext, from?: string, to?: string, take = 10) {
    const rows = await this.repo.frequentCustomers(
      ctx.storeId,
      from ? new Date(from) : undefined,
      to ? new Date(to) : undefined,
      take
    )
    const customerIds = rows.map((r) => r.customerId).filter((id): id is string => Boolean(id))
    if (customerIds.length === 0) return []
    const customers = await this.repo.customersByIds(customerIds)
    const byId = new Map(customers.map((c) => [c.id, c]))
    return rows
      .map((r) => ({
        customerId: r.customerId as string,
        name: byId.get(r.customerId as string)?.name ?? "Cliente",
        phone: byId.get(r.customerId as string)?.phone ?? null,
        orders: r._count._all,
        total: r._sum.total ?? 0,
      }))
      .filter((c) => c.orders > 0)
  }
}
