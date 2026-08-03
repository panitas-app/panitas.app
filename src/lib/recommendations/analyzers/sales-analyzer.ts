/**
 * Sales Recommendation Analyzer (FASE 4D).
 *
 * Convierte las observaciones de ventas del Business Health Monitor (4B) en
 * candidatos de recomendación: comparación de la semana/mes y productos
 * destacados. Solo revisión, sin predicciones ni promesas de crecimiento.
 */
import type { MonitorReport } from "@/lib/business-intelligence"
import { candidatesFromObservations } from "./mapper"
import type { AnalyzerResult } from "../types"

const SALES_RULES = [
  "sales.week_comparison",
  "sales.month_comparison",
  "sales.top_products",
]

export class RecommendationSalesAnalyzer {
  analyze(report: MonitorReport): AnalyzerResult {
    return {
      recommendations: candidatesFromObservations(report.observations, SALES_RULES),
    }
  }
}
