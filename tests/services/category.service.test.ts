import { describe, expect, it, vi, beforeEach } from "vitest"
import { Prisma } from "@prisma/client"
import { CategoryService } from "@/services/category.service"

const ctx = { storeId: "store-1", userId: "user-1", plan: "business" }

function makeRepo(overrides: Record<string, unknown> = {}) {
  return {
    findById: vi.fn().mockResolvedValue(null),
    findBySlug: vi.fn().mockResolvedValue(null),
    list: vi.fn().mockResolvedValue([]),
    create: vi.fn().mockResolvedValue({ id: "cat-1", name: "Bebidas", slug: "bebidas" }),
    ...overrides,
  }
}

function p2002() {
  return new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
    code: "P2002",
    clientVersion: "5.0.0",
  })
}

describe("CategoryService.create", () => {
  beforeEach(() => vi.clearAllMocks())

  it("rejects missing name with 400", async () => {
    const service = new CategoryService(makeRepo() as never)
    await expect(service.create(ctx, {})).rejects.toMatchObject({
      message: "El nombre de la categoría es obligatorio",
      status: 400,
    })
    await expect(service.create(ctx, { name: "  " })).rejects.toMatchObject({ status: 400 })
  })

  it("rejects a name without a valid slug", async () => {
    const service = new CategoryService(makeRepo() as never)
    await expect(service.create(ctx, { name: "!!!" })).rejects.toMatchObject({ status: 400 })
  })

  it("returns the existing category when the slug already exists (idempotente)", async () => {
    const existing = { id: "cat-1", name: "Bebidas", slug: "bebidas" }
    const repo = makeRepo({ findBySlug: vi.fn().mockResolvedValue(existing) })
    const service = new CategoryService(repo as never)
    const result = await service.create(ctx, { name: "Bebidas" })

    expect(result).toBe(existing)
    expect(repo.create).not.toHaveBeenCalled()
  })

  it("creates the category scoped to the store", async () => {
    const repo = makeRepo()
    const service = new CategoryService(repo as never)
    const result = await service.create(ctx, { name: "Bebidas" })

    expect(repo.create).toHaveBeenCalledWith({ storeId: "store-1", name: "Bebidas", slug: "bebidas" })
    expect(result).toMatchObject({ id: "cat-1" })
  })

  it("recovers from a unique race (P2002) returning the existing category", async () => {
    const dup = { id: "cat-9", name: "Bebidas", slug: "bebidas" }
    const repo = makeRepo({
      create: vi.fn().mockRejectedValue(p2002()),
      findBySlug: vi.fn().mockResolvedValueOnce(null).mockResolvedValueOnce(dup),
    })
    const service = new CategoryService(repo as never)
    const result = await service.create(ctx, { name: "Bebidas" })

    expect(result).toBe(dup)
  })
})

describe("CategoryService", () => {
  beforeEach(() => vi.clearAllMocks())

  it("lists categories of the store", async () => {
    const categories = [{ id: "cat-1", name: "Bebidas" }]
    const repo = makeRepo({ list: vi.fn().mockResolvedValue(categories) })
    const service = new CategoryService(repo as never)
    const result = await service.list(ctx)

    expect(repo.list).toHaveBeenCalledWith("store-1")
    expect(result).toEqual(categories)
  })

  it("belongsToStore es true solo si la categoría existe en el negocio", async () => {
    const repo = makeRepo({ findById: vi.fn().mockResolvedValue({ id: "cat-1" }) })
    const service = new CategoryService(repo as never)

    expect(await service.belongsToStore(ctx, "cat-1")).toBe(true)
    expect(repo.findById).toHaveBeenCalledWith("store-1", "cat-1")
  })

  it("belongsToStore es false para categorías de otro negocio o inexistentes", async () => {
    const repo = makeRepo({ findById: vi.fn().mockResolvedValue(null) })
    const service = new CategoryService(repo as never)
    expect(await service.belongsToStore(ctx, "cat-999")).toBe(false)
  })
})
