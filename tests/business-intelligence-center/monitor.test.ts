import { describe, expect, it } from "vitest"
import { topFindings, findingsByCategory } from "@/lib/business-intelligence-center"
import type { Insight } from "@/lib/business-intelligence"

function insight(overrides: Partial<Insight> = {}): Insight {
  return {
    id: "insight:test",
    category: "sales",
    importance: "info",
    title: "Título",
    description: "Descripción",
    dataSource: "source",
    createdAt: new Date().toISOString(),
    ...overrides,
  }
}

describe("monitor (FASE 5A)", () => {
  it("toma los primeros N hallazgos (ya priorizados por la API)", () => {
    const insights = [
      insight({ id: "a", importance: "important" }),
      insight({ id: "b", importance: "warning" }),
      insight({ id: "c", importance: "info" }),
      insight({ id: "d", importance: "info" }),
    ]
    expect(topFindings(insights, 3).map((i) => i.id)).toEqual(["a", "b", "c"])
    expect(topFindings(insights)).toHaveLength(3)
  })

  it("cuenta hallazgos por categoría con todas las categorías presentes", () => {
    const counts = findingsByCategory([
      insight({ category: "inventory" }),
      insight({ category: "inventory" }),
      insight({ category: "orders" }),
    ])
    expect(counts.inventory).toBe(2)
    expect(counts.orders).toBe(1)
    expect(counts.sales).toBe(0)
    expect(counts.customers).toBe(0)
    expect(counts.activity).toBe(0)
    expect(counts.general).toBe(0)
  })
})
