/**
 * FASE 6D — Motor de inteligencia financiera.
 *
 * Orquesta los datos de ventas, gastos, créditos/cobranza y proveedores para
 * producir los indicadores del panel, el resumen ejecutivo y los insights.
 *
 * Rendimiento:
 *  - Los indicadores se calculan una sola vez por (tienda, período) y se
 *    cachean en memoria con TTL.
 *  - La caché se invalida solo cuando llegan eventos que afectan los datos
 *    financieros (ventas, gastos, pagos de créditos/proveedores, compras).
 *
 * Desacoplamiento:
 *  - Reutiliza SalesService, CreditService y SupplierService; no accede a la
 *    capa HTTP. Las dependencias son inyectables para facilitar pruebas.
 */
import { PrismaClient } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { SalesService } from "@/services/sales.service"
import { CreditService } from "@/services/credit.service"
import { SupplierService } from "@/services/supplier.service"
import type { StoreServiceContext } from "@/services/context"
import type {
  FinancialIndicators,
  FinancialPanel,
  FinancialPeriod,
  FinancialRange,
  TopDebtor,
  TopPayableSupplier,
} from "./financial-types"
import { buildExecutiveSummary } from "./financial-summary"
import { buildInsights } from "./financial-insights"
import { sortInsightsByPriority } from "./financial-priority"

const PERIOD_LABELS: Record<FinancialPeriod, string> = {
  today: "hoy",
  week: "esta semana",
  month: "este mes",
}

export const DEFAULT_CACHE_TTL_MS = 60_000

function startOfDay(d: Date): Date {
  const copy = new Date(d)
  copy.setHours(0, 0, 0, 0)
  return copy
}

function startOfWeek(d: Date): Date {
  const copy = startOfDay(d)
  const day = (copy.getDay() + 6) % 7 // lunes = 0
  copy.setDate(copy.getDate() - day)
  return copy
}

function startOfMonth(d: Date): Date {
  const copy = startOfDay(d)
  copy.setDate(1)
  return copy
}

/** Calcula el rango del período actual y del período anterior. */
export function periodRange(period: FinancialPeriod, now: Date = new Date()): FinancialRange {
  const from =
    period === "today"
      ? startOfDay(now)
      : period === "week"
        ? startOfWeek(now)
        : startOfMonth(now)

  const prevFrom = new Date(from)
  if (period === "today") {
    prevFrom.setDate(prevFrom.getDate() - 1)
  } else if (period === "week") {
    prevFrom.setDate(prevFrom.getDate() - 7)
  } else {
    prevFrom.setMonth(prevFrom.getMonth() - 1)
  }

  const prevTo = new Date(from)
  prevTo.setMilliseconds(prevTo.getMilliseconds() - 1)

  return { period, label: PERIOD_LABELS[period], from, to: now, prevFrom, prevTo }
}

function deltaPct(current: number, previous: number): number | null {
  return previous > 0 ? ((current - previous) / previous) * 100 : null
}

function topDebtorsFrom(credits: Array<{ customerName: string; pending: number; state: string }>): TopDebtor[] {
  const byName = new Map<string, number>()
  for (const c of credits) {
    if (c.state === "paid" || c.state === "cancelled" || c.pending <= 0) continue
    byName.set(c.customerName, (byName.get(c.customerName) ?? 0) + c.pending)
  }
  return [...byName.entries()]
    .map(([name, pending]) => ({ name, pending }))
    .sort((a, b) => b.pending - a.pending)
    .slice(0, 3)
}

function topPayableFrom(suppliers: Array<{ name: string; balance: number; nextDueDate: string | null }>): TopPayableSupplier[] {
  return suppliers
    .map((s) => ({ name: s.name, outstanding: s.balance, dueDate: s.nextDueDate }))
    .sort((a, b) => b.outstanding - a.outstanding)
    .slice(0, 3)
}

/** Caché en memoria con TTL, invalidable por tienda y período. */
export class FinancialCache {
  static TTL_MS = DEFAULT_CACHE_TTL_MS

  private store = new Map<string, { value: FinancialIndicators; expiresAt: number }>()

  constructor(private readonly ttlMs: number = FinancialCache.TTL_MS) {}

  get(key: string): FinancialIndicators | undefined {
    const entry = this.store.get(key)
    if (!entry) return undefined
    if (entry.expiresAt < Date.now()) {
      this.store.delete(key)
      return undefined
    }
    return entry.value
  }

  set(key: string, value: FinancialIndicators): void {
    this.store.set(key, { value, expiresAt: Date.now() + this.ttlMs })
  }

  clear(): void {
    this.store.clear()
  }

  /** Invalida todas las entradas de una tienda (por ejemplo tras un evento). */
  clearStore(storeId: string): void {
    const prefix = `financial:indicators:${storeId}:`
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) this.store.delete(key)
    }
  }

  keys(): string[] {
    return [...this.store.keys()]
  }
}

export interface FinancialEngineDeps {
  db?: PrismaClient
  salesService?: SalesService
  creditService?: CreditService
  supplierService?: SupplierService
}

export class FinancialEngine {
  private readonly db: PrismaClient
  private readonly sales: SalesService
  private readonly credits: CreditService
  private readonly suppliers: SupplierService
  private readonly cache: FinancialCache

