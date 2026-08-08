import { describe, expect, it, vi, beforeEach } from "vitest"
import type { PrismaClient } from "@prisma/client"
import { FinancialEngine, FinancialCache, periodRange, DEFAULT_CACHE_TTL_MS } from "@/lib/financial-intelligence/financial-engine"
import type { FinancialPeriod } from "@/lib/financial-intelligence"

const ctx = { storeId: "store-1", userId: "user-1", role: "admin", plan: "business", storeName: "Mi Tienda" }

function makeDeps(over: Record<string, unknown> = {}) {
  const db = {
    expense: {
      aggregate: vi.fn().mockImplementation(({ where }: { where: { date: { gte: Date } } }) =>
        Promise.resolve({ _sum: { amount: new Date(where.date.gte).getMonth() === 6 ? 200 : 400 } }),
      ),
    },
    orderPayment: { aggregate: vi.fn().mockResolvedValue({ _sum: { amount: 200 } }) },
    supplierPayment: { aggregate: vi.fn().mockResolvedValue({ _sum: { amount: 100 } }) },
  } as unknown as PrismaClient

  const salesService = {
    summary: vi.fn().mockImplementation((_c: unknown, opts: { from: string }) =>
      Promise.resolve({ revenue: new Date(opts.from).getMonth() === 6 ? 800 : 1000, totalOrders: 3, totalItems: 8 }),
    ),
  }

  const creditService = {
    list: vi.fn().mockResolvedValue({
      kpis: {
        totalPending: 500,
        activeCredits: 3,
        overdueCredits: 2,
        overdueAmount: 150,
        dueNext7Days: 100,
        recoveredThisMonth: 200,
        recoveryRate: 0.6,
      },
      credits: [
        { orderId: "o1", customerName: "Juan", pending: 300, state: "overdue" },
        { orderId: "o2", customerName: "María", pending: 150, state: "on_time" },
        { orderId: "o3", customerName: "Saldado", pending: 0, state: "paid" },
      ],
    }),
  }

  const supplierService = {
    list: vi.fn().mockResolvedValue({
      kpis: {
        totalPayable: 300,
        pendingInvoices: 2,
        overdueInvoices: 1,
        overdueAmount: 80,
        dueNext7Days: 50,
        paidThisMonth: 100,
        activeSuppliers: 1,
      },
      suppliers: [
        { id: "s1", name: "Mercantil", balance: 250, nextDueDate: null },
        { id: "s2", name: "El Mayorista", balance: 50, nextDueDate: new Date().toISOString() },
      ],
    }),
  }

  return {
    db,
    salesService,
    creditService,
    supplierService,
    ...over,
  }
}

function makeEngine(over: Record<string, unknown> = {}) {
  const deps = makeDeps(over)
  return { engine: new FinancialEngine(deps), deps }
}

describe("periodRange (FASE 6D)", () => {
  it("calcula hoy y su día anterior", () => {
    const now = new Date("2026-08-05T15:00:00")
    const range = periodRange("today", now)
    expect(range.period).toBe("today")
    expect(range.label).toBe("hoy")
    expect(range.from.getTime()).toBe(new Date("2026-08-05T00:00:00").getTime())
    expect(range.to).toBe(now)
    expect(range.prevTo.getTime()).toBe(range.from.getTime() - 1)
    expect(range.prevFrom.getDate()).toBe(4)
  })

  it("calcula la semana desde el lunes", () => {
    const now = new Date("2026-08-05T15:00:00") // miércoles
    const range = periodRange("week", now)
    expect(range.label).toBe("esta semana")
    expect(range.from.getDay()).toBe(1) // lunes
    expect(range.prevFrom.getTime()).toBe(range.from.getTime() - 7 * 86400000)
  })

  it("calcula el mes y el mes anterior", () => {
    const now = new Date("2026-08-05T15:00:00")
    const range = periodRange("month", now)
    expect(range.label).toBe("este mes")
    expect(range.from.getDate()).toBe(1)
    expect(range.prevFrom.getMonth()).toBe(6) // julio
    expect(range.prevFrom.getDate()).toBe(1)
  })
})

