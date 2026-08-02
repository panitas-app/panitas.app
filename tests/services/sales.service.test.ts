import { describe, expect, it, vi, beforeEach } from "vitest"
import { SalesService } from "@/services/sales.service"

const ctx = { storeId: "store-1", userId: "user-1" }

function makeRepo(overrides: Record<string, unknown> = {}) {
  return {
    summary: vi.fn().mockResolvedValue({ revenue: 100, totalOrders: 2, totalItems: 5 }),
    recent: vi.fn().mockResolvedValue([]),
    topProducts: vi.fn().mockResolvedValue([{ productId: "p1", _sum: { quantity: 3 } }]),
    productsByIds: vi.fn().mockResolvedValue([{ id: "p1", name: "Producto A" }]),
    frequentCustomers: vi.fn().mockResolvedValue([{ customerId: "c1", _count: { _all: 2 }, _sum: { total: 100 } }]),
    customersByIds: vi.fn().mockResolvedValue([{ id: "c1", name: "Cliente A", phone: "123" }]),
    ...overrides,
  }
}

describe("SalesService.dailySummary", () => {
  beforeEach(() => vi.clearAllMocks())

  it("agrega períodos hoy/semana/mes con ticket promedio", async () => {
    const repo = makeRepo()
    const service = new SalesService(repo as never)
    const result = await service.dailySummary(ctx)

    expect(result.today).toEqual({ revenue: 100, totalOrders: 2, totalItems: 5, averageTicket: 50 })
    expect(result.week.revenue).toBe(100)
    expect(result.month.revenue).toBe(100)
    expect(result.averageTicket).toBe(50)
    expect(repo.summary).toHaveBeenCalledTimes(3)
  })

  it("resuelve nombres de top products y clientes frecuentes", async () => {
    const repo = makeRepo()
    const service = new SalesService(repo as never)
    const result = await service.dailySummary(ctx)

    expect(result.topProducts).toEqual([{ productId: "p1", name: "Producto A", quantity: 3 }])
    expect(result.frequentCustomers).toEqual([{ customerId: "c1", name: "Cliente A", orders: 2, total: 100 }])
    expect(repo.productsByIds).toHaveBeenCalledWith(["p1"])
    expect(repo.customersByIds).toHaveBeenCalledWith(["c1"])
  })
})

describe("SalesService.métodos individuales", () => {
  beforeEach(() => vi.clearAllMocks())

  it("productsSold devuelve ranking con nombre resuelto", async () => {
    const repo = makeRepo()
    const service = new SalesService(repo as never)
    const result = await service.productsSold(ctx, "2026-01-01", "2026-01-31")

    expect(result).toEqual([{ productId: "p1", name: "Producto A", quantity: 3 }])
    expect(repo.topProducts).toHaveBeenCalledWith("store-1", expect.any(Date), expect.any(Date), 10)
  })

  it("productsSold no consulta nombres si no hay filas", async () => {
    const repo = makeRepo({ topProducts: vi.fn().mockResolvedValue([]) })
    const service = new SalesService(repo as never)
    const result = await service.productsSold(ctx)

    expect(result).toEqual([])
    expect(repo.productsByIds).not.toHaveBeenCalled()
  })

  it("averageTicket es 0 sin pedidos", async () => {
    const repo = makeRepo({ summary: vi.fn().mockResolvedValue({ revenue: 0, totalOrders: 0, totalItems: 0 }) })
    const service = new SalesService(repo as never)
    await expect(service.averageTicket(ctx)).resolves.toBe(0)
  })
})
