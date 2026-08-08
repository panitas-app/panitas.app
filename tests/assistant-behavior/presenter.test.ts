import { describe, expect, it } from "vitest"
import { MAX_PROACTIVE_CARDS, recommendationToMonitorBlock, recommendationsToMonitorRich } from "@/lib/conversational/recommendations"
import { recommendation } from "./fixtures"

describe("presenter de recomendaciones proactivas (FASE 5F)", () => {
  it("recommendationToMonitorBlock produce un bloque monitor client-safe", () => {
    const block = recommendationToMonitorBlock(recommendation())
    expect(block.kind).toBe("monitor")
    if (block.kind !== "monitor") return
    expect(block.title).toBe("3 productos requieren reposición")
    expect(block.icon).toBe("package")
    expect(block.tone).toBe("warning")
    expect(block.actions?.[0]?.label).toBe("Revisar inventario")
    expect(JSON.stringify(block)).not.toMatch(/tool|\.update|\.delete/i)
  })

  it("mapea categoría y prioridad a icono y tono", () => {
    const alta = recommendationToMonitorBlock(recommendation({ priority: "alta", category: "operacion" }))
    const media = recommendationToMonitorBlock(recommendation({ priority: "media", category: "finanzas" }))
    const baja = recommendationToMonitorBlock(recommendation({ priority: "baja", category: "clientes" }))
    expect(alta.tone).toBe("warning")
    expect(alta.icon).toBe("package-check")
    expect(media.tone).toBe("info")
    expect(media.icon).toBe("trending-up")
    expect(baja.tone).toBe("success")
    expect(baja.icon).toBe("users")
  })

  it("recommendationsToMonitorRich limita a MAX_PROACTIVE_CARDS", () => {
    const items = Array.from({ length: 10 }, (_, i) => recommendation({ id: `reco:${i}`, title: `Tema ${i}` }))
    const rich = recommendationsToMonitorRich(items)
    expect(rich.kind).toBe("summary")
    expect(rich.blocks.filter((b) => b.kind === "monitor")).toHaveLength(MAX_PROACTIVE_CARDS)
  })

  it("sin recomendaciones devuelve bloques vacíos", () => {
    const rich = recommendationsToMonitorRich([])
    expect(rich.blocks).toEqual([])
  })

  it("las acciones rápidas son texto semántico", () => {
    const rich = recommendationsToMonitorRich([recommendation()])
    const block = rich.blocks[0]
    if (block.kind !== "monitor") throw new Error("esperado monitor")
    const action = block.actions?.[0]
    expect(action?.action).toBe("revisar inventario")
    expect(action?.label).toBe("Revisar inventario")
  })
})
