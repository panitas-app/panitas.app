import { describe, expect, it, vi } from "vitest"
import { CustomerAnalyzer } from "@/lib/business-intelligence/analyzers/customer-analyzer"
import type { StoreServiceContext } from "@/services/context"

const ctx: StoreServiceContext = { storeId: "store-1", userId: "user-1", plan: "business" }

function makeDeps(overrides: Record<string, unknown> = {}) {
  return {
    customerService: {
      metrics: vi.fn().mockResolvedValue({
        total: 10,
        newThisMonth: 2,
        recurrent: 3,
        inactive: 4,
        inactiveDays: 60,
        averageCustomerValue: 50,
        totalSpent: 500,
      }),
      ...(overrides.customerService || {}),
    },
    salesService: {
      frequentCustomers: vi.fn().mockResolvedValue([
        { customerId: "c1", name: "Juan", orders: 2, total: 100 },
        { customerId: "c2", name: "María", orders: 1, total: 50 },
      ]),
      ...(overrides.salesService || {}),
    },
    orderService: {
      creditOutstanding: vi.fn().mockResolvedValue(3),
      ...(overrides.orderService || {}),
    },
  }
}

describe("CustomerAnalyzer (FASE 4B)", () => {
  it("analiza clientes solo por grupos, nunca por individuo", async () => {
    const deps = makeDeps()
    const analyzer = new CustomerAnalyzer(deps as never)
    const result = await analyzer.run(ctx)

    const ids = result.observations.map((o) => o.ruleId)
    expect(ids).toContain("customers.active")
    expect(ids).toContain("customers.new")
    expect(ids).toContain("customers.outstanding")
    expect(ids).toContain("customers.inactive")

    // Nunca se filtra un cliente individual en las observaciones.
    for (const obs of result.observations) {
      expect(obs.description).not.toContain("Juan")
      expect(obs.description).not.toContain("María")
    }

    const outstanding = result.observations.find((o) => o.ruleId === "customers.outstanding")!
    expect(outstanding.importance).toBe("warning")
    expect(outstanding.title).toBe("3 clientes con saldo pendiente")

    expect(result.data).toEqual({
      totalCustomers: 10,
      newThisMonth: 2,
      activeThisMonth: 2,
      outstandingCustomers: 3,
      inactiveCount: 4,
    })
  })

  it("propaga el storeId del contexto a los servicios", async () => {
    const deps = makeDeps()
    const analyzer = new CustomerAnalyzer(deps as never)
    await analyzer.run(ctx)

    expect(deps.customerService.metrics).toHaveBeenCalledWith(expect.objectContaining({ storeId: "store-1" }), 60)
    expect(deps.salesService.frequentCustomers).toHaveBeenCalledWith(
      expect.objectContaining({ storeId: "store-1" }),
      expect.any(String),
      undefined,
      100
    )
    expect(deps.orderService.creditOutstanding).toHaveBeenCalledWith(expect.objectContaining({ storeId: "store-1" }))
  })

  it("no genera observaciones cuando no hay actividad de clientes", async () => {
    const deps = makeDeps({
      salesService: { frequentCustomers: vi.fn().mockResolvedValue([]) },
      customerService: {
        metrics: vi.fn().mockResolvedValue({ total: 5, newThisMonth: 0, recurrent: 0, inactive: 0, inactiveDays: 60 }),
      },
      orderService: { creditOutstanding: vi.fn().mockResolvedValue(0) },
    })
    const analyzer = new CustomerAnalyzer(deps as never)
    const result = await analyzer.run(ctx)
    expect(result.observations).toHaveLength(0)
  })
})
