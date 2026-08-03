import { describe, expect, it, vi } from "vitest"
import { OrderAnalyzer } from "@/lib/business-intelligence/analyzers/order-analyzer"
import type { StoreServiceContext } from "@/services/context"

const ctx: StoreServiceContext = { storeId: "store-1", userId: "user-1", plan: "business" }

function daysAgo(days: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d
}

function makeService(overrides: Record<string, unknown> = {}) {
  return {
    getPending: vi.fn().mockResolvedValue([
      { id: "o1", status: "pending", createdAt: new Date() },
      { id: "o2", status: "pending", createdAt: daysAgo(10) },
    ]),
    list: vi.fn().mockResolvedValue({
      orders: [{ id: "o3", status: "confirmed", createdAt: daysAgo(10) }],
      total: 1,
    }),
    ...overrides,
  }
}

describe("OrderAnalyzer (FASE 4B)", () => {
  it("detecta pedidos pendientes (importante) y con posible demora (warning)", async () => {
    const service = makeService()
    const analyzer = new OrderAnalyzer({ orderService: service as never })
    const result = await analyzer.run(ctx)

    const pending = result.observations.find((o) => o.ruleId === "orders.pending")!
    expect(pending.importance).toBe("important")
    expect(pending.title).toBe("2 pedidos pendientes de atender")
    expect(pending.description).toContain("1 de ellos llevan más de 3 días")

    const delayed = result.observations.find((o) => o.ruleId === "orders.delayed")!
    expect(delayed.importance).toBe("warning")
    expect(delayed.metricValue).toBe(2)

    expect(result.data).toEqual({ pendingCount: 2, delayedCount: 2 })
  })

  it("propaga el storeId del contexto a los servicios", async () => {
    const service = makeService()
    const analyzer = new OrderAnalyzer({ orderService: service as never })
    await analyzer.run(ctx)

    expect(service.getPending).toHaveBeenCalledWith(expect.objectContaining({ storeId: "store-1" }), 50)
    expect(service.list).toHaveBeenCalledWith(
      expect.objectContaining({ storeId: "store-1" }),
      expect.objectContaining({ status: "confirmed", take: 50 })
    )
  })

  it("no genera observaciones cuando no hay pedidos", async () => {
    const service = makeService({
      getPending: vi.fn().mockResolvedValue([]),
      list: vi.fn().mockResolvedValue({ orders: [], total: 0 }),
    })
    const analyzer = new OrderAnalyzer({ orderService: service as never })
    const result = await analyzer.run(ctx)
    expect(result.observations).toHaveLength(0)
    expect(result.data).toEqual({ pendingCount: 0, delayedCount: 0 })
  })
})
