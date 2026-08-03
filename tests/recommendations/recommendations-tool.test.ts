import { describe, expect, it, vi } from "vitest"
import { createRecommendationsTools } from "@/lib/agent/tools/domains/recommendations"
import { createRecommendationService } from "@/lib/recommendations"
import type { ToolExecutionContext } from "@/lib/agent/tools/types"
import type { RecommendationService } from "@/lib/recommendations"

const ctx: ToolExecutionContext = {
  userId: "u1",
  storeId: "s1",
  negocioId: null,
  plan: "business",
  role: "admin",
  permissions: ["report.read"],
}

function fakeService() {
  return {
    refresh: vi.fn().mockResolvedValue([
      {
        id: "rec-1",
        storeId: "s1",
        ruleId: "orders.pending",
        category: "OPERATIONS",
        priority: "HIGH",
        status: "active",
        title: "Pedidos pendientes",
        description: "Hay pedidos por atender.",
        reason: "Basado en tus pedidos pendientes.",
        dataSource: "monitor.orders.pending",
        suggestedAction: "Atiende los pedidos pendientes.",
        entityId: null,
        metadata: {},
        createdAt: "2026-08-03T12:00:00.000Z",
        viewedAt: null,
        dismissedAt: null,
      },
    ]),
  }
}

function listTool(service: ReturnType<typeof fakeService>) {
  const tool = createRecommendationsTools({ recommendationService: service as unknown as RecommendationService }).find(
    (t) => t.name === "recommendations.list"
  )
  if (!tool) throw new Error("recommendations.list no está registrada")
  return tool
}

describe("Tool recommendations.list (FASE 4D)", () => {
  it("está registrada en el array de tools de recomendaciones", () => {
    const names = createRecommendationsTools().map((t) => t.name)
    expect(names).toContain("recommendations.list")
  })

  it("declara permisos de solo lectura y schema sin storeId (aislamiento)", () => {
    const tool = listTool(fakeService())
    expect(tool.requiredPermissions).toContain("report.read")
    expect(Object.keys(tool.inputSchema.properties)).not.toContain("storeId")
    expect(tool.domain).toBe("recommendations")
  })

  it("genera/renueva y devuelve la lista activa con conteo", async () => {
    const service = fakeService()
    const tool = listTool(service)

    const response = await tool.execute(ctx, {})

    expect(response.success).toBe(true)
    expect(response.error).toBeNull()
    const data = response.data as { recommendations: unknown[]; count: number }
    expect(data.recommendations).toHaveLength(1)
    expect(data.count).toBe(1)
  })

  it("construye el contexto de servicio desde el contexto autenticado (aislamiento por tienda)", async () => {
    const service = fakeService()
    const tool = listTool(service)

    await tool.execute(ctx, {})

    expect(service.refresh).toHaveBeenCalledWith(expect.objectContaining({ storeId: "s1", userId: "u1" }))
  })

  it("devuelve toolFail si el servicio falla", async () => {
    const service = { refresh: vi.fn().mockRejectedValue(new Error("db caída")) }
    const tool = listTool(service as unknown as RecommendationService)

    const response = await tool.execute(ctx, {})

    expect(response.success).toBe(false)
    expect(response.error).toContain("db caída")
  })
})

describe("Factory de recomendaciones", () => {
  it("crea el servicio por defecto listo para inyectar", () => {
    const service = createRecommendationService()
    expect(typeof service.refresh).toBe("function")
    expect(typeof service.markStatus).toBe("function")
  })
})
