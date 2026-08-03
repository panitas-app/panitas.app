import { describe, expect, it } from "vitest"
import { InsightEngine } from "@/lib/business-intelligence/insights/insight-engine"
import { prioritize, compareInsights, importanceRank, categoryRank } from "@/lib/business-intelligence/insights/prioritization"
import type { Insight, Observation } from "@/lib/business-intelligence/types"

function obs(overrides: Partial<Observation> = {}): Observation {
  return {
    ruleId: "rules.one",
    category: "sales",
    importance: "info",
    title: "Título",
    description: "Descripción",
    dataSource: "source",
    ...overrides,
  }
}

describe("InsightEngine (FASE 4B)", () => {
  it("convierte observaciones en insights con id y createdAt", () => {
    const engine = new InsightEngine()
    const insights = engine.build([obs({ ruleId: "sales.week_comparison" })])
    expect(insights).toHaveLength(1)
    expect(insights[0].id).toBe("insight:sales.week_comparison")
    expect(typeof insights[0].createdAt).toBe("string")
    expect(new Date(insights[0].createdAt).toString()).not.toBe("Invalid Date")
  })

  it("deduplica por categoría + título", () => {
    const engine = new InsightEngine()
    const insights = engine.build([obs(), obs({ ruleId: "sales.another" })])
    expect(insights).toHaveLength(1)
  })

  it("ordena por importancia: important > warning > info", () => {
    const engine = new InsightEngine()
    const insights = engine.build([
      obs({ ruleId: "sales.info", title: "Info", importance: "info" }),
      obs({ ruleId: "sales.important", title: "Importante", importance: "important" }),
      obs({ ruleId: "sales.warning", title: "Warning", importance: "warning" }),
    ])
    expect(insights.map((i) => i.importance)).toEqual(["important", "warning", "info"])
  })

  it("dentro de la misma importancia prioriza operaciones (orders) e inventario", () => {
    const engine = new InsightEngine()
    const insights = engine.build([
      obs({ ruleId: "customers.active", title: "Clientes", importance: "info", category: "customers" }),
      obs({ ruleId: "inventory.no_movement", title: "Sin movimiento", importance: "info", category: "inventory" }),
      obs({ ruleId: "sales.top", title: "Ventas", importance: "info", category: "sales" }),
      obs({ ruleId: "orders.pending", title: "Pendientes", importance: "info", category: "orders" }),
    ])
    expect(insights.map((i) => i.category)).toEqual(["orders", "inventory", "sales", "customers"])
  })

  it("limita la cantidad máxima de insights", () => {
    const engine = new InsightEngine({ maxInsights: 2 })
    const insights = engine.build([
      obs({ title: "A" }),
      obs({ title: "B", category: "orders" }),
      obs({ title: "C", category: "customers" }),
    ])
    expect(insights.length).toBeLessThanOrEqual(2)
  })
})

describe("prioritization (FASE 4B)", () => {
  it("no muta el arreglo original", () => {
    const input = [obs({ title: "B" }), obs({ title: "A" })]
    const sorted = prioritize(input)
    expect(sorted[0].title).toBe("A")
    expect(input[0].title).toBe("B")
  })

  it("rankea importancia y categoría de forma estable", () => {
    expect(importanceRank("important")).toBeLessThan(importanceRank("warning"))
    expect(importanceRank("warning")).toBeLessThan(importanceRank("info"))
    expect(categoryRank("orders")).toBeLessThan(categoryRank("inventory"))
    expect(categoryRank("inventory")).toBeLessThan(categoryRank("sales"))
    expect(categoryRank("sales")).toBeLessThan(categoryRank("customers"))
  })

  it("desempata por título dentro de la misma importancia y categoría", () => {
    const a: Insight = obs({ title: "B", importance: "info", category: "sales" }) as unknown as Insight
    const b: Insight = obs({ title: "A", importance: "info", category: "sales" }) as unknown as Insight
    expect(compareInsights(a, b)).toBeGreaterThan(0)
    expect(compareInsights(b, a)).toBeLessThan(0)
  })
})
