import { describe, expect, it } from "vitest"
import { detectBusinessEvents, isActionableInsight, ruleIdFromInsight } from "@/lib/assistant-behavior"
import { actionableSummary, insight, summary } from "./fixtures"

describe("business-events (FASE 5F)", () => {
  it("detecta eventos accionables reales del Business Summary", () => {
    const events = detectBusinessEvents(actionableSummary())
    expect(events).toHaveLength(3)
    const byRule = new Map(events.map((e) => [e.ruleId, e]))
    expect(byRule.get("inventory.low_stock")?.category).toBe("inventario")
    expect(byRule.get("orders.pending")?.category).toBe("operacion")
    expect(byRule.get("customers.outstanding")?.category).toBe("clientes")
  })

  it("cada recomendación apunta al insight que la origina (nunca inventa)", () => {
    for (const event of detectBusinessEvents(actionableSummary())) {
      expect(event.insightId.startsWith("insight:")).toBe(true)
      expect(event.title.length).toBeGreaterThan(0)
      expect(event.description.length).toBeGreaterThan(0)
    }
  })

  it("omite insights informativos sin acción (no interrumpe innecesariamente)", () => {
    const events = detectBusinessEvents(
      summary([
        insight({ id: "insight:customers.active", category: "customers", importance: "info", action: "" }),
        insight({ id: "insight:activity.overview", category: "activity", importance: "info", action: undefined }),
      ]),
    )
    expect(events).toHaveLength(0)
  })

  it("sin insights devuelve [] (nunca fabrica hallazgos)", () => {
    expect(detectBusinessEvents(summary([]))).toEqual([])
    expect(detectBusinessEvents(summary([insight({ action: "" })]))).toEqual([])
  })

  it("deduplica por regla (una recomendación por regla)", () => {
    const events = detectBusinessEvents(
      summary([
        insight({ id: "insight:inventory.low_stock" }),
        insight({ id: "insight:inventory.low_stock", title: "Duplicado" }),
      ]),
    )
    expect(events.filter((e) => e.ruleId === "inventory.low_stock")).toHaveLength(1)
  })

  it("asigna prioridad según importancia cuando no hay regla catalogada", () => {
    const events = detectBusinessEvents(
      summary([
        insight({ id: "insight:foo.bar", category: "sales", importance: "important", action: "Revisa." }),
      ]),
    )
    expect(events[0]?.priority).toBe("alta")
    expect(events[0]?.category).toBe("finanzas")
  })

  it("las acciones rápidas son texto semántico sin tool names ni IDs", () => {
    for (const event of detectBusinessEvents(actionableSummary())) {
      expect(event.quickAction.label.length).toBeGreaterThan(0)
      expect(event.quickAction.action).toMatch(/^(ver|revisar|cobrar|registrar)/)
      expect(JSON.stringify(event.quickAction)).not.toMatch(/tool|\.update|\.delete|\.create/i)
    }
  })

  it("ruleIdFromInsight extrae la regla del id del insight", () => {
    expect(ruleIdFromInsight(insight({ id: "insight:orders.pending" }))).toBe("orders.pending")
    expect(ruleIdFromInsight(insight({ id: "insight:inventory.low_stock" }))).toBe("inventory.low_stock")
  })

  it("isActionableInsight exige una acción no vacía", () => {
    expect(isActionableInsight(insight({ action: "Revisa." }))).toBe(true)
    expect(isActionableInsight(insight({ action: "" }))).toBe(false)
    expect(isActionableInsight(insight({ action: undefined }))).toBe(false)
  })
})
