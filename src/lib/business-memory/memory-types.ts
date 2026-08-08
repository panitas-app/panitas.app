/**
 * Contratos del Business Memory Engine (FASE 5G).
 *
 * Memoria ESTABLE del negocio, separada del historial conversacional (FASE 3D/5C):
 *
 *   - Terminología: cómo el negocio nombra sus conceptos ("paciente" vs "cliente",
 *     "orden de trabajo" vs "venta", "factura" vs "pedido").
 *   - Preferencias: moneda principal, reportes favoritos, vista inicial, etc.
 *   - Reglas operativas: "no vender sin stock", "confirmar antes de eliminar".
 *   - Patrones de uso: consultas/reportes frecuentes consolidados por repetición.
 *
 * Reglas inamovibles:
 *
 *   - TODO ítem pertenece a un `storeId` (frontera de aislamiento por tenant).
 *   - Aprendizaje SOLO por comportamiento repetitivo (umbral) o configuración
 *     explícita. NUNCA se consolida una preferencia con una sola acción.
 *   - Antes de responder, el agente consulta la memoria por intención y recibe
 *     SOLO los recuerdos relevantes (nunca la memoria completa).
 *   - La clave de cada ítem va prefijada con `bm.` para no colisionar con la
 *     memoria conversacional 3D en la misma tabla `BusinessMemory`.
 */
import type { MemoryImportance, MemoryContext } from "@/lib/agent/memory"

export const BUSINESS_MEMORY_KEY_PREFIX = "bm."

export type BusinessMemoryKind = "terminology" | "preference" | "operational_rule" | "usage_pattern"

export type BusinessMemorySource = "explicit" | "learned" | "observation" | "system"

export type BusinessMemoryStatus = "confirmed" | "candidate"

export interface BusinessMemoryMetadata {
  source: BusinessMemorySource
  status: BusinessMemoryStatus
  /** Veces que el ítem fue observado (para candidatos). */
  strength: number
  /** Umbral de consolidación del ítem. */
  threshold: number
  /** Dominio del negocio al que aplica (ventas, inventario, finanzas...). */
  domain?: string
  /** Etiquetas para el ranking de relevancia por intención. */
  tags: string[]
}

/** Ítem de memoria estable del negocio (DTO plano). */
export interface BusinessMemoryItem {
  id: string
  storeId: string
  userId: string
  negocioId: string | null
  kind: BusinessMemoryKind
  importance: MemoryImportance
  /** Clave estable prefijada `bm.{kind}.{concepto}` (upsert por storeId+key). */
  key: string
  /** Etiqueta humana para el panel de gestión. */
  label: string
  /** Valor estructurado del recuerdo (ej: { term, standard }). */
  value: unknown
  metadata: BusinessMemoryMetadata
  source: BusinessMemorySource
  status: BusinessMemoryStatus
  expiresAt?: string | null
  lastAccessAt?: string
  accessCount: number
  createdAt: string
  updatedAt: string
}

/** Observación que el learner consolida (candidato o confirmado). */
export interface BusinessMemoryObservation {
  ctx: MemoryContext
  kind: BusinessMemoryKind
  key: string
  label: string
  value: unknown
  tags?: string[]
  domain?: string
  /** Si es explícita, se consolida de inmediato (sin umbral). */
  explicit?: boolean
  /** Incremento de fuerza (por defecto 1). */
  strength?: number
  importance?: MemoryImportance
}

export interface LearningConfig {
  /** Activación por defecto del aprendizaje automático (persistible por negocio). */
  enabled: boolean
  /** Umbral de consolidación por tipo (repetición requerida antes de confirmar). */
  thresholds: Record<BusinessMemoryKind, number>
  /** TTL de los candidatos no consolidados. */
  candidateTtlMs: number
  /** Máximo de candidatos vivos por negocio (el más antiguo se descarta). */
  maxCandidates: number
  /** Máximo de recuerdos confirmados por negocio. */
  maxMemories: number
}

export interface BusinessMemoryListOptions {
  kinds?: BusinessMemoryKind[]
  status?: BusinessMemoryStatus
  limit?: number
  includeExpired?: boolean
}

export interface BusinessMemoryStore {
  get(ctx: MemoryContext, key: string): Promise<BusinessMemoryItem | null>
  /** Inserta o actualiza por (storeId, key). */
  put(ctx: MemoryContext, item: BusinessMemoryItem): Promise<BusinessMemoryItem>
  list(ctx: MemoryContext, opts?: BusinessMemoryListOptions): Promise<BusinessMemoryItem[]>
  remove(ctx: MemoryContext, key: string): Promise<boolean>
  /** Elimina todos los ítems del negocio salvo los excluidos. */
  removeAll(ctx: MemoryContext, opts?: { excludeKeys?: string[] }): Promise<number>
  count(ctx: MemoryContext): Promise<number>
  /** Registra un acceso (para ranking por frecuencia) sin tocar `updatedAt`. */
  touch(ctx: MemoryContext, key: string): Promise<void>
}

export interface IntentQuery {
  message: string
  intent?: string
  limit?: number
}

export interface IntentQueryResult {
  items: BusinessMemoryItem[]
  /** Fragmento compacto para el system prompt (solo recuerdos relevantes). */
  context: string
}

export interface MemoryStats {
  total: number
  confirmed: number
  candidates: number
  byKind: Record<BusinessMemoryKind, number>
}
