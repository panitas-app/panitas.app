import { describe, expect, it } from "vitest"
import { insightToMonitorCard, MAX_MONITOR_CARDS, summaryToMonitorCards } from "@/lib/conversational/monitor"
import type { BusinessSummary, Insight } from "@/lib/business-intelligence"

function insight(overrides: Partial<Insight> = {}): Insight {
  return {
    id: "i1",
    category: "inventory",
    importance: "important",
    title: "3 productos requieren reposición",
    description: "Café, Pan y Jugo están por debajo del umbral.",
    metric: { label: "stock bajo", value: 3, unit: "productos" },
    recommendation: "Reponer inventario esta semana.",
    ...overrides,
  }
}

describe("conversational monitor (FASE 5E)", () => {
  it("insightToMonitorCard produce un bloque monitor client-safe", () => {
    const block = insightToMonitorCard(insight())
    expect(block.kind).toBe("monitor")
    if (block.kind !== "monitor") return
    expect(block.title).toBe("3 productos requieren reposición")
    expect(block.description).toBe("Café, Pan y Jugo están por debajo del umbral.")
    expect(block.icon).toBe("package")
    expect(block.tone).toBe("warning")
    expect(block.severity).toBe("warning")
    expect(block.actions?.[0].label).toBe("Ver detalle")
    expect(JSON.stringify(block)).not.toMatch(/tool|\.update|\.delete/i)
  })

  it("mapea categoría e importancia a icono y tono", () => {
    const sales = insightToMonitorCard(insight({ category: "sales", importance: "info" }))
    if (sales.kind !== "monitor") return
    expect(sales.icon).toBe("trending-up")
    expect(sales.tone).toBe("success")
  })

  it("summaryToMonitorCards limita a MAX_MONITOR_CARDS tarjetas", () => {
    const insights = Array.from({ length: 10 }, (_, i) => insight({ id: `i${i}`, title: `Insight ${i}` }))
    const summary: BusinessSummary = {
      summary: "Resumen",
      currency: "Bs",
      period: "2026",
      metrics: [],
      insights,
    }
    const rich = summaryToMonitorCards(summary)
    expect(rich.kind).toBe("summary")
    expect(rich.blocks.filter((b) => b.kind === "monitor")).toHaveLength(MAX_MONITOR_CARDS)
  })

  it("summaryToMonitorCards cae a texto si no hay insights", () => {
    const summary: BusinessSummary = { summary: "Todo en orden", currency: "Bs", period: "2026", metrics: [], insights: [] }
    const rich = summaryToMonitorCards(summary)
    expect(rich.blocks[0]).toEqual({ kind: "text", text: "Todo en orden" })
  })
})
