import { describe, expect, it, vi } from "vitest"
import { createAnalyticsTools } from "@/lib/agent/tools/domains/analytics"
import type { ToolExecutionContext } from "@/lib/agent/tools/types"
import type { BusinessSummaryGenerator } from "@/lib/business-intelligence"

const ctx: ToolExecutionContext = {
  userId: "u1",
  storeId: "s1",
  negocioId: null,
  plan: "business",
  role: "admin",
  permissions: ["report.read"],
}

function fakeGenerator() {
  return {
    generate: vi.fn().mockResolvedValue({
      storeId: "s1",
      generatedAt: "2026-08-03T12:00:00.000Z",
      greeting: "Buenos días Juan",
      summary: "Revisé el estado de tu negocio. Todo se ve estable en ventas, inventario y pedidos.",
      overview: {
        status: "estable",
        summary: "El negocio se encuentra en un estado estable.",
        counts: { important: 0, warning: 0, info: 1 },
      },
      insights: [],
      metrics: [{ key: "sales_today", label: "Ventas hoy", value: 100, format: "currency" }],
      recommendations: [],
    }),
  }
}

function monitorTool(generator: ReturnType<typeof fakeGenerator>) {
  const tool = createAnalyticsTools({ businessMonitor: generator as unknown as BusinessSummaryGenerator }).find(
    (t) => t.name === "analytics.businessMonitor"
  )
  if (!tool) throw new Error("analytics.businessMonitor no está registrada")
  return tool
}

describe("Tool analytics.businessMonitor (FASE 4B)", () => {
  it("está registrada en el array de tools de analítica", () => {
    const names = createAnalyticsTools().map((t) => t.name)
    expect(names).toContain("analytics.businessMonitor")
  })

  it("declara permisos de solo lectura y schema sin storeId (aislamiento)", () => {
    const tool = monitorTool(fakeGenerator())
    expect(tool.requiredPermissions).toContain("report.read")
    expect(Object.keys(tool.inputSchema.properties)).not.toContain("storeId")
  })

  it("devuelve el resumen completo del negocio generado por la capa 4B", async () => {
    const generator = fakeGenerator()
    const tool = monitorTool(generator)
    const response = await tool.execute(ctx, {})

    expect(response.success).toBe(true)
    expect(response.error).toBeNull()
    const data = response.data as { summary: string; overview: { status: string } }
    expect(data.summary).toContain("Revisé el estado de tu negocio.")
    expect(data.overview.status).toBe("estable")
  })

  it("construye el contexto de servicio desde el contexto autenticado (aislamiento por tienda)", async () => {
    const generator = fakeGenerator()
    const tool = monitorTool(generator)
    await tool.execute(ctx, {})

    expect(generator.generate).toHaveBeenCalledWith(
      expect.objectContaining({
        ctx: expect.objectContaining({ storeId: "s1", userId: "u1" }),
      })
    )
  })

  it("propaga storeName/userName desde metadata del contexto", async () => {
    const generator = fakeGenerator()
    const tool = monitorTool(generator)
    await tool.execute({ ...ctx, metadata: { storeName: "Panadería La Panita", userName: "Ana" } }, {})

    expect(generator.generate).toHaveBeenCalledWith(
      expect.objectContaining({ storeName: "Panadería La Panita", userName: "Ana" })
    )
  })
})
