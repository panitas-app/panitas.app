/**
 * Customer Recommendation Analyzer (FASE 4D).
 *
 * Convierte las observaciones de clientes del Business Health Monitor (4B) en
 * candidatos de recomendación: saldos pendientes y clientes inactivos.
 * Solo se recomiendan grupos, nunca clientes individuales (regla 4B).
 */
import type { MonitorReport } from "@/lib/business-intelligence"
import { candidatesFromObservations } from "./mapper"
import type { AnalyzerResult } from "../types"

const CUSTOMER_RULES = [
  "customers.outstanding",
  "customers.inactive",
]

export class RecommendationCustomerAnalyzer {
  analyze(report: MonitorReport): AnalyzerResult {
    return {
      recommendations: candidatesFromObservations(report.observations, CUSTOMER_RULES),
    }
  }
}
