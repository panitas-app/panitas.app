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

const ctx = { storeId: "store-1", userId: "user-1", plan: "free", storeName: "Mi Tienda", storeEmail: null }

const baseProduct = {
  id: "p1",
  stock: 10,
  name: "Producto A",
  price: 25,
  costPrice: 10,
  isWholesale: false,
  wholesalePrice: null,
  wholesaleScales: null,
}

function makeDeps(overrides: Record<string, unknown> = {}) {
  const orderRecord = {
    id: "o1",
    orderNumber: "ORD-1001",
    storeId: "store-1",
    customerEmail: null,
    total: 0,
  }
  const repo = {
    findStoreById: vi.fn().mockResolvedValue(null),
    findCouponById: vi.fn().mockResolvedValue(null),
    findLatestBcvRate: vi.fn().mockResolvedValue(null),
    findSellerById: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockImplementation((data) => ({ ...orderRecord, ...data })),
    createItem: vi.fn().mockResolvedValue({}),
    createPayment: vi.fn().mockResolvedValue({}),
    createInstallment: vi.fn().mockResolvedValue({}),
    decrementStock: vi.fn().mockImplementation((id: string, qty: number) =>
      Promise.resolve({ id, name: "Producto A", stock: 10 - qty })
    ),
    recordStockMovement: vi.fn().mockResolvedValue({}),
    createSellerCommission: vi.fn().mockResolvedValue({}),
    updateCouponUsedCount: vi.fn().mockResolvedValue({}),
    findById: vi.fn().mockImplementation((id: string) => Promise.resolve({ ...orderRecord, id })),
    ...(overrides.repo || {}),
  }
  const productRepo = {
    findByIds: vi.fn().mockResolvedValue([baseProduct]),
    ...(overrides.productRepo || {}),
  }
  const customerService = {
    findOrCreateByPhone: vi.fn().mockResolvedValue({ customer: { id: "c1", name: "Juan" }, created: true }),
    updateTotals: vi.fn().mockResolvedValue({}),
    ...(overrides.customerService || {}),
  }
  return { repo, productRepo, customerService }
}

function serviceWith(deps: ReturnType<typeof makeDeps>) {
  return new OrderService(deps.repo as never, deps.productRepo as never, deps.customerService as never)
}

describe("OrderService.create", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("rejects unknown storeId with 404", async () => {
    const deps = makeDeps({ repo: { findStoreById: vi.fn().mockResolvedValue(null) } })
    const service = serviceWith(deps)
    await expect(
      service.create(ctx, { storeId: "s-other", items: [{ productId: "p1", quantity: 1 }] })
    ).rejects.toMatchObject({ message: "Tienda no encontrada", status: 404 })
  })

  it("rejects missing products with 400", async () => {
    const deps = makeDeps({ productRepo: { findByIds: vi.fn().mockResolvedValue([]) } })
    const service = serviceWith(deps)
    await expect(
      service.create(ctx, { items: [{ productId: "p2", quantity: 1 }] })
    ).rejects.toMatchObject({ message: "Productos no encontrados: p2", status: 400 })
  })

  it("rejects insufficient stock with 400", async () => {
    const deps = makeDeps({
      productRepo: { findByIds: vi.fn().mockResolvedValue([{ ...baseProduct, stock: 1 }]) },
    })
    const service = serviceWith(deps)
    await expect(
      service.create(ctx, { items: [{ productId: "p1", quantity: 5 }] })
    ).rejects.toMatchObject({ message: /Stock insuficiente/, status: 400 })
  })

  it("creates a POS order with server-validated prices", async () => {
    const deps = makeDeps()
    const service = serviceWith(deps)
    const order = await service.create(ctx, {
      source: "pos",
      items: [{ productId: "p1", quantity: 2, price: 20 }],
      customerPhone: "04121234567",
      customerName: "Juan",
      payments: [{ method: "cash", amount: 40, status: "verified" }],
    })

    const createData = deps.repo.create.mock.calls[0][0]
    expect(createData.storeId).toBe("store-1")
    expect(createData.posPin).toBe(true)
    expect(createData.subtotal).toBe(40)
    expect(createData.total).toBe(40)
    expect(createData.paymentStatus).toBe("paid")

    expect(deps.customerService.findOrCreateByPhone).toHaveBeenCalledWith(
      expect.objectContaining({ storeId: "store-1" }),
      expect.objectContaining({ phone: "04121234567", name: "Juan" })
    )
    expect(deps.customerService.updateTotals).toHaveBeenCalledWith(expect.anything(), "c1", 40, 1)

    expect(deps.repo.createItem).toHaveBeenCalledTimes(1)
    expect(deps.repo.decrementStock).toHaveBeenCalledWith("p1", 2)
    expect(deps.repo.recordStockMovement).toHaveBeenCalledWith(
      expect.objectContaining({ type: "sale", quantity: -2, balance: 8, reference: "o1" })
    )
    expect(createAuditEntry).toHaveBeenCalledWith(expect.objectContaining({ action: "order.created" }))
    expect(eventService.emit).toHaveBeenCalledWith("sale.created", expect.objectContaining({ orderId: "o1", total: 40 }))
    expect(order).toHaveProperty("id", "o1")
  })

  it("wires customer lookup when a phone is provided", async () => {
    const deps = makeDeps()
    const service = serviceWith(deps)
    await service.create(ctx, { items: [{ productId: "p1", quantity: 1 }], customerPhone: "04120001111" })
    expect(deps.customerService.findOrCreateByPhone).toHaveBeenCalledWith(
      expect.objectContaining({ storeId: "store-1" }),
      expect.objectContaining({ phone: "04120001111" })
    )
    expect(deps.customerService.updateTotals).toHaveBeenCalledTimes(1)
  })

  it("does not decrement stock twice", async () => {
    const deps = makeDeps()
    const service = serviceWith(deps)
    await service.create(ctx, { items: [{ productId: "p1", quantity: 1 }] })
    expect(deps.repo.decrementStock).toHaveBeenCalledTimes(1)
    expect(deps.repo.recordStockMovement).toHaveBeenCalledTimes(1)
  })
})