  constructor(deps: FinancialEngineDeps = {}, cache?: FinancialCache) {
    this.db = deps.db ?? prisma
    this.sales = deps.salesService ?? new SalesService()
    this.credits = deps.creditService ?? new CreditService(this.db)
    this.suppliers = deps.supplierService ?? new SupplierService(this.db)
    this.cache = cache ?? new FinancialCache()
  }

  /** Indicadores del período, con caché por (tienda, período). */
  async getIndicators(ctx: StoreServiceContext, period: FinancialPeriod, now: Date = new Date()): Promise<FinancialIndicators> {
    const range = periodRange(period, now)
    const key = `financial:indicators:${ctx.storeId}:${period}:${range.from.toISOString()}`
    const cached = this.cache.get(key)
    if (cached) return cached
    const indicators = await this.computeIndicators(ctx, range)
    this.cache.set(key, indicators)
    return indicators
  }

  /** Cálculo completo de indicadores (sin caché) para un rango dado. */
  async computeIndicators(ctx: StoreServiceContext, range: FinancialRange): Promise<FinancialIndicators> {
    const storeId = ctx.storeId
    const toIso = (d: Date) => d.toISOString()

    const [sales, previousSales, expenses, previousExpensesAgg, creditResult, recovered, supplierResult, paidToSuppliers] =
      await Promise.all([
        this.sales.summary(ctx, { from: toIso(range.from), to: toIso(range.to) }),
        this.sales.summary(ctx, { from: toIso(range.prevFrom), to: toIso(range.prevTo) }),
        this.db.expense.aggregate({
          where: { storeId, date: { gte: range.from, lte: range.to } },
          _sum: { amount: true },
        }),
        this.db.expense.aggregate({
          where: { storeId, date: { gte: range.prevFrom, lte: range.prevTo } },
          _sum: { amount: true },
        }),
        this.credits.list(ctx, { status: "all", limit: 500 }),
        this.db.orderPayment.aggregate({
          where: {
            status: "verified",
            paidAt: { gte: range.from, lte: range.to },
            order: { storeId, creditTerm: { not: null } },
          },
          _sum: { amount: true },
        }),
        this.suppliers.list(ctx, { limit: 500 }),
        this.db.supplierPayment.aggregate({
          where: { storeId, date: { gte: range.from, lte: range.to } },
          _sum: { amount: true },
        }),
      ])

    const revenue = sales.revenue
    const previousRevenue = previousSales.revenue
    const expensesAmount = expenses._sum.amount ?? 0
    const previousExpenses = previousExpensesAgg._sum.amount ?? 0
    const creditKpis = creditResult.kpis
    const supplierKpis = supplierResult.kpis

    return {
      period: range.period,
      label: range.label,
      revenue,
      previousRevenue,
      revenueDeltaPct: deltaPct(revenue, previousRevenue),
      expenses: expensesAmount,
      previousExpenses,
      expensesDeltaPct: deltaPct(expensesAmount, previousExpenses),
      netFlow: revenue - expensesAmount,
      totalPending: creditKpis.totalPending,
      recoveredInPeriod: recovered._sum.amount ?? 0,
      recoveryRate: creditKpis.recoveryRate * 100,
      overdueCredits: creditKpis.overdueCredits,
      overdueCreditAmount: creditKpis.overdueAmount,
      dueNext7DaysCollect: creditKpis.dueNext7Days,
      topDebtors: topDebtorsFrom(creditResult.credits),
      totalPayable: supplierKpis.totalPayable,
      paidToSuppliersInPeriod: paidToSuppliers._sum.amount ?? 0,
      overdueSupplierInvoices: supplierKpis.overdueInvoices,
      overdueSupplierAmount: supplierKpis.overdueAmount,
      dueNext7DaysPay: supplierKpis.dueNext7Days,
      topPayableSuppliers: topPayableFrom(supplierResult.suppliers),
    }
  }

  /** Resumen ejecutivo del período. */
  async getSummary(ctx: StoreServiceContext, period: FinancialPeriod, now: Date = new Date()) {
    const indicators = await this.getIndicators(ctx, period, now)
    return buildExecutiveSummary(indicators)
  }

  /** Insights accionables priorizados del período. */
  async getInsights(ctx: StoreServiceContext, period: FinancialPeriod, now: Date = new Date()) {
    const indicators = await this.getIndicators(ctx, period, now)
    return sortInsightsByPriority(buildInsights(indicators))
  }

  /** Panel ejecutivo completo: indicadores + resumen + insights priorizados. */
  async getPanel(ctx: StoreServiceContext, period: FinancialPeriod, now: Date = new Date()): Promise<FinancialPanel> {
    const indicators = await this.getIndicators(ctx, period, now)
    const summary = buildExecutiveSummary(indicators)
    const insights = sortInsightsByPriority(buildInsights(indicators))
    return {
      period,
      label: indicators.label,
      generatedAt: new Date().toISOString(),
      indicators,
      summary,
      insights,
    }
  }

  /** Invalida la caché financiera de una tienda (tras eventos relevantes). */
  invalidateStore(storeId: string): void {
    this.cache.clearStore(storeId)
  }
}

/** Caché compartida del proceso para que el listener de eventos la invalide. */
export const defaultFinancialCache = new FinancialCache()
