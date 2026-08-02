import { describe, expect, it, vi, beforeEach } from "vitest"
import { CustomerService } from "@/services/customer.service"

vi.mock("@/events/event.service", () => ({
  eventService: { emit: vi.fn() },
}))

import { eventService } from "@/events/event.service"

const ctx = { storeId: "store-1", userId: "user-1" }

function makeRepo(overrides: Record<string, unknown> = {}) {
  return {
    findByStorePhone: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue({ id: "c1", storeId: "store-1", name: "Cliente A", phone: "123" }),
    updateLastPurchase: vi.fn().mockResolvedValue({ id: "c1" }),
    findById: vi.fn().mockResolvedValue({ id: "c1", storeId: "store-1", name: "Cliente A", phone: "123", totalSpent: 0, totalOrders: 0, lastPurchaseAt: null }),
    updateTotals: vi.fn().mockResolvedValue({ id: "c1", totalSpent: 100, totalOrders: 1 }),
    metrics: vi.fn().mockResolvedValue({ total: 1, newThisMonth: 1, recurrent: 0, inactive: 0, inactiveDays: 60, averageCustomerValue: 100, totalSpent: 100 }),
    ordersByCustomer: vi.fn().mockResolvedValue([]),
    ...overrides,
  }
}

describe("CustomerService.findOrCreateByPhone", () => {
  beforeEach(() => vi.clearAllMocks())

  it("crea cliente nuevo y emite customer.created", async () => {
    const repo = makeRepo()
    const service = new CustomerService(repo as never)
    const result = await service.findOrCreateByPhone(ctx, { phone: "123" })

    expect(result.created).toBe(true)
    expect(result.customer.name).toBe("Cliente A")
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ storeId: "store-1", phone: "123", totalSpent: 0 }))
    expect(eventService.emit).toHaveBeenCalledWith("customer.created", expect.objectContaining({ customerId: "c1", storeId: "store-1" }))
  })

  it("reutiliza cliente existente sin crear ni emitir", async () => {
    const repo = makeRepo({ findByStorePhone: vi.fn().mockResolvedValue({ id: "c1", name: "Cliente A" }) })
    const service = new CustomerService(repo as never)
    const result = await service.findOrCreateByPhone(ctx, { phone: "123" })

    expect(result.created).toBe(false)
    expect(repo.create).not.toHaveBeenCalled()
    expect(repo.updateLastPurchase).toHaveBeenCalledWith("c1")
    expect(eventService.emit).not.toHaveBeenCalled()
  })
})

describe("CustomerService.updateTotals", () => {
  beforeEach(() => vi.clearAllMocks())

  it("emite customer.updated con los totales actualizados", async () => {
    const repo = makeRepo()
    const service = new CustomerService(repo as never)
    const updated = await service.updateTotals(ctx, "c1", 100, 1)

    expect(updated.totalSpent).toBe(100)
    expect(repo.updateTotals).toHaveBeenCalledWith("c1", 100, 1)
    expect(eventService.emit).toHaveBeenCalledWith("customer.updated", expect.objectContaining({ customerId: "c1", name: "Cliente A", totalSpent: 100, totalOrders: 1 }))
  })

  it("rechaza cliente de otra tienda con 403", async () => {
    const repo = makeRepo({ findById: vi.fn().mockResolvedValue({ id: "c1", storeId: "store-otra", name: "X" }) })
    const service = new CustomerService(repo as never)
    await expect(service.updateTotals(ctx, "c1", 10, 1)).rejects.toMatchObject({ status: 403 })
  })
})

describe("CustomerService.metrics y getHistory", () => {
  beforeEach(() => vi.clearAllMocks())

  it("delega en el repositorio de métricas", async () => {
    const repo = makeRepo()
    const service = new CustomerService(repo as never)
    const metrics = await service.metrics(ctx)

    expect(metrics.total).toBe(1)
    expect(repo.metrics).toHaveBeenCalledWith("store-1", 60)
  })

  it("getHistory devuelve cliente + pedidos", async () => {
    const repo = makeRepo()
    const service = new CustomerService(repo as never)
    const history = await service.getHistory(ctx, "c1")

    expect(history.customer.id).toBe("c1")
    expect(history.orders).toEqual([])
    expect(repo.ordersByCustomer).toHaveBeenCalledWith("store-1", "c1", 20)
  })

  it("getHistory rechaza cliente inexistente con 404", async () => {
    const repo = makeRepo({ findById: vi.fn().mockResolvedValue(null) })
    const service = new CustomerService(repo as never)
    await expect(service.getHistory(ctx, "nope")).rejects.toMatchObject({ status: 404 })
  })
})
