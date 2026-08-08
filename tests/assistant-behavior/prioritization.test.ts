import { describe, expect, it } from "vitest"
import { CATEGORY_ORDER, PRIORITY_ORDER, prioritizeAssistantRecommendations } from "@/lib/assistant-behavior"
import { recommendation } from "./fixtures"

describe("recommendation-priority (FASE 5F)", () => {
  it("ordena Alta → Media → Baja", () => {
    const items = prioritizeAssistantRecommendations([
      recommendation({ id: "a", title: "Baja", priority: "baja" }),
      recommendation({ id: "b", title: "Alta", priority: "alta" }),
      recommendation({ id: "c", title: "Media", priority: "media" }),
    ])
    expect(items.map((i) => i.priority)).toEqual(["alta", "media", "baja"])
  })

  it("desempata por categoría en el orden del catálogo", () => {
    const items = prioritizeAssistantRecommendations([
      recommendation({ id: "c", title: "Créditos", category: "clientes", priority: "media" }),
      recommendation({ id: "o", title: "Pedidos", category: "operacion", priority: "media" }),
      recommendation({ id: "i", title: "Stock", category: "inventario", priority: "media" }),
    ])
    expect(items.map((i) => i.category)).toEqual(["operacion", "inventario", "clientes"])
  })

  it("desempata por título alfabéticamente", () => {
    const items = prioritizeAssistantRecommendations([
      recommendation({ id: "a", title: "Beta", priority: "alta" }),
      recommendation({ id: "b", title: "Alfa", priority: "alta" }),
    ])
    expect(items.map((i) => i.title)).toEqual(["Alfa", "Beta"])
  })

  it("no muta el arreglo original", () => {
    const original = [
      recommendation({ id: "a", title: "Zeta", priority: "baja" }),
      recommendation({ id: "b", title: "Alfa", priority: "alta" }),
    ]
    prioritizeAssistantRecommendations(original)
    expect(original.map((i) => i.title)).toEqual(["Zeta", "Alfa"])
  })

  it("catalogos cubren las prioridades y categorías del spec", () => {
    expect(PRIORITY_ORDER).toEqual(["alta", "media", "baja"])
    expect(CATEGORY_ORDER).toEqual(["operacion", "inventario", "finanzas", "clientes", "proveedores"])
  })
})
