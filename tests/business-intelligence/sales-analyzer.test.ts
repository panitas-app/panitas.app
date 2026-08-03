import { describe, expect, it, vi } from "vitest"
import { SalesAnalyzer } from "@/lib/business-intelligence/analyzers/sales-analyzer"
import type { StoreServiceContext } from "@/services/context"

const ctx: StoreServiceContext = { storeId: "store-1", userId: "user-1", plan: "business" }

function makeService(overrides: Record<string, unknown> = {}) {
  return {
    summary: vi.fn().mockImplementation((_c: unknown, opts: { from?: string; to?: string } = {}) => {
      const current = { revenue: 1000, totalOrders: 10, totalItems: 20 }
      const previous = { revenue: 500, totalOrders: 5, totalItems: 10 }
      return Promise.resolve(opts.from && opts.to ? previous : current)
    }),
    productsSold: vi.fn().mockResolvedValue([{ productId: "p1", name: "Abrazadera", quantity: 5 }]),
    ...overrides,
  }
}

describe("SalesAnalyzer (FASE 4B)", () => {
  it("calcula ticket promedio y compara semana/mes con el período anterior", async () => {
    const service = makeService()
    const analyzer = new SalesAnalyzer({ salesService: service as never })
    const result = await analyzer.run(ctx)

    const ids = result.observations.map((o) => o.ruleId)
    expect(ids).toContain("sales.week_comparison")
    expect(ids).toContain("sales.month_comparison")
    expect(ids).toContain("sales.top_products")

    const week = result.observations.find((o) => o.ruleId === "sales.week_comparison")!
    expect(week.title).toBe("Ventas de la semana en aumento")
    expect(week.description).toContain("100%")
    expect(week.description).toContain("Bs 1.000,00")
    expect(week.importance).toBe("info")

    expect(result.data.todayOrders).toBe(10)
    expect(result.data.averageTicket).toBe(100)
    expect(result.data.weekRevenue).toBe(1000)
    expect(result.data.monthRevenue).toBe(1000)
  })

  it("propaga el storeId del contexto a los servicios", async () => {
    const service = makeService()
    const analyzer = new SalesAnalyzer({ salesService: service as never })
    await analyzer.run(ctx)

    expect(service.summary).toHaveBeenCalledTimes(5)
    for (const call of service.summary.mock.calls) {
      expect(call[0]).toEqual(expect.objectContaining({ storeId: "store-1" }))
    }
    expect(service.productsSold).toHaveBeenCalledWith(
      expect.objectContaining({ storeId: "store-1" }),
      expect.any(String),
      undefined,
      3
    )
  })

  it("avisa de forma informativa cuando no hay ventas hoy", async () => {
    const service = makeService({
      summary: vi.fn().mockResolvedValue({ revenue: 0, totalOrders: 0, totalItems: 0 }),
    })
    const analyzer = new SalesAnalyzer({ salesService: service as never })
    const result = await analyzer.run(ctx)

    expect(result.observations.some((o) => o.ruleId === "sales.no_sales_today")).toBe(true)
    expect(result.observations.find((o) => o.ruleId === "sales.no_sales_today")!.importance).toBe("info")
    expect(result.data.todayOrders).toBe(0)
    expect(result.data.averageTicket).toBe(0)
  })

  it("no reporta comparación cuando el período anterior no tiene datos", async () => {
    const service = makeService({
      summary: vi.fn().mockResolvedValue({ revenue: 1000, totalOrders: 10, totalItems: 20 }),
    })
    const analyzer = new SalesAnalyzer({ salesService: service as never })
    const result = await analyzer.run(ctx)
    expect(result.observations.some((o) => o.ruleId === "sales.week_comparison")).toBe(false)
    expect(result.observations.some((o) => o.ruleId === "sales.month_comparison")).toBe(false)
  })
})
