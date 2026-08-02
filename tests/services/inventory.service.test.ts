import { describe, expect, it, vi, beforeEach } from "vitest"
import { InventoryService } from "@/services/inventory.service"

vi.mock("@/lib/audit", () => ({
  createAuditEntry: vi.fn(),
}))

import { createAuditEntry } from "@/lib/audit"

const ctx = { storeId: "store-1", userId: "user-1" }

function makeRepo(overrides: Record<string, unknown> = {}) {
  return {
    listMovements: vi.fn().mockResolvedValue({ movements: [], total: 0 }),
    findProductById: vi.fn().mockResolvedValue({ id: "p1", storeId: "store-1", name: "X", stock: 10 }),
    recordMovement: vi.fn().mockResolvedValue({ id: "m1", balance: 0 }),
    updateStock: vi.fn().mockResolvedValue({ id: "p1", stock: 0 }),
    ...overrides,
  }
}

describe("InventoryService.applyMovement", () => {
  beforeEach(() => vi.clearAllMocks())

  it("rejects invalid type with 400", async () => {
    const service = new InventoryService(makeRepo() as never)
    await expect(
      service.applyMovement(ctx, { productId: "p1", quantity: 2, type: "bogus" })
    ).rejects.toMatchObject({ message: "Tipo inválido", status: 400 })
  })

  it("rejects missing productId with 400", async () => {
    const service = new InventoryService(makeRepo() as never)
    await expect(service.applyMovement(ctx, { quantity: 2, type: "increase" })).rejects.toMatchObject({
      message: "Producto requerido",
      status: 400,
    })
  })

  it("rejects product not in store with 404", async () => {
    const repo = makeRepo({
      findProductById: vi.fn().mockResolvedValue({ id: "p1", storeId: "store-otra", stock: 10 }),
    })
    const service = new InventoryService(repo as never)
    await expect(
      service.applyMovement(ctx, { productId: "p1", quantity: 2, type: "increase" })
    ).rejects.toMatchObject({ message: "Producto no encontrado", status: 404 })
  })

  it("rejects decrease beyond available stock with 400", async () => {
    const service = new InventoryService(makeRepo() as never)
    await expect(
      service.applyMovement(ctx, { productId: "p1", quantity: 99, type: "decrease" })
    ).rejects.toMatchObject({ message: "Stock insuficiente", status: 400 })
  })

  it("records increase movement with positive quantity and audits", async () => {
    const repo = makeRepo()
    const service = new InventoryService(repo as never)
    await service.applyMovement(ctx, { productId: "p1", quantity: 5, type: "increase", concept: "Compra" })

    expect(repo.recordMovement).toHaveBeenCalledWith(
      expect.objectContaining({ type: "increase", quantity: 5, balance: 15, concept: "Compra", storeId: "store-1" })
    )
    expect(repo.updateStock).toHaveBeenCalledWith("p1", 15, "set")
    expect(createAuditEntry).toHaveBeenCalledWith(expect.objectContaining({ action: "stock.increase" }))
  })

  it("records decrease movement with negative quantity", async () => {
    const repo = makeRepo()
    const service = new InventoryService(repo as never)
    await service.applyMovement(ctx, { productId: "p1", quantity: 3, type: "decrease" })

    expect(repo.recordMovement).toHaveBeenCalledWith(expect.objectContaining({ quantity: -3, balance: 7 }))
  })
})
