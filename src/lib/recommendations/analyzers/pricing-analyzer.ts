/**
 * Pricing Recommendation Analyzer (FASE 4D).
 *
 * Deriva recomendaciones de revisión de precios a partir de datos de ventas
 * del Business Health Monitor (4B): cuando hay productos de alta rotación
 * (los más vendidos), sugiere revisar si su precio sigue siendo conveniente.
 *
 * Regla de seguridad: NUNCA sugiere subir ni bajar precios; solo "revisar".
 * Sin predicciones ni promesas de crecimiento.
 */
import type { MonitorReport, Observation } from "@/lib/business-intelligence"
import { recommendationRule } from "../rules"
import type { AnalyzerResult, RecommendationCandidate } from "../types"

const ROTATION_RULE_ID = "inventory.high_rotation"

export class RecommendationPricingAnalyzer {
  analyze(report: MonitorReport): AnalyzerResult {
    const candidates: RecommendationCandidate[] = []

    const rotation = report.observations.find((obs: Observation) => obs.ruleId === ROTATION_RULE_ID)
    if (!rotation) return { recommendations: candidates }

    const ruleDef = recommendationRule("pricing.review_rotation")
    if (!ruleDef) return { recommendations: candidates }

    candidates.push({
      ruleId: ruleDef.id,
      category: ruleDef.category,
      priority: ruleDef.priority,
      title: "Revisar precios de tus productos más vendidos",
      description: rotation.description,
      reason: ruleDef.reason,
      dataSource: ruleDef.dataSource,
      suggestedAction: ruleDef.suggestedAction,
      metricValue: rotation.metricValue,
      dedupeKey: ruleDef.id,
    })

    return { recommendations: candidates }
  }
}
