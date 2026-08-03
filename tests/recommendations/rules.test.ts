import { describe, expect, it } from "vitest"
import {
  CATEGORY_PRIORITY,
  PRIORITY_ORDER,
  RECOMMENDATION_RULES,
  recommendationRule,
} from "@/lib/recommendations/rules"
import type { RecommendationRuleDef } from "@/lib/recommendations/types"

const FORBIDDEN_IN_ACTIONS = [
  "sube el precio",
  "baja el precio",
  "incrementa el precio",
  "disminuye el precio",
  "debes",
  "tienes que",
  "urgente",
  "críticamente",
  "inmediatamente",
]

const FORBIDDEN_IN_REASONS = ["predicción", "se espera que", "va a crecer", "seguramente"]

describe("Catálogo de reglas de recomendaciones (FASE 4D)", () => {
  it("cada regla tiene todos los campos y el id coincide con la clave", () => {
    for (const [key, rule] of Object.entries(RECOMMENDATION_RULES)) {
      expect(rule.id).toBe(key)
      expect(rule.category).toBeTruthy()
      expect(rule.priority).toBeTruthy()
      expect(rule.dataSource).toBeTruthy()
      expect(rule.suggestedAction).toBeTruthy()
      expect(rule.reason).toBeTruthy()
      expect(rule.cooldownDays).toBeGreaterThanOrEqual(1)
    }
  })

  it("cubre las 5 categorías operativas", () => {
    const categories = new Set(Object.values(RECOMMENDATION_RULES).map((r) => r.category))
    expect(categories).toEqual(new Set(["INVENTORY", "SALES", "CUSTOMERS", "OPERATIONS", "PRICING"]))
  })

  it("nunca sugiere subir/bajar precios ni lenguaje imperativo o urgente", () => {
    for (const rule of Object.values(RECOMMENDATION_RULES)) {
      const text = `${rule.suggestedAction} ${rule.reason}`
      for (const forbidden of FORBIDDEN_IN_ACTIONS) {
        expect(text.toLowerCase()).not.toContain(forbidden)
      }
    }
  })

  it("no hace predicciones ni promesas de crecimiento", () => {
    for (const rule of Object.values(RECOMMENDATION_RULES)) {
      const text = `${rule.suggestedAction} ${rule.reason}`.toLowerCase()
      for (const forbidden of FORBIDDEN_IN_REASONS) {
        expect(text).not.toContain(forbidden)
      }
    }
  })

  it("la regla de precios solo sugiere revisar (nunca modificar el valor)", () => {
    const pricing = RECOMMENDATION_RULES["pricing.review_rotation"] as RecommendationRuleDef
    expect(pricing.category).toBe("PRICING")
    expect(pricing.suggestedAction.toLowerCase()).toContain("revisa")
    expect(pricing.suggestedAction.toLowerCase()).not.toContain("subir")
    expect(pricing.suggestedAction.toLowerCase()).not.toContain("bajar")
  })

  it("tiene cooldown acorde al tipo de situación", () => {
    expect(RECOMMENDATION_RULES["orders.pending"].cooldownDays).toBe(1)
    expect(RECOMMENDATION_RULES["customers.inactive"].cooldownDays).toBeGreaterThanOrEqual(30)
    expect(RECOMMENDATION_RULES["pricing.review_rotation"].cooldownDays).toBeGreaterThanOrEqual(15)
  })

  it("recommendationRule devuelve la regla por id y undefined para desconocidas", () => {
    expect(recommendationRule("inventory.low_stock")?.category).toBe("INVENTORY")
    expect(recommendationRule("no.existe")).toBeUndefined()
  })

  it("define prioridad y categoría de orden estables", () => {
    expect(PRIORITY_ORDER).toEqual(["HIGH", "MEDIUM", "LOW"])
    expect(CATEGORY_PRIORITY).toEqual(["OPERATIONS", "INVENTORY", "SALES", "CUSTOMERS", "PRICING"])
  })
})
