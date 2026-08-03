import { describe, expect, it } from "vitest"
import { RecommendationSummaryGenerator } from "@/lib/recommendations"
import { recommendationRow } from "./helpers"

describe("RecommendationSummaryGenerator (FASE 4D)", () => {
  function recommendation(overrides: Record<string, unknown> = {}) {
    const row = recommendationRow(overrides)
    return {
      id: row.id as string,
      storeId: row.storeId as string,
      ruleId: row.ruleId as string,
      category: row.category as "INVENTORY",
      priority: row.priority as "HIGH",
      status: row.status as "active",
      title: row.title as string,
      description: row.description as string,
      reason: row.reason as string,
      dataSource: row.dataSource as string,
      suggestedAction: row.suggestedAction as string,
      entityId: row.entityId as string | null,
      metadata: {},
      createdAt: row.createdAt.toISOString(),
      viewedAt: row.viewedAt,
      dismissedAt: row.dismissedAt,
    }
  }

  it("sin recomendaciones devuelve texto de estado estable", () => {
    const summary = new RecommendationSummaryGenerator().summarize([])
    expect(summary.count).toBe(0)
    expect(summary.text).toContain("No tengo recomendaciones pendientes")
    expect(summary.promptContext).toContain("(ninguna)")
  })

  it("con una recomendación usa singular y lista título, descripción y acción", () => {
    const summary = new RecommendationSummaryGenerator().summarize([recommendation()])
    expect(summary.count).toBe(1)
    expect(summary.text).toContain("Encontré 1 punto")
    expect(summary.text).toContain("Revisa los productos con inventario bajo")
  })

  it("con varias las numera y respeta maxListed sin alterar el conteo", () => {
    const generator = new RecommendationSummaryGenerator({ maxListed: 2 })
    const summary = generator.summarize([
      recommendation({ id: "r1", title: "Uno" }),
      recommendation({ id: "r2", title: "Dos" }),
      recommendation({ id: "r3", title: "Tres" }),
    ])
    expect(summary.count).toBe(3)
    expect(summary.text).toContain("Encontré 3 puntos")
    expect(summary.text).toContain("1. Uno")
    expect(summary.text).toContain("2. Dos")
    expect(summary.text).not.toContain("3. Tres")
    expect(summary.text).toContain("Hay 1 recomendación más en tu panel")
  })

  it("el promptContext estructura prioridad, categoría, acción y razón", () => {
    const summary = new RecommendationSummaryGenerator().summarize([recommendation()])
    expect(summary.promptContext).toContain("RECOMENDACIONES_OPERATIVAS")
    expect(summary.promptContext).toContain("[HIGH|Inventario]")
    expect(summary.promptContext).toContain("Acción sugerida")
    expect(summary.promptContext).toContain("Razón")
  })

  it("el promptContext prohíbe lenguaje urgente en la respuesta del LLM", () => {
    const summary = new RecommendationSummaryGenerator().summarize([recommendation()])
    expect(summary.promptContext.toLowerCase()).toContain("sin alarmismo")
    expect(summary.promptContext.toLowerCase()).toContain("podría ser conveniente")
  })
})