describe("FinancialCache (FASE 6D)", () => {
  it("respeta el TTL", () => {
    const cache = new FinancialCache(60_000)
    cache.set("financial:indicators:store-1:week:x", makeCacheValue())
    expect(cache.get("financial:indicators:store-1:week:x")).toBeDefined()

    const expired = new FinancialCache(-1)
    expired.set("k", makeCacheValue())
    expect(expired.get("k")).toBeUndefined()
  })

  it("invalida solo las entradas de una tienda", () => {
    const cache = new FinancialCache()
    cache.set("financial:indicators:store-1:week:a", makeCacheValue())
    cache.set("financial:indicators:store-2:week:a", makeCacheValue())
    cache.set("financial:indicators:store-1:month:b", makeCacheValue())
    cache.clearStore("store-1")
    expect(cache.get("financial:indicators:store-1:week:a")).toBeUndefined()
    expect(cache.get("financial:indicators:store-1:month:b")).toBeUndefined()
    expect(cache.get("financial:indicators:store-2:week:a")).toBeDefined()
  })

  it("usa el TTL por defecto de 60s", () => {
    expect(DEFAULT_CACHE_TTL_MS).toBe(60_000)
    expect(FinancialCache.TTL_MS).toBe(60_000)
  })
})

function makeCacheValue() {
  return {
    period: "week",
    label: "esta semana",
    revenue: 1,
    previousRevenue: 0,
    revenueDeltaPct: null,
    expenses: 0,
    previousExpenses: 0,
    expensesDeltaPct: null,
    netFlow: 1,
    totalPending: 0,
    recoveredInPeriod: 0,
    recoveryRate: 0,
    overdueCredits: 0,
    overdueCreditAmount: 0,
    dueNext7DaysCollect: 0,
    topDebtors: [],
    totalPayable: 0,
    paidToSuppliersInPeriod: 0,
    overdueSupplierInvoices: 0,
    overdueSupplierAmount: 0,
    dueNext7DaysPay: 0,
    topPayableSuppliers: [],
  } as never
}

