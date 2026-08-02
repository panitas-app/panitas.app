import { SalesRepository } from "@/repositories/sales.repository"

export type SalesPeriodView = {
  label: string
  revenue: number
  totalOrders: number
  totalItems: number
  averageTicket: number
}

export type SalesMetrics = {
  today: SalesPeriodView
  week: SalesPeriodView
  month: SalesPeriodView
}

export type SalesMetricsOptions = {
  repo?: SalesRepository
}

function startOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function startOfWeek(date: Date): Date {
  const d = startOfDay(date)
  const day = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - day)
  return d
}

function startOfMonth(date: Date): Date {
  const d = startOfDay(date)
  d.setDate(1)
  return d
}

async function period(repo: SalesRepository, storeId: string, label: string, from: Date, to: Date): Promise<SalesPeriodView> {
  const summary = await repo.summary({ storeId, from, to })
  return {
    label,
    revenue: summary.revenue,
    totalOrders: summary.totalOrders,
    totalItems: summary.totalItems,
    averageTicket: summary.totalOrders > 0 ? summary.revenue / summary.totalOrders : 0,
  }
}

/** Métricas de ventas: hoy, semana y mes (solo lectura, listas para el agente). */
export async function getSalesMetrics(storeId: string, options: SalesMetricsOptions = {}): Promise<SalesMetrics> {
  const repo = options.repo ?? new SalesRepository()
  const now = new Date()
  const [today, week, month] = await Promise.all([
    period(repo, storeId, "today", startOfDay(now), now),
    period(repo, storeId, "week", startOfWeek(now), now),
    period(repo, storeId, "month", startOfMonth(now), now),
  ])
  return { today, week, month }
}
