import { describe, expect, it, vi, beforeEach } from "vitest"
import { getSalesMetrics } from "@/lib/analytics/sales"
import { getInventoryHealth } from "@/lib/analytics/inventory"
import { getCustomerMetrics } from "@/lib/analytics/customers"

describe("analytics.getSalesMetrics", () => {
  beforeEach(() => vi.clearAllMocks())

  it("devuelve hoy/semana/mes con ticket promedio", async () => {
    const repo = {
      summary: vi.fn().mockResolvedValue({ revenue: 200, totalOrders: 4, totalItems: 8 }),
    }
    const result = await getSalesMetrics("store-1", { repo: repo as never })

    expect(result.today).toEqual({ label: "today", revenue: 200, totalOrders: 4, totalItems: 8, averageTicket: 50 })
    expect(result.week.averageTicket).toBe(50)
    expect(result.month.averageTicket).toBe(50)
    expect(repo.summary).toHaveBeenCalledTimes(3)
  })

  it("averageTicket es 0 cuando no hay pedidos", async () => {
    const repo = { summary: vi.fn().mockResolvedValue({ revenue: 0, totalOrders: 0, totalItems: 0 }) }
    const result = await getSalesMetrics("store-1", { repo: repo as never })
    expect(result.today.averageTicket).toBe(0)
  })
})

describe("analytics.getInventoryHealth", () => {
  beforeEach(() => vi.clearAllMocks())

  it("combina overview, lowStock y noMovement", async () => {
    const repo = {
      overview: vi.fn().mockResolvedValue({ totalProducts: 3, totalStock: 20, totalEntries: 5, totalExits: 2 }),
      lowStock: vi.fn().mockResolvedValue([{ id: "p1", name: "X", stock: 2 }]),
      noMovement: vi.fn().mockResolvedValue([{ id: "p2", name: "Y", stock: 9 }]),
    }
    const result = await getInventoryHealth("store-1", { repo: repo as never, lowStockThreshold: 5, inactiveDays: 30 })

    expect(result.overview.totalProducts).toBe(3)
    expect(result.lowStock).toHaveLength(1)
    expect(result.noMovement).toHaveLength(1)
    expect(repo.overview).toHaveBeenCalledWith("store-1", 5, 30)
    expect(repo.lowStock).toHaveBeenCalledWith("store-1", 5)
    expect(repo.noMovement).toHaveBeenCalledWith("store-1", 30)
  })

  it("usa umbrales por defecto", async () => {
    const repo = {
      overview: vi.fn().mockResolvedValue({}),
      lowStock: vi.fn().mockResolvedValue([]),
      noMovement: vi.fn().mockResolvedValue([]),
    }
    await getInventoryHealth("store-1", { repo: repo as never })
    expect(repo.lowStock).toHaveBeenCalledWith("store-1", 5)
    expect(repo.noMovement).toHaveBeenCalledWith("store-1", 30)
  })
})

describe("analytics.getCustomerMetrics", () => {
  beforeEach(() => vi.clearAllMocks())

  it("delega en el repositorio de clientes", async () => {
    const repo = { metrics: vi.fn().mockResolvedValue({ total: 10, newThisMonth: 2, recurrent: 3, inactive: 4, inactiveDays: 60, averageCustomerValue: 50, totalSpent: 500 }) }
    const result = await getCustomerMetrics("store-1", { repo: repo as never })

    expect(result.total).toBe(10)
    expect(result.averageCustomerValue).toBe(50)
    expect(repo.metrics).toHaveBeenCalledWith("store-1", 60)
  })

  it("acepta días de inactividad personalizados", async () => {
    const repo = { metrics: vi.fn().mockResolvedValue({}) }
    await getCustomerMetrics("store-1", { repo: repo as never, inactiveDays: 90 })
    expect(repo.metrics).toHaveBeenCalledWith("store-1", 90)
  })
})
