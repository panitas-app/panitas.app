/**
 * Inventory Recommendation Analyzer (FASE 4D).
 *
 * Convierte las observaciones de inventario del Business Health Monitor (4B)
 * en candidatos de recomendación operativa: stock bajo, agotados, sin
 * movimiento y alta rotación. Prioridad y cooldown provienen del catálogo.
 */
import type { MonitorReport } from "@/lib/business-intelligence"
import { candidatesFromObservations } from "./mapper"
import type { AnalyzerResult, RecommendationCandidate } from "../types"

const INVENTORY_RULES = [
  "inventory.low_stock",
  "inventory.out_of_stock",
  "inventory.no_movement",
  "inventory.high_rotation",
]

export class RecommendationInventoryAnalyzer {
  analyze(report: MonitorReport): AnalyzerResult {
    return {
      recommendations: candidatesFromObservations(report.observations, INVENTORY_RULES),
    }
  }
}

export type { RecommendationCandidate }