describe("FinancialEngine (FASE 6D)", () => {
  beforeEach(() => vi.clearAllMocks())

  it("agrega ventas, gastos, créditos y proveedores en un solo conjunto", async () => {
    const { engine, deps } = makeEngine()
    const indicators = await engine.getIndicators(ctx, "week", new Date("2026-08-05T15:00:00"))

    expect(indicators.revenue).toBe(1000)
    expect(indicators.revenueDeltaPct).toBe(25) // 1000 vs 800 del fake
    expect(indicators.expenses).toBe(400)
    expect(indicators.expensesDeltaPct).toBe(100) // 400 vs 200 del fake
    expect(indicators.netFlow).toBe(600)
    expect(indicators.totalPending).toBe(500)
    expect(indicators.recoveredInPeriod).toBe(200)
    expect(indicators.recoveryRate).toBe(60)
    expect(indicators.overdueCredits).toBe(2)
    expect(indicators.overdueCreditAmount).toBe(150)
    expect(indicators.dueNext7DaysCollect).toBe(100)
    expect(indicators.totalPayable).toBe(300)
    expect(indicators.paidToSuppliersInPeriod).toBe(100)
    expect(indicators.overdueSupplierInvoices).toBe(1)
    expect(indicators.overdueSupplierAmount).toBe(80)
    expect(indicators.dueNext7DaysPay).toBe(50)

    expect(deps.salesService.summary).toHaveBeenCalledTimes(2)
    expect(deps.creditService.list).toHaveBeenCalledWith(ctx, { status: "all", limit: 500 })
    expect(deps.supplierService.list).toHaveBeenCalledWith(ctx, { limit: 500 })
  })

  it("calcula topDebtors excluyendo créditos saldados/cancelados", async () => {
    const { engine } = makeEngine()
    const indicators = await engine.getIndicators(ctx, "week", new Date("2026-08-05T15:00:00"))
    expect(indicators.topDebtors).toEqual([
      { name: "Juan", pending: 300 },
      { name: "María", pending: 150 },
    ])
  })

  it("calcula topPayableSuppliers por saldo descendente", async () => {
    const { engine } = makeEngine()
    const indicators = await engine.getIndicators(ctx, "week", new Date("2026-08-05T15:00:00"))
    expect(indicators.topPayableSuppliers[0]).toMatchObject({ name: "Mercantil", outstanding: 250 })
    expect(indicators.topPayableSuppliers).toHaveLength(2)
  })

  it("usa la caché y no recalcula en el mismo período", async () => {
    const { engine, deps } = makeEngine()
    const now = new Date("2026-08-05T15:00:00")
    await engine.getIndicators(ctx, "week", now)
    await engine.getIndicators(ctx, "week", now)
    expect(deps.salesService.summary).toHaveBeenCalledTimes(2) // solo el primer cálculo
  })

  it("recalcula tras invalidar la caché de la tienda", async () => {
    const { engine, deps } = makeEngine()
    const now = new Date("2026-08-05T15:00:00")
    await engine.getIndicators(ctx, "week", now)
    engine.invalidateStore("store-1")
    await engine.getIndicators(ctx, "week", now)
    expect(deps.salesService.summary).toHaveBeenCalledTimes(4)
  })

  it("no invalida otras tiendas", async () => {
    const { engine } = makeEngine()
    const now = new Date("2026-08-05T15:00:00")
    await engine.getIndicators(ctx, "week", now)
    await engine.getIndicators({ ...ctx, storeId: "store-2" }, "week", now)
    engine.invalidateStore("store-2")
    const cached = await engine.getIndicators(ctx, "week", now)
    expect(cached.revenue).toBe(1000)
  })

  it("getSummary devuelve un resumen ejecutivo", async () => {
    const { engine } = makeEngine()
    const summary = await engine.getSummary(ctx, "week", new Date("2026-08-05T15:00:00"))
    expect(summary.paragraphs.length).toBeGreaterThan(0)
    expect(["positive", "warning", "neutral"]).toContain(summary.tone)
  })

  it("getInsights prioriza de mayor a menor impacto", async () => {
    const { engine } = makeEngine()
    const insights = await engine.getInsights(ctx, "week", new Date("2026-08-05T15:00:00"))
    expect(insights.length).toBeGreaterThan(0)
    const ranks = insights.map((i) => ({ alta: 0, media: 1, baja: 2 })[i.priority])
    expect(ranks).toEqual([...ranks].sort((a, b) => a - b))
  })

  it("getPanel compone indicadores, resumen e insights", async () => {
    const { engine } = makeEngine()
    const panel = await engine.getPanel(ctx, "month", new Date("2026-08-05T15:00:00"))
    expect(panel.period).toBe("month")
    expect(panel.indicators.revenue).toBe(1000)
    expect(panel.summary.paragraphs.length).toBeGreaterThan(0)
    expect(panel.insights.length).toBeGreaterThan(0)
    expect(typeof panel.generatedAt).toBe("string")
  })

  it("respetar el período en la clave de caché", async () => {
    const { engine, deps } = makeEngine()
    const now = new Date("2026-08-05T15:00:00")
    await engine.getIndicators(ctx, "week", now)
    await engine.getIndicators(ctx, "month", now)
    expect(deps.salesService.summary).toHaveBeenCalledTimes(4)
  })

  it("normaliza la tasa de recuperación a porcentaje", async () => {
    const { engine, deps } = makeEngine()
    deps.creditService.list.mockResolvedValue({
      kpis: { totalPending: 0, activeCredits: 0, overdueCredits: 0, overdueAmount: 0, dueNext7Days: 0, recoveredThisMonth: 0, recoveryRate: 0.25 },
      credits: [],
    })
    const indicators = await engine.getIndicators(ctx, "week", new Date("2026-08-05T15:00:00"))
    expect(indicators.recoveryRate).toBe(25)
  })

  it("soporta cualquier período válido", async () => {
    const { engine } = makeEngine()
    for (const period of ["today", "week", "month"] as FinancialPeriod[]) {
      const indicators = await engine.getIndicators(ctx, period, new Date("2026-08-05T15:00:00"))
      expect(indicators.period).toBe(period)
    }
  })
})
