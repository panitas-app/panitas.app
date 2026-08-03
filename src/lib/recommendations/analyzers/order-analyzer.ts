/**
 * Order Recommendation Analyzer (FASE 4D).
 *
 * Convierte las observaciones de pedidos del Business Health Monitor (4B) en
 * candidatos de recomendación operativa: pedidos pendientes y pedidos con
 * posible demora. Prioridad operativa alta.
 */
import type { MonitorReport } from "@/lib/business-intelligence"
import { candidatesFromObservations } from "./mapper"
import type { AnalyzerResult } from "../types"

const ORDER_RULES = [
  "orders.pending",
  "orders.delayed",
]

export class RecommendationOrderAnalyzer {
  analyze(report: MonitorReport): AnalyzerResult {
    return {
      recommendations: candidatesFromObservations(report.observations, ORDER_RULES),
    }
  }
}
