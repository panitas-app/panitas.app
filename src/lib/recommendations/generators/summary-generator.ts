/**
 * Recommendation Summary Generator (FASE 4D).
 *
 * Convierte recomendaciones estructuradas en:
 *   - un párrafo determinista en lenguaje natural (sin LLM),
 *   - un contexto estructurado para que el LLM (Agent Core) genere la
 *     respuesta final con un tono cercano y sin alarmismo.
 *
 * Estilo Panitas: "Encontré esto basado en tus datos. Podría ser conveniente
 * revisarlo." NUNCA "debes hacer esto", nunca palabras urgentes, nunca
 * predicciones, nunca sugerir subir/bajar precios automáticamente.
 */
import type { Recommendation, RecommendationSummary } from "../types"

const CATEGORY_LABEL: Record<string, string> = {
  INVENTORY: "Inventario",
  SALES: "Ventas",
  CUSTOMERS: "Clientes",
  OPERATIONS: "Operaciones",
  PRICING: "Precios",
}

function categoryLabel(category: string): string {
  return CATEGORY_LABEL[category] ?? category
}

export interface RecommendationSummaryGeneratorOptions {
  /** Máximo de elementos listados en el texto determinista. */
  maxListed?: number
}

export class RecommendationSummaryGenerator {
  private readonly maxListed: number

  constructor(options: RecommendationSummaryGeneratorOptions = {}) {
    this.maxListed = options.maxListed ?? 5
  }

  summarize(recommendations: Recommendation[]): RecommendationSummary {
    const text = this.buildText(recommendations)
    const promptContext = this.buildPromptContext(recommendations)
    return { count: recommendations.length, text, promptContext }
  }

  /** Respuesta determinista sin LLM (fallback o API). */
  private buildText(recommendations: Recommendation[]): string {
    if (recommendations.length === 0) {
      return "No tengo recomendaciones pendientes para tu negocio en este momento. Todo se ve estable."
    }

    const total = recommendations.length
    const listed = recommendations.slice(0, this.maxListed)
    const parts: string[] = [
      `Encontré ${total === 1 ? "1 punto" : `${total} puntos`} que podrías revisar, basados en tus datos.`,
    ]

    listed.forEach((rec, index) => {
      parts.push(`${index + 1}. ${rec.title}. ${rec.description} ${rec.suggestedAction}`)
    })

    if (total > listed.length) {
      const remaining = total - listed.length
      parts.push(
        remaining === 1
          ? "Hay 1 recomendación más en tu panel."
          : `Hay ${remaining} recomendaciones más en tu panel.`
      )
    }

    return parts.join(" ")
  }

  /** Contexto estructurado para el LLM del Agent Core. */
  private buildPromptContext(recommendations: Recommendation[]): string {
    if (recommendations.length === 0) {
      return "RECOMENDACIONES_OPERATIVAS:\n  (ninguna)"
    }

    const lines = recommendations.map((rec) => {
      return (
        `  - [${rec.priority}|${categoryLabel(rec.category)}] ${rec.title}: ` +
        `${rec.description} Acción sugerida: ${rec.suggestedAction} Razón: ${rec.reason}`
      )
    })

    return [
      "RECOMENDACIONES_OPERATIVAS:",
      ...lines,
      "Instruccion: preséntalas al usuario en español, en tono cercano y sin alarmismo. " +
        "Nunca uses palabras como 'urgente', 'debes', 'crítico' ni 'inmediatamente'. " +
        "Solo sugiere que podría ser conveniente revisar cada punto, basándote en sus datos.",
    ].join("\n")
  }
}
