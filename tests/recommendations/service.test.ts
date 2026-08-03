import { describe, expect, it, vi } from "vitest"
import { RecommendationService } from "@/lib/recommendations"
import { ServiceError, serviceError } from "@/services/errors"
import type { StoreServiceContext } from "@/services/context"
import type { RecommendationCandidate } from "@/lib/recommendations"
import { recommendationRow } from "./helpers"

const ctx: StoreServiceContext = { storeId: "store-1", userId: "user-1", plan: "business" }

function lowStockCandidate(overrides: Partial<RecommendationCandidate> = {}): RecommendationCandidate {
  return {
    ruleId: "inventory.low_stock",
    category: "INVENTORY",
    priority: "HIGH",
    title: "Productos con inventario bajo",
    description: "Hay productos con stock por debajo del umbral.",
    reason: "Basado en tus datos de inventario.",
    dataSource: "monitor.inventory.low_stock",
    suggestedAction: "Revisa los productos con inventario bajo.",
    dedupeKey: "inventory.low_stock",
    metricValue: 3,
    ...overrides,
  }
}

function makeRepo(overrides: Record<string, unknown> = {}) {
  return {
    findRecentByRule: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockImplementation((data) =>
      Promise.resolve(recommendationRow({ id: "rec-new", ruleId: data.ruleId, createdAt: new Date() }))
    ),
    supersedeActiveByRules: vi.fn().mockResolvedValue({ count: 0 }),
    listActive: vi.fn().mockResolvedValue([]),
    countActive: vi.fn().mockResolvedValue(0),
    findById: vi.fn().mockResolvedValue(null),
    updateStatus: vi.fn().mockResolvedValue({ count: 1 }),
    ...overrides,
  }
}

function makeService(overrides: { repo?: ReturnType<typeof makeRepo>; now?: () => Date } = {}) {
  const repo = overrides.repo ?? makeRepo()
  const engine = { generate: vi.fn().mockResolvedValue([lowStockCandidate()]) }
  const service = new RecommendationService({
    engine: engine as never,
    repo: repo as never,
    now: overrides.now ?? (() => new Date("2026-08-03T12:00:00.000Z")),
  })
  return { repo, engine, service }
}

describe("RecommendationService.refresh (FASE 4D) — anti-spam", () => {
  it("persiste los candidatos nuevos y devuelve la lista activa", async () => {
    const { repo, service } = makeService()

    const result = await service.refresh(ctx)

    expect(repo.findRecentByRule).toHaveBeenCalledWith(
      { storeId: "store-1" },
      "inventory.low_stock",
      expect.any(Date)
    )
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        storeId: "store-1",
        userId: "user-1",
        ruleId: "inventory.low_stock",
        category: "INVENTORY",
        status: "active",
      })
    )
    expect(repo.supersedeActiveByRules).toHaveBeenCalledWith(
      { storeId: "store-1" },
      ["inventory.low_stock"],
      "rec-new",
      expect.any(Date)
    )
    expect(repo.listActive).toHaveBeenCalledWith({ storeId: "store-1" }, 5)
    expect(result).toEqual([])
  })

  it("respeta el cooldown: no recrea una regla con creación reciente", async () => {
    const recent = recommendationRow({ id: "rec-old", ruleId: "inventory.low_stock" })
    const repo = makeRepo({ findRecentByRule: vi.fn().mockResolvedValue(recent) })
    const { service } = makeService({ repo })

    const result = await service.refresh(ctx)

    expect(repo.findRecentByRule).toHaveBeenCalled()
    expect(repo.create).not.toHaveBeenCalled()
    expect(repo.supersedeActiveByRules).not.toHaveBeenCalled()
    expect(result).toEqual([])
  })

  it("calcula el `since` del cooldown con los días de la regla (7 días)", async () => {
    const repo = makeRepo()
    const { service } = makeService({ repo })
    await service.refresh(ctx)

    const since = repo.findRecentByRule.mock.calls[0][2] as Date
    expect(since.toISOString()).toBe("2026-07-27T12:00:00.000Z")
  })
})

describe("RecommendationService.listActive / countActive", () => {
  it("mapea filas a recomendaciones de dominio (fechas ISO + metadata parseada)", async () => {
    const repo = makeRepo({
      listActive: vi.fn().mockResolvedValue([
        recommendationRow({
          id: "r1",
          metadata: '{"metricValue":3}',
          viewedAt: new Date("2026-08-02T10:00:00.000Z"),
        }),
      ]),
    })
    const { service } = makeService({ repo })

    const result = await service.listActive(ctx)

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      id: "r1",
      storeId: "store-1",
      category: "INVENTORY",
      priority: "HIGH",
      status: "active",
      metadata: { metricValue: 3 },
      viewedAt: "2026-08-02T10:00:00.000Z",
    })
    expect(typeof result[0].createdAt).toBe("string")
  })

  it("delega el conteo activo (badge de la UI)", async () => {
    const repo = makeRepo({ countActive: vi.fn().mockResolvedValue(4) })
    const { service } = makeService({ repo })

    await expect(service.countActive(ctx)).resolves.toBe(4)
    expect(repo.countActive).toHaveBeenCalledWith({ storeId: "store-1" })
  })
})

describe("RecommendationService.markStatus", () => {
  it("marca como vista con viewedAt y scope por tienda", async () => {
    const repo = makeRepo({ findById: vi.fn().mockResolvedValue(recommendationRow({ id: "r1" })) })
    const { service } = makeService({ repo })

    const result = await service.markStatus(ctx, "r1", "view")

    expect(repo.findById).toHaveBeenCalledWith("r1", { storeId: "store-1" })
    expect(repo.updateStatus).toHaveBeenCalledWith(
      "r1",
      { storeId: "store-1" },
      { status: "viewed", viewedAt: expect.any(Date) }
    )
    expect(result.status).toBe("viewed")
  })

  it("marca como descartada con dismissedAt", async () => {
    const repo = makeRepo({ findById: vi.fn().mockResolvedValue(recommendationRow({ id: "r1" })) })
    const { service } = makeService({ repo })

    const result = await service.markStatus(ctx, "r1", "dismiss")

    expect(repo.updateStatus).toHaveBeenCalledWith(
      "r1",
      { storeId: "store-1" },
      { status: "dismissed", dismissedAt: expect.any(Date) }
    )
    expect(result.status).toBe("dismissed")
  })

  it("lanza 404 si la recomendación no pertenece a la tienda autenticada", async () => {
    const repo = makeRepo() // findById resuelve null (aislamiento por storeId)
    const { service } = makeService({ repo })

    const error = await service.markStatus(ctx, "otra-store-rec", "view").catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ServiceError)
    expect((error as ServiceError).status).toBe(404)
    expect((error as ServiceError).message).toBe(serviceError("Recomendación no encontrada", 404).message)
    expect(repo.updateStatus).not.toHaveBeenCalled()
  })
})
