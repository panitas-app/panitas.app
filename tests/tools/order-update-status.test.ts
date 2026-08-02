import { describe, expect, it, vi, beforeEach } from "vitest"
import { OrderService } from "@/services/order.service"

vi.mock("@/lib/audit", () => ({
  createAuditEntry: vi.fn(),
}))

vi.mock("@/events/event.service", () => {
  const emit = vi.fn()
  const emitAsync = vi.fn().mockResolvedValue(undefined)
  return {
    EventService: class {
      on = vi.fn()
      emit = emit
      emitAsync = emitAsync
      clear = vi.fn()
    },
    eventService: { emit, emitAsync, on: vi.fn(), clear: vi.fn() },
  }
})

import { eventService } from "@/events/event.service"
import { createAuditEntry } from "@/lib/audit"

const ctx = { storeId: "store-1", userId: "user-1", plan: "free" }

function makeOrder(overrides: Record<string, unknown> = {}) {
  return {
    id: "o1",
    orderNumber: "ORD-1001",
    storeId: "store-1",
    status: "pending",
    total: 120,
    customerId: "c1",
    items: [
      { productId: "p1", quantity: 3 },
      { productId: "p2", quantity: 1 },
    ],
    ...overrides,
  }
}

function makeDeps(overrides: Record<string, unknown> = {}) {
  const order = makeOrder()
  const repo = {
    findById: vi.fn().mockResolvedValue(order),
    updateStatus: vi.fn().mockResolvedValue({ ...order, status: "confirmed" }),
    incrementStock: vi.fn().mockImplementation((id: string, qty: number) =>
      Promise.resolve({ id, stock: qty })
    ),
    recordStockMovement: vi.fn().mockResolvedValue({}),
    ...(overrides.repo || {}),
  }
  const productRepo = {}
  const customerService = {
    updateTotals: vi.fn().mockResolvedValue({}),
    ...(overrides.customerService || {}),
  }
  return { repo, productRepo, customerService }
}

function serviceWith(deps: ReturnType<typeof makeDeps>) {
  return new OrderService(deps.repo as never, deps.productRepo as never, deps.customerService as never)
}

describe("OrderService.updateStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("rejects an invalid status with 400", async () => {
    const deps = makeDeps()
    const service = serviceWith(deps)
    await expect(service.updateStatus(ctx, "o1", "flying")).rejects.toMatchObject({
      message: /Estado inválido/,
      status: 400,
    })
    expect(deps.repo.updateStatus).not.toHaveBeenCalled()
  })

  it("rejects an order from another store with 403", async () => {
    const deps = makeDeps({ repo: { findById: vi.fn().mockResolvedValue(makeOrder({ storeId: "store-2" })) } })
    const service = serviceWith(deps)
    await expect(service.updateStatus(ctx, "o1", "confirmed")).rejects.toMatchObject({
      message: "No autorizado",
      status: 403,
    })
  })

  it("returns the order unchanged when status is the same", async () => {
    const deps = makeDeps()
    const service = serviceWith(deps)
    const result = await service.updateStatus(ctx, "o1", "pending")
    expect(result).toBeDefined()
    expect(deps.repo.updateStatus).not.toHaveBeenCalled()
  })

  it("updates the status, audits and returns the updated order", async () => {
    const deps = makeDeps()
    const service = serviceWith(deps)
    await service.updateStatus(ctx, "o1", "shipped")

    expect(deps.repo.updateStatus).toHaveBeenCalledWith("o1", "shipped")
    expect(createAuditEntry).toHaveBeenCalledWith(
      expect.objectContaining({ action: "order.status_changed", metadata: { oldStatus: "pending", newStatus: "shipped" } })
    )
    expect(deps.repo.findById).toHaveBeenCalledTimes(2)
  })

  it("restores stock and reverses customer totals when cancelling", async () => {
    const deps = makeDeps()
    const service = serviceWith(deps)
    await service.updateStatus(ctx, "o1", "cancelled")

    expect(deps.repo.incrementStock).toHaveBeenCalledWith("p1", 3)
    expect(deps.repo.incrementStock).toHaveBeenCalledWith("p2", 1)
    expect(deps.repo.recordStockMovement).toHaveBeenCalledWith(
      expect.objectContaining({ type: "return", quantity: 3, productId: "p1", reference: "o1" })
    )
    expect(deps.customerService.updateTotals).toHaveBeenCalledWith(expect.anything(), "c1", -120, -1)

    expect(deps.repo.updateStatus).toHaveBeenCalledWith("o1", "cancelled")
    expect(eventService.emit).toHaveBeenCalledWith("sale.cancelled", expect.objectContaining({ orderId: "o1" }))
    expect(eventService.emit).toHaveBeenCalledWith("order.cancelled", expect.objectContaining({ orderId: "o1" }))
  })

  it("does not double-restore when cancelling an already cancelled order", async () => {
    const deps = makeDeps({ repo: { findById: vi.fn().mockResolvedValue(makeOrder({ status: "cancelled" })) } })
    const service = serviceWith(deps)
    await service.updateStatus(ctx, "o1", "cancelled")
    expect(deps.repo.incrementStock).not.toHaveBeenCalled()
    expect(deps.customerService.updateTotals).not.toHaveBeenCalled()
    expect(deps.repo.updateStatus).not.toHaveBeenCalled()
  })
})
