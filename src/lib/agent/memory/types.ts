/**
 * Contratos del Memory System (FASE 3D).
 *
 * La memoria del negocio se compone de ítems (hechos/preferencias/settings) que el
 * negocio mismo genera conforme conversa con Panitas. Reglas inamovibles:
 *
 *   - TODO ítem pertenece a un `storeId` (frontera de aislamiento). El Negocio A
 *     jamás lee/escribe memoria del Negocio B.
 *   - Los ítems `scope="store"` son compartidos por todo el negocio; los `scope="user"`
 *     solo los ve el usuario que los creó.
 *   - El `userId` se registra como autor (auditoría), no como frontera por defecto.
 *
 * Preparación RAG (futuro): se definen `EmbeddingProvider`, `MemoryVectorStore` y
 * `SemanticMemoryRetriever` como interfaces. Ningún proveedor se implementa aún.
 */
import type { StoreServiceContext } from "@/services/context"

export type MemoryScope = "store" | "user"

export type MemoryType = "short_term" | "long_term" | "business"

export type MemoryKind =
  | "fact"
  | "preference"
  | "business_setting"
  | "customer"
  | "product"
  | "event"
  | "custom"

export type MemoryImportance = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"

export const MEMORY_IMPORTANCE_ORDER: Record<MemoryImportance, number> = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  CRITICAL: 4,
}

/** TTL según importancia: LOW=1d, MEDIUM=7d, HIGH=30d, CRITICAL=sin expiración. */
export const MEMORY_IMPORTANCE_TTL_MS: Record<MemoryImportance, number | null> = {
  LOW: 24 * 60 * 60 * 1000,
  MEDIUM: 7 * 24 * 60 * 60 * 1000,
  HIGH: 30 * 24 * 60 * 60 * 1000,
  CRITICAL: null,
}

/** Ítem de memoria persistido (DTO plano, sin funciones ni dependencias). */
export interface MemoryItem {
  id: string
  storeId: string
  userId: string
  negocioId: string | null
  scope: MemoryScope
  type: MemoryType
  kind: MemoryKind
  importance: MemoryImportance
  key: string
  value: unknown
  metadata?: Record<string, unknown>
  source?: string
  expiresAt?: string
  lastAccessAt?: string
  accessCount: number
  createdAt: string
  updatedAt: string
}

/** Entrada para crear/actualizar un ítem de memoria. */
export interface MemoryItemInput {
  scope?: MemoryScope
  type?: MemoryType
  kind?: MemoryKind
  importance?: MemoryImportance
  key: string
  value: unknown
  metadata?: Record<string, unknown>
  source?: string
  expiresAt?: string | null
}

/** Contexto de ejecución acotado para memoria (siempre contiene la frontera de aislamiento). */
export type MemoryContext = Pick<StoreServiceContext, "userId" | "storeId" | "negocioId">

export interface MemorySearchOptions {
  limit?: number
  minImportance?: MemoryImportance
  types?: MemoryType[]
  includeExpired?: boolean
}

export interface MemorySearchResult {
  item: MemoryItem
  score: number
}

/** Almacenamiento abstracto de memoria (implementación concreta: BD vía repositorio). */
export interface MemoryStore {
  get(ctx: MemoryContext, key: string): Promise<MemoryItem | null>
  set(ctx: MemoryContext, input: MemoryItemInput): Promise<MemoryItem>
  search(ctx: MemoryContext, query: string, opts?: MemorySearchOptions): Promise<MemorySearchResult[]>
  list(ctx: MemoryContext, opts?: MemorySearchOptions): Promise<MemoryItem[]>
  delete(ctx: MemoryContext, key: string): Promise<boolean>
  deleteByKeys(ctx: MemoryContext, keys: string[]): Promise<number>
  deleteExpired(ctx: MemoryContext): Promise<number>
  count(ctx: MemoryContext): Promise<number>
}

// ─── Clasificación ─────────────────────────────────────────────────────────────

export type MemoryClassifyInput = {
  /** Texto a clasificar (mensaje del usuario, resultado de tool, etc.). */
  content: string
  source?: string
  metadata?: Record<string, unknown>
}

export interface MemoryClassifyResult {
  /** Si es falsa, el ítem NO debe guardarse (small talk, contenido trivial). */
  shouldStore: boolean
  importance: MemoryImportance
  type: MemoryType
  kind: MemoryKind
  /** Clave estable para el hecho (upsert por storeId+key). */
  key?: string
  value?: unknown
  expiresAt?: string | null
}

export interface MemoryClassifier {
  classify(input: MemoryClassifyInput): MemoryClassifyResult
}

// ─── Recuperación y RAG (futuro) ───────────────────────────────────────────────

export interface EmbeddingProvider {
  embed(text: string): Promise<number[]>
}

export interface MemoryVectorStore {
  upsert(item: MemoryItem): Promise<void>
  search(embedding: number[], limit: number): Promise<Array<{ id: string; score: number }>>
  delete(id: string): Promise<void>
}

/** Retriever semántico opcional (futuro RAG). Si se inyecta, sus scores se fusionan. */
export interface SemanticMemoryRetriever {
  retrieve(ctx: MemoryContext, query: string, limit: number): Promise<MemorySearchResult[]>
}

// ─── Extracción de turnos ──────────────────────────────────────────────────────

export interface MemoryTurn {
  userId: string
  storeId: string
  negocioId?: string | null
  message: string
  reply?: string
  toolCalls?: Array<{ name: string; ok: boolean; input?: Record<string, unknown>; output?: string }>
}
