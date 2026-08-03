/**
 * Recommendation Engine (FASE 4D).
 *
 * Orquestador puro y determinista de recomendaciones operativas. El motor
 * NO consulta la BD ni servicios: consume SOLO el reporte del Business Health
 * Monitor (FASE 4B), que ya analiza servicios autenticados (1B).
 *
 * Flujo: Monitor 4B → Analizadores 4D → dedupe → priorización → límite.
 *
 * Reglas del producto:
 *   - máxima 3-5 recomendaciones por ejecución (evita saturar),
 *   - una sola recomendación por regla (dedupeKey),
 *   - solo sugiere revisar, nunca decide por el usuario,
 *   - sin predicciones ni lenguaje urgente.
 */
import { BusinessHealthMonitor } from "@/lib/business-intelligence"
import type { BusinessMonitorInput, MonitorReport } from "@/lib/business-intelligence"
import {
  RecommendationInventoryAnalyzer,
  RecommendationSalesAnalyzer,
  RecommendationCustomerAnalyzer,
  RecommendationOrderAnalyzer,
  RecommendationPricingAnalyzer,
} from "../analyzers"
import type { AnalyzerResult, RecommendationCandidate } from "../types"
import { prioritizeRecommendations } from "./prioritization"

/** Contrato de un analizador de recomendaciones (inyectable en tests). */
export interface RecommendationAnalyzer {
  analyze(report: MonitorReport): AnalyzerResult
}

export interface RecommendationEngineOptions {
  monitor?: BusinessHealthMonitor
  analyzers?: RecommendationAnalyzer[]
  /** Máximo de recomendaciones que devuelve por ejecución (3-5). */
  maxRecommendations?: number
}

export class RecommendationEngine {
  private readonly monitor: BusinessHealthMonitor
  private readonly analyzers: RecommendationAnalyzer[]
  private readonly maxRecommendations: number

  constructor(options: RecommendationEngineOptions = {}) {
    this.monitor = options.monitor ?? new BusinessHealthMonitor()
    this.analyzers = options.analyzers ?? [
      new RecommendationOrderAnalyzer(),
      new RecommendationInventoryAnalyzer(),
      new RecommendationSalesAnalyzer(),
      new RecommendationCustomerAnalyzer(),
      new RecommendationPricingAnalyzer(),
    ]
    this.maxRecommendations = options.maxRecommendations ?? 5
  }

  async generate(input: BusinessMonitorInput): Promise<RecommendationCandidate[]> {
    const report = await this.monitor.monitor(input)
    return this.build(report)
  }

  /** Construye los candidatos a partir de un reporte 4B ya generado. */
  build(report: MonitorReport): RecommendationCandidate[] {
    const candidates: RecommendationCandidate[] = []
    for (const analyzer of this.analyzers) {
      const result = analyzer.analyze(report)
      candidates.push(...result.recommendations)
    }

    const deduped = this.dedupe(candidates)
    return prioritizeRecommendations(deduped).slice(0, this.maxRecommendations)
  }

  /** Una sola recomendación por `dedupeKey` (conserva la primera encontrada). */
  private dedupe(candidates: RecommendationCandidate[]): RecommendationCandidate[] {
    const seen = new Set<string>()
    const result: RecommendationCandidate[] = []
    for (const candidate of candidates) {
      if (seen.has(candidate.dedupeKey)) continue
      seen.add(candidate.dedupeKey)
      result.push(candidate)
    }
    return result
  }
}
