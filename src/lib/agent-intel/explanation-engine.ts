/**
 * Explanation Engine (FASE 4A).
 *
 * Convierte evidencia (alertas, métricas, resultados de herramientas) en
 * explicaciones en lenguaje natural: el PORQUÉ de una recomendación, no solo
 * el QUÉ. Es determinista y basado en plantillas.
 *
 * Ejemplo:
 *   "He detectado un bajo nivel de inventario para 'Abrazadera 2\"' porque el
 *    stock disponible es de 3 unidades y las ventas del producto aumentaron
 *    un 30% en los últimos 7 días, insuficiente para mantener ese ritmo."
 */
import type { BusinessAlert } from "@/lib/agent/tools/domains"
import type { BusinessSummary, Insight } from "@/lib/business-intelligence"
import type { Recommendation } from "@/lib/recommendations"

/** Evidencia de bajo stock con contexto de tendencia de ventas. */
export interface StockEvidence {
  productName: string
  currentStock: number
  /** Umbral de alerta configurado (opcional). */
  threshold?: number
  /** Aumento porcentual de ventas en la ventana (opcional). */
  salesIncreasePercent?: number
  /** Días de la ventana analizada (opcional). */
  windowDays?: number
}

export interface ExplanationEngineOptions {
  /** Umbral de stock considerado "bajo". */
  lowStockThreshold?: number
}

export class ExplanationEngine {
  private readonly lowStockThreshold: number

  constructor(options: ExplanationEngineOptions = {}) {
    this.lowStockThreshold = options.lowStockThreshold ?? 5
  }

  /** Explicación causal de un nivel de inventario bajo. */
  explainStock(evidence: StockEvidence): string {
    const { productName, currentStock, salesIncreasePercent, windowDays } = evidence
    const thresholdText = evidence.threshold ?? this.lowStockThreshold

    if (salesIncreasePercent && salesIncreasePercent > 0) {
      const window = windowDays ?? 7
      return (
        `He detectado un bajo nivel de inventario para "${productName}": el stock ` +
        `disponible es de ${currentStock} unidades (umbral ${thresholdText}) y las ventas ` +
        `del producto aumentaron un ${salesIncreasePercent}% en los últimos ${window} días, ` +
        `por lo que el stock actual no alcanza para mantener ese ritmo de ventas.`
      )
    }

    return (
      `He detectado un bajo nivel de inventario para "${productName}": el stock disponible ` +
      `es de ${currentStock} unidades, por debajo del umbral de ${thresholdText}.`
    )
  }

  /** Explica la tendencia de ventas de un producto. */
  explainSalesTrend(productName: string, deltaPercent: number, windowDays = 7): string {
    if (deltaPercent > 0) {
      return `Las ventas de "${productName}" crecieron un ${deltaPercent}% en los últimos ${windowDays} días.`
    }
    if (deltaPercent < 0) {
      return `Las ventas de "${productName}" cayeron un ${Math.abs(deltaPercent)}% en los últimos ${windowDays} días.`
    }
    return `Las ventas de "${productName}" se mantuvieron estables en los últimos ${windowDays} días.`
  }

  /** Explica cada alerta de negocio con su causa implícita. */
  explainAlerts(alerts: BusinessAlert[]): string[] {
    return alerts.map((alert) => this.explainAlert(alert))
  }

  /** Explica cada insight del monitor de negocio (FASE 4B). */
  explainSummary(summary: BusinessSummary): string[] {
    return summary.insights.map((insight) => this.explainInsight(insight))
  }

  /** Explica cada recomendación operativa (FASE 4D). */
  explainRecommendations(recommendations: Recommendation[]): string[] {
    if (recommendations.length === 0) return []
    return recommendations.map(
      (rec) => `${rec.title}: ${rec.description} Acción sugerida: ${rec.suggestedAction}`
    )
  }

  explainInsight(insight: Insight): string {
    const base = `${insight.title}: ${insight.description}`
    return insight.action ? `${base} Acción sugerida: ${insight.action}` : base
  }

  explainAlert(alert: BusinessAlert): string {
    switch (alert.type) {
      case "low_stock":
        return `${alert.message}: reponer existencias para evitar quedarse sin producto.`
      case "no_movement":
        return `${alert.message}: considera promocionarlo o evaluar su rotación.`
      case "no_sales_today":
        return "Aún no hay ventas registradas hoy; revisa si el negocio está operativo y con productos disponibles."
      case "pending_orders":
        return `${alert.message} Atenderlos a tiempo evita cancelaciones y clientes insatisfechos.`
      default:
        return alert.message
    }
  }
}
