import { describe, expect, it, vi } from "vitest"
import { InventoryAnalyzer } from "@/lib/business-intelligence/analyzers/inventory-analyzer"
import type { StoreServiceContext } from "@/services/context"

const ctx: StoreServiceContext = { storeId: "store-1", userId: "user-1", plan: "business" }

function makeService(overrides: Record<string, unknown> = {}) {
  return {
    overview: vi.fn().mockResolvedValue({
      totalProducts: 5,
      lowStockCount: 2,
      lowStockThreshold: 5,
      totalStock: 40,
      totalEntries: 3,
      totalExits: 2,
    }),
    lowStock: vi.fn().mockResolvedValue([
      { id: "p1", name: "Abrazadera", stock: 0 },
      { id: "p2", name: "Tornillo", stock: 3 },
    ]),
    noMovement: vi.fn().mockResolvedValue([{ id: "p3", name: "Viejo", stock: 8 }]),
    bestSellers: vi.fn().mockResolvedValue([{ id: "p2", name: "Tornillo", quantity: 12, stock: 3 }]),
    ...overrides,
  }
}

describe("InventoryAnalyzer (FASE 4B)", () => {
  it("detecta agotados y stock bajo como importantes, sin predicciones", async () => {
    const service = makeService()
    const analyzer = new InventoryAnalyzer({ inventoryService: service as never })
    const result = await analyzer.run(ctx)

    const ids = result.observations.map((o) => o.ruleId)
    expect(ids).toContain("inventory.out_of_stock")
    expect(ids).toContain("inventory.low_stock")
    expect(ids).toContain("inventory.no_movement")
    expect(ids).toContain("inventory.high_rotation")

    const low = result.observations.find((o) => o.ruleId === "inventory.low_stock")!
    expect(low.importance).toBe("important")
    expect(low.title).toBe("1 producto con inventario bajo")
    expect(low.description).toContain("Tornillo")
    expect(low.metricValue).toBe(1)

    const out = result.observations.find((o) => o.ruleId === "inventory.out_of_stock")!
    expect(out.importance).toBe("important")
    expect(out.description).toContain("Abrazadera")
    expect(out.metricValue).toBe(1)

    // Sin predicciones: ningún texto afirma que algo "se agotará".
    for (const obs of result.observations) {
      expect(obs.description).not.toMatch(/se agotar|predecir|en [0-9]+ dias/i)
    }

    expect(result.data).toEqual({ lowStockCount: 2, outOfStockCount: 1, noMovementCount: 1 })
  })

  it("propaga el storeId del contexto a los servicios", async () => {
    const service = makeService()
    const analyzer = new InventoryAnalyzer({ inventoryService: service as never })
    await analyzer.run(ctx)

    expect(service.overview).toHaveBeenCalledWith(
      expect.objectContaining({ storeId: "store-1" }),
      expect.objectContaining({ lowStockThreshold: 5, windowDays: 30 })
    )
    expect(service.lowStock).toHaveBeenCalledWith(expect.objectContaining({ storeId: "store-1" }), 5, 50)
    expect(service.noMovement).toHaveBeenCalledWith(expect.objectContaining({ storeId: "store-1" }), 30, 50)
    expect(service.bestSellers).toHaveBeenCalledWith(
      expect.objectContaining({ storeId: "store-1" }),
      expect.any(String),
      undefined,
      5
    )
  })

  it("no genera observaciones cuando no hay hallazgos", async () => {
    const service = makeService({
      lowStock: vi.fn().mockResolvedValue([]),
      noMovement: vi.fn().mockResolvedValue([]),
      bestSellers: vi.fn().mockResolvedValue([]),
    })
    const analyzer = new InventoryAnalyzer({ inventoryService: service as never })
    const result = await analyzer.run(ctx)
    expect(result.observations).toHaveLength(0)
  })
})
