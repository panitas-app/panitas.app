/**
 * Contratos de la capa de Recommendations (FASE 4D).
 *
 * Tipos compartidos por el Recommendation Engine: candidatos de los analizadores,
 * recomendaciones finales, reglas del catálogo y el resumen en lenguaje natural.
 * Solo contratos, sin lógica.
 *
 * Regla de capas: estos tipos no dependen de Prisma ni de repositorios.
 * El engine consume SOLO la capa de Business Intelligence (FASE 4B), que a su vez
 * consume servicios autenticados (1B). El aislamiento de negocio se garantiza
 * porque toda consulta parte del `StoreServiceContext`.
 */

/** Categorías de recomendación operativa. */
export type RecommendationCategory = "INVENTORY" | "SALES" | "CUSTOMERS" | "OPERATIONS" | "PRICING"

/** Prioridad de una recomendación (determinista, sin lenguaje alarmista). */
export type RecommendationPriority = "LOW" | "MEDIUM" | "HIGH"

/** Estado de una recomendación persistida (anti-spam / historial). */
export type RecommendationStatus = "active" | "viewed" | "dismissed"

/** Candidato crudo producido por un analizador (antes de persistir). */
export interface RecommendationCandidate {
  /** Id de la regla del catálogo que la originó. */
  ruleId: string
  category: RecommendationCategory
  priority: RecommendationPriority
  title: string
  description: string
  /** Por qué se sugiere (evidencia, sin promesas ni predicciones). */
  reason: string
  /** Fuente de datos con la que se construyó (monitor 4B / servicio). */
  dataSource: string
  /** Sugerencia de revisión/acción concreta (nunca una decisión automática). */
  suggestedAction: string
  entityId?: string
  metricValue?: number
  /** Clave de dedupe/cooldown: una recomendación activa por regla. */
  dedupeKey: string
}

/** Recomendación final, priorizada y listable para UI/chat/móvil. */
export interface Recommendation {
  id: string
  storeId: string
  ruleId: string
  category: RecommendationCategory
  priority: RecommendationPriority
  status: RecommendationStatus
  title: string
  description: string
  reason: string
  dataSource: string
  suggestedAction: string
  entityId?: string | null
  metadata: Record<string, unknown>
  createdAt: string
  viewedAt?: string | null
  dismissedAt?: string | null
}

/** Regla declarativa del catálogo de recomendaciones. */
export interface RecommendationRuleDef {
  id: string
  category: RecommendationCategory
  priority: RecommendationPriority
  /** Fuente de datos de la que se alimenta la regla (monitor 4B). */
  dataSource: string
  /** Acción de revisión sugerida (nunca una decisión automática). */
  suggestedAction: string
  /** Días de espera antes de volver a sugerir la misma regla (anti-spam). */
  cooldownDays: number
  /** Razón en lenguaje natural de por qué se sugiere (evidencia). */
  reason: string
}

/** Vista compacta para el badge de la UI. */
export interface RecommendationCount {
  active: number
  high: number
}

/** Resumen en lenguaje natural listo para el asistente. */
export interface RecommendationSummary {
  /** Total de recomendaciones activas devueltas. */
  count: number
  /** Párrafo determinista en lenguaje natural (sin LLM). */
  text: string
  /** Contexto estructurado para que el LLM genere la respuesta final. */
  promptContext: string
}

/** Salida de un analizador de recomendaciones. */
export interface AnalyzerResult {
  recommendations: RecommendationCandidate[]
}
