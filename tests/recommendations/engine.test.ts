import { describe, expect, it, vi } from "vitest"
import { RecommendationEngine } from "@/lib/recommendations"
import { report, observation } from "./helpers"
import type { Observation } from "@/lib/business-intelligence"

function candidateReport(): Observation[] {
  return [
    observation({
      ruleId: "orders.pending",
      category: "orders",
      importance: "important",
      title: "Pedidos pendientes",
      description: "Hay pedidos por atender.",
      dataSource: "orders.overview",
    }),
    observation({
      ruleId: "inventory.out_of_stock",
      category: "inventory",
      importance: "important",
      title: "Productos agotados",
      description: "Hay productos sin existencias.",
      dataSource: "inventory.overview",
    }),
    observation({
      ruleId: "sales.week_comparison",
      category: "sales",
      importance: "warning",
      title: "Semana con menor actividad",
      description: "Las ventas bajaron respecto a la semana anterior.",
      dataSource: "sales.overview",
    }),
  ]
}

describe("RecommendationEngine (FASE 4D)", () => {
  it("construye candidatos desde un reporte 4B sin consultar BD", () => {
    const engine = new RecommendationEngine()
    const result = engine.build(report(candidateReport()))

    expect(result).toHaveLength(3)
    expect(result.map((r) => r.ruleId).sort()).toEqual([
      "inventory.out_of_stock",
      "orders.pending",
      "sales.week_comparison",
    ])
  })

  it("dedupe por regla (una sola recomendación por dedupeKey)", () => {
    const engine = new RecommendationEngine()
    const dup = report([
      observation({ ruleId: "inventory.low_stock" }),
      observation({ ruleId: "inventory.low_stock", title: "duplicado" }),
      observation({ ruleId: "inventory.low_stock", title: "duplicado 2" }),
    ])

    const result = engine.build(dup)
    const lowStock = result.filter((r) => r.ruleId === "inventory.low_stock")
    expect(lowStock).toHaveLength(1)
  })

  it("prioriza HIGH antes que MEDIUM/LOW y OPERATIONS antes que otras categorías", () => {
    const engine = new RecommendationEngine()
    const reportData = report([
      observation({ ruleId: "customers.inactive", category: "customers", importance: "info" }),
      observation({ ruleId: "inventory.no_movement", category: "inventory", importance: "info" }),
      observation({ ruleId: "orders.pending", category: "orders", importance: "important" }),
      observation({ ruleId: "inventory.out_of_stock", category: "inventory", importance: "important" }),
    ])

    const result = engine.build(reportData)
    expect(result[0].ruleId).toBe("orders.pending")
    expect(result[1].ruleId).toBe("inventory.out_of_stock")
  })

  it("respeta el límite máximo de recomendaciones (3-5)", () => {
    const engine = new RecommendationEngine()
    const reportData = report([
      observation({ ruleId: "orders.pending" }),
      observation({ ruleId: "orders.delayed" }),
      observation({ ruleId: "inventory.out_of_stock" }),
      observation({ ruleId: "inventory.low_stock" }),
      observation({ ruleId: "sales.week_comparison" }),
      observation({ ruleId: "sales.month_comparison" }),
      observation({ ruleId: "customers.outstanding" }),
    ])

    expect(engine.build(reportData)).toHaveLength(5)

    const engine3 = new RecommendationEngine({ maxRecommendations: 3 })
    expect(engine3.build(reportData)).toHaveLength(3)
  })

  it("sin observaciones devuelve lista vacía (estado estable)", () => {
    const engine = new RecommendationEngine()
    expect(engine.build(report([]))).toHaveLength(0)
  })

  it("no genera candidatos para observaciones sin regla en el catálogo 4D", () => {
    const engine = new RecommendationEngine()
    const unknown = report([
      observation({ ruleId: "inventory.precious_unknown" }),
      observation({ ruleId: "activity.something" }),
    ])
    expect(engine.build(unknown)).toHaveLength(0)
  })

  it("generate() delega en el monitor 4B con el input autenticado", async () => {
    const monitor = { monitor: vi.fn().mockResolvedValue(report([observation({ ruleId: "inventory.low_stock" })])) }
    const engine = new RecommendationEngine({ monitor: monitor as never })

    const input = { ctx: { storeId: "s1", userId: "u1", plan: "business" } }
    const result = await engine.generate(input)

    expect(monitor.monitor).toHaveBeenCalledWith(input)
    expect(result).toHaveLength(1)
    expect(result[0].ruleId).toBe("inventory.low_stock")
  })

  it("propaga entityId y metricValue desde la observación 4B", () => {
    const engine = new RecommendationEngine()
    const reportData = report([
      observation({ ruleId: "inventory.low_stock", entityId: "prod-9", metricValue: 2 }),
    ])

    const result = engine.build(reportData)
    expect(result[0].entityId).toBe("prod-9")
    expect(result[0].metricValue).toBe(2)
  })

  it("usa prioridad, razón y acción del catálogo (no de la observación)", () => {
    const engine = new RecommendationEngine()
    const reportData = report([
      observation({
        ruleId: "inventory.out_of_stock",
        title: "Algunos productos agotados",
        description: "Detalle de la observación.",
      }),
    ])

    const result = engine.build(reportData)
    expect(result[0].priority).toBe("HIGH")
    expect(result[0].suggestedAction).toContain("reponer")
    expect(result[0].dedupeKey).toBe("inventory.out_of_stock")
  })
})
