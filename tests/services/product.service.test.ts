import { describe, expect, it, vi, beforeEach } from "vitest"
import { ProductService } from "@/services/product.service"

vi.mock("@/lib/audit", () => ({
  createAuditEntry: vi.fn(),
}))

import { createAuditEntry } from "@/lib/audit"
import { ServiceError } from "@/services/errors"

const ctx = { storeId: "store-1", userId: "user-1", plan: "free" }

function makeRepo(overrides: Record<string, unknown> = {}) {
  return {
    list: vi.fn().mockResolvedValue({ products: [], total: 0 }),
    countByStore: vi.fn().mockResolvedValue(0),
    findByIdWithCategory: vi.fn().mockResolvedValue({ id: "p1", storeId: "store-1", category: null }),
    findById: vi.fn().mockResolvedValue({ id: "p1", storeId: "store-1", name: "Producto" }),
    create: vi.fn().mockResolvedValue({ id: "p1", storeId: "store-1" }),
    update: vi.fn().mockResolvedValue({ id: "p1" }),
    delete: vi.fn().mockResolvedValue({ id: "p1" }),
    deleteDigitalProduct: vi.fn().mockResolvedValue({ count: 0 }),
    upsertDigitalProduct: vi.fn().mockResolvedValue({ id: "dp1" }),
    ...overrides,
  }
}

describe("ProductService.create", () => {
  beforeEach(() => vi.clearAllMocks())

  it("rejects missing name with 400", async () => {
    const service = new ProductService(makeRepo() as never)
    await expect(service.create(ctx, { price: 10 })).rejects.toMatchObject({
      message: "Nombre inválido o demasiado largo",
      status: 400,
    })
  })

  it("rejects invalid price with 400", async () => {
    const service = new ProductService(makeRepo() as never)
    await expect(service.create(ctx, { name: "Zapatos", price: -5 })).rejects.toMatchObject({
      message: "Precio inválido",
      status: 400,
    })
  })

  it("rejects invalid images with 400", async () => {
    const service = new ProductService(makeRepo() as never)
    await expect(
      service.create(ctx, { name: "Zapatos", price: 10, images: ["not-a-url"] })
    ).rejects.toMatchObject({ message: "Imágenes inválidas", status: 400 })
  })

  it("rejects when plan limit is reached with 403", async () => {
    const service = new ProductService(makeRepo({ countByStore: vi.fn().mockResolvedValue(30) }) as never)
    await expect(service.create(ctx, { name: "Zapatos", price: 10 })).rejects.toMatchObject({
      status: 403,
    })
    await expect(service.create(ctx, { name: "Zapatos", price: 10 })).rejects.toThrow(/límite de 30 productos/)
  })

  it("creates product with audit and normalized fields", async () => {
    const repo = makeRepo()
    const service = new ProductService(repo as never)
    const result = await service.create(ctx, { name: "Zapatos", price: 25, stock: 4 })

    expect(repo.create).toHaveBeenCalledTimes(1)
    const createArgs = repo.create.mock.calls[0][0]
    expect(createArgs.storeId).toBe("store-1")
    expect(createArgs.name).toBe("Zapatos")
    expect(createArgs.stock).toBe(4)
    expect(createArgs.images).toBe("[]")
    expect(result).toEqual({ id: "p1", storeId: "store-1", category: null })
    expect(createAuditEntry).toHaveBeenCalledWith(
      expect.objectContaining({ action: "product.created", entityId: "p1" })
    )
  })
})

describe("ProductService.getById", () => {
  it("returns 404 when product not found", async () => {
    const repo = makeRepo({ findByIdWithCategory: vi.fn().mockResolvedValue(null) })
    const service = new ProductService(repo as never)
    await expect(service.getById(ctx, "missing")).rejects.toMatchObject({
      message: "Not found",
      status: 404,
    })
  })

  it("returns 403 when product belongs to another store", async () => {
    const repo = makeRepo({
      findByIdWithCategory: vi.fn().mockResolvedValue({ id: "p1", storeId: "store-otra" }),
    })
    const service = new ProductService(repo as never)
    await expect(service.getById(ctx, "p1")).rejects.toMatchObject({
      message: "Unauthorized",
      status: 403,
    })
  })
})

describe("ProductService.update", () => {
  it("rejects invalid price with 400", async () => {
    const service = new ProductService(makeRepo() as never)
    await expect(service.update(ctx, "p1", { price: "abc" })).rejects.toBeInstanceOf(ServiceError)
    await expect(service.update(ctx, "p1", { price: "abc" })).rejects.toMatchObject({
      message: "Precio inválido",
      status: 400,
    })
  })

  it("returns 404 when product does not exist", async () => {
    const repo = makeRepo({ findById: vi.fn().mockResolvedValue(null) })
    const service = new ProductService(repo as never)
    await expect(service.update(ctx, "missing", { name: "Nuevo" })).rejects.toMatchObject({
      message: "Not found",
      status: 404,
    })
  })
})

describe("ProductService.remove", () => {
  it("deletes and audits", async () => {
    const repo = makeRepo()
    const service = new ProductService(repo as never)
    const result = await service.remove(ctx, "p1")
    expect(repo.delete).toHaveBeenCalledWith("p1")
    expect(createAuditEntry).toHaveBeenCalledWith(
      expect.objectContaining({ action: "product.deleted", entityId: "p1" })
    )
    expect(result).toEqual({ success: true })
  })
})
