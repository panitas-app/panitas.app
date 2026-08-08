import { describe, expect, it } from "vitest"
import { BehaviorEngine } from "@/lib/assistant-behavior"
import type { BusinessSummarySource } from "@/lib/assistant-behavior"
import type { BusinessSummary } from "@/lib/business-intelligence"
import { actionableSummary, summary } from "./fixtures"

function sourceFrom(summaries: BusinessSummary | BusinessSummary[]): BusinessSummarySource {
  const list = Array.isArray(summaries) ? summaries : [summaries]
  let index = 0
  return async () => list[Math.min(index++, list.length - 1)]
}

describe("behavior-engine (FASE 5F)", () => {
  it("produce un resultado con saludo contextual y recomendaciones priorizadas", async () => {
    const source = sourceFrom(actionableSummary())
    const engine = new BehaviorEngine({ summarySource: source, now: () => new Date("2026-08-04T09:00:00Z") })

    const result = await engine.analyze({ storeId: "store_1", userName: "juan" })

    expect(result.hasFindings).toBe(true)
    expect(result.greeting.text).toContain("Buenos días Juan")
    expect(result.recommendations).toHaveLength(3)
    const priorities = result.recommendations.map((r) => r.priority)
    expect(priorities).toEqual([...priorities].sort((a, b) => rank(a) - rank(b)))
  })

  it("sin hallazgos: hasFindings=false y saludo neutro (nunca 'todo bien')", async () => {
    const source = sourceFrom(summary([]))
    const engine = new BehaviorEngine({ summarySource: source })

    const result = await engine.analyze({ storeId: "store_1" })

    expect(result.hasFindings).toBe(false)
    expect(result.recommendations).toEqual([])
    expect(result.greeting.text).not.toMatch(/bien|en orden|nada/i)
  })

  it("cachea por tienda: no vuelve a consultar dentro del TTL", async () => {
    const calls: string[] = []
    const source: BusinessSummarySource = async () => {
      calls.push("called")
      return actionableSummary()
    }
    const engine = new BehaviorEngine({ summarySource: source, now: () => new Date("2026-08-04T09:00:00Z") })

    await engine.analyze({ storeId: "store_1" })
    await engine.analyze({ storeId: "store_1" })
    await engine.analyze({ storeId: "store_1" })

    expect(calls).toHaveLength(1)
  })

  it("el caché es independiente por tienda", async () => {
    const calls: string[] = []
    const source: BusinessSummarySource = async () => {
      calls.push("called")
      return actionableSummary()
    }
    const engine = new BehaviorEngine({ summarySource: source })

    await engine.analyze({ storeId: "store_a" })
    await engine.analyze({ storeId: "store_b" })

    expect(calls).toHaveLength(2)
  })

  it("recarga al expirar el TTL y con clearCache", async () => {
    const calls: string[] = []
    const source: BusinessSummarySource = async () => {
      calls.push("called")
      return actionableSummary()
    }
    let now = 1_700_000_000_000
    const engine = new BehaviorEngine({ summarySource: source, cacheTtlMs: 1000, now: () => new Date(now) })

    await engine.analyze({ storeId: "store_1" })
    now += 2000
    await engine.analyze({ storeId: "store_1" })
    await engine.analyze({ storeId: "store_1" })

    expect(calls).toHaveLength(2)

    engine.clearCache()
    await engine.analyze({ storeId: "store_1" })
    expect(calls).toHaveLength(3)
  })

  it("limita el número de recomendaciones", async () => {
    const engine = new BehaviorEngine({ summarySource: sourceFrom(actionableSummary()), maxRecommendations: 2 })
    const result = await engine.analyze({ storeId: "store_1" })
    expect(result.recommendations.length).toBeLessThanOrEqual(2)
  })

  it("rechaza analizar sin source ni ctx (no inventa datos sin fuente)", async () => {
    const engine = new BehaviorEngine({})
    await expect(engine.analyze({})).rejects.toThrow(/summarySource|ctx/i)
  })

  it("cada recomendación incluye una acción rápida y evidencia real", async () => {
    const engine = new BehaviorEngine({ summarySource: sourceFrom(actionableSummary()) })
    const result = await engine.analyze({ storeId: "store_1" })
    for (const reco of result.recommendations) {
      expect(reco.quickAction.label.length).toBeGreaterThan(0)
      expect(reco.quickAction.action.length).toBeGreaterThan(0)
      expect(reco.title).toBeTruthy()
      expect(reco.insightId.startsWith("insight:")).toBe(true)
    }
  })
})

function rank(p: string): number {
  return p === "alta" ? 0 : p === "media" ? 1 : 2
}
