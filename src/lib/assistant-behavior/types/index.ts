/**
 * Contratos de la capa Assistant Behavior (FASE 5F).
 *
 * Convierte al asistente en un "gerente virtual" proactivo: analiza el
 * Business Summary (FASE 4B) y, mediante reglas, decide SI conviene sugerir
 * algo y CÓMO decirlo. Solo contratos y lógica pura, sin React ni I/O.
 *
 * Reglas de seguridad del producto:
 *   - NUNCA decidir por el usuario: todo es una sugerencia con acción rápida.
 *   - NUNCA inventar datos: cada recomendación apunta al insight que la origina.
 *   - NUNCA interrumpir con mensajes vacíos: sin hallazgos no se sugiere nada.
 */
import type { StoreServiceContext } from "@/services/context"
import type { BusinessSummary } from "@/lib/business-intelligence"
import type { QuickAction } from "@/lib/conversational-actions"

/** Categorías de recomendación proactiva (FASE 5F). */
export type AssistantRecommendationCategory = "operacion" | "inventario" | "finanzas" | "clientes" | "proveedores"

/** Prioridad de una recomendación (determinista, sin lenguaje alarmista). */
export type AssistantPriority = "alta" | "media" | "baja"

/**
 * Acción rápida de una recomendación. `action` es texto semántico que se
 * reenvía al asistente (regla 5D/5E: nunca tool names ni IDs internos).
 */
export interface AssistantQuickAction {
  label: string
  action: string
  variant?: QuickAction["variant"]
  icon?: string
}

/**
 * Recomendación proactiva final, respaldada por un insight real del Business
 * Summary. Título y descripción provienen del insight: nunca se inventan.
 */
export interface AssistantRecommendation {
  /** Estable y determinista: `reco:{ruleId}`. */
  id: string
  /** Regla proactiva que la originó (catálogo 5F). */
  ruleId: string
  /** Insight 4B subyacente (evidencia, no inventado). */
  insightId: string
  category: AssistantRecommendationCategory
  priority: AssistantPriority
  title: string
  description: string
  quickAction: AssistantQuickAction
}

/** Saludo contextual de bienvenida (variado, sin repetición). */
export interface AssistantGreeting {
  text: string
  hour: number
  userName?: string
}

/** Resultado del análisis de comportamiento por tienda. */
export interface AssistantBehaviorResult {
  storeId: string
  generatedAt: string
  greeting: AssistantGreeting
  /** Recomendaciones priorizadas (Alta → Media → Baja). */
  recommendations: AssistantRecommendation[]
  /** true solo si hay recomendaciones reales (nunca inventadas). */
  hasFindings: boolean
}

/** Entrada del comportamiento proactivo. */
export interface AssistantBehaviorInput {
  ctx?: StoreServiceContext
  /** Fallback de tienda cuando no se pasa `ctx` (pruebas / uso directo). */
  storeId?: string
  userName?: string
  storeName?: string
  /** Inyectable para pruebas deterministas (hora del saludo). */
  now?: Date
}

/** Fuente de datos del engine: resumen real del negocio (4B). */
export type BusinessSummarySource = (input: AssistantBehaviorInput) => Promise<BusinessSummary>

export type { BusinessSummary, QuickAction }
