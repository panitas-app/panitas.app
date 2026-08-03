import { describe, expect, it } from "vitest"
import {
  RecommendationCustomerAnalyzer,
  RecommendationInventoryAnalyzer,
  RecommendationOrderAnalyzer,
  RecommendationPricingAnalyzer,
  RecommendationSalesAnalyzer,
  candidateFromObservation,
  candidatesFromObservations,
} from "@/lib/recommendations"
import { report, observation } from "./helpers"

describe("Analizadores de recomendaciones (FASE 4D)", () => {
  describe("candidateFromObservation / candidatesFromObservations", () => {
    it("mapea una observación 4B a candidato con datos del catálogo", () => {
      const candidate = candidateFromObservation(
        observation({ ruleId: "inventory.low_stock", entityId: "prod-1", metricValue: 3 })
      )
      expect(candidate).not.toBeNull()
      expect(candidate!.category).toBe("INVENTORY")
      expect(candidate!.priority).toBe("HIGH")
      expect(candidate!.dedupeKey).toBe("inventory.low_stock")
      expect(candidate!.entityId).toBe("prod-1")
      expect(candidate!.metricValue).toBe(3)
      expect(candidate!.suggestedAction).toBeTruthy()
      expect(candidate!.reason).toBeTruthy()
    })

    it("ignora observaciones cuya regla no está en el catálogo 4D", () => {
      expect(candidateFromObservation(observation({ ruleId: "activity.unknown" }))).toBeNull()
    })

    it("filtra por los ids de regla indicados", () => {
      const result = candidatesFromObservations(
        [
          observation({ ruleId: "inventory.low_stock" }),
          observation({ ruleId: "orders.pending" }),
          observation({ ruleId: "sales.top_products" }),
        ],
        ["inventory.low_stock", "sales.top_products"]
      )
      expect(result.map((c) => c.ruleId).sort()).toEqual(["inventory.low_stock", "sales.top_products"])
    })
  })

  describe("RecommendationInventoryAnalyzer", () => {
    it("extrae solo reglas de inventario", () => {
      const analyzer = new RecommendationInventoryAnalyzer()
      const result = analyzer.analyze(
        report([
          observation({ ruleId: "inventory.low_stock" }),
          observation({ ruleId: "inventory.no_movement" }),
          observation({ ruleId: "orders.pending" }),
          observation({ ruleId: "sales.week_comparison" }),
        ])
      )
      expect(result.recommendations.map((c) => c.ruleId).sort()).toEqual([
        "inventory.low_stock",
        "inventory.no_movement",
      ])
    })
  })

  describe("RecommendationSalesAnalyzer", () => {
    it("extrae solo reglas de ventas", () => {
      const analyzer = new RecommendationSalesAnalyzer()
      const result = analyzer.analyze(
        report([
          observation({ ruleId: "sales.week_comparison" }),
          observation({ ruleId: "sales.top_products" }),
          observation({ ruleId: "inventory.low_stock" }),
        ])
      )
      expect(result.recommendations.map((c) => c.ruleId).sort()).toEqual([
        "sales.top_products",
        "sales.week_comparison",
      ])
    })
  })

  describe("RecommendationCustomerAnalyzer", () => {
    it("extrae solo reglas de clientes", () => {
      const analyzer = new RecommendationCustomerAnalyzer()
      const result = analyzer.analyze(
        report([
          observation({ ruleId: "customers.outstanding" }),
          observation({ ruleId: "customers.inactive" }),
          observation({ ruleId: "inventory.high_rotation" }),
        ])
      )
      expect(result.recommendations.map((c) => c.ruleId).sort()).toEqual([
        "customers.inactive",
        "customers.outstanding",
      ])
    })
  })

  describe("RecommendationOrderAnalyzer", () => {
    it("extrae solo reglas de pedidos", () => {
      const analyzer = new RecommendationOrderAnalyzer()
      const result = analyzer.analyze(
        report([
          observation({ ruleId: "orders.pending" }),
          observation({ ruleId: "orders.delayed" }),
          observation({ ruleId: "customers.outstanding" }),
        ])
      )
      expect(result.recommendations.map((c) => c.ruleId).sort()).toEqual(["orders.delayed", "orders.pending"])
    })
  })

  describe("RecommendationPricingAnalyzer", () => {
    it("deriva revisión de precios desde alta rotación", () => {
      const analyzer = new RecommendationPricingAnalyzer()
      const result = analyzer.analyze(
        report([
          observation({ ruleId: "inventory.high_rotation", title: "Alta rotación", metricValue: 12 }),
        ])
      )
      expect(result.recommendations).toHaveLength(1)
      const candidate = result.recommendations[0]
      expect(candidate.ruleId).toBe("pricing.review_rotation")
      expect(candidate.category).toBe("PRICING")
      expect(candidate.suggestedAction.toLowerCase()).toContain("revisa")
      expect(candidate.metricValue).toBe(12)
    })

    it("no genera recomendación de precios sin alta rotación", () => {
      const analyzer = new RecommendationPricingAnalyzer()
      const result = analyzer.analyze(report([observation({ ruleId: "inventory.low_stock" })]))
      expect(result.recommendations).toHaveLength(0)
    })
  })
})
