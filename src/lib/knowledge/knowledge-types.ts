/**
 * Business Knowledge Base (FASE 7D) — Tipos y constantes.
 *
 * Contratos puros (sin Prisma, sin Next) de la Base de Conocimiento: tipos de
 * documento, categorías, etiquetas, versiones, búsqueda híbrida y respuestas
 * con citas. Este archivo NO importa Prisma: se puede consumir desde cualquier
 * lado (cliente, tests, copiloto, agente).
 */

// ─── Tipos de documento ─────────────────────────────────────────────────────

/** Tipos de conocimiento que la Base de Conocimiento soporta. */
export const KNOWLEDGE_DOCUMENT_TYPES = [
  "text", // texto libre
  "faq", // preguntas frecuentes
  "procedure", // procedimientos internos
  "policy", // políticas del negocio
  "warranty", // garantías
  "manual", // manuales
  "catalog", // catálogos
  "technical", // documentación técnica
  "pdf", // archivo PDF
  "docx", // documento DOCX
  "txt", // archivo TXT
] as const
export type KnowledgeDocumentType = (typeof KNOWLEDGE_DOCUMENT_TYPES)[number]

export const KNOWLEDGE_DOCUMENT_TYPE_LABELS: Record<KnowledgeDocumentType, string> = {
  text: "Texto libre",
  faq: "Preguntas frecuentes",
  procedure: "Procedimiento interno",
  policy: "Política del negocio",
  warranty: "Garantía",
  manual: "Manual",
  catalog: "Catálogo",
  technical: "Documentación técnica",
  pdf: "Archivo PDF",
  docx: "Documento DOCX",
  txt: "Archivo TXT",
}

// ─── Estados ────────────────────────────────────────────────────────────────

export const KNOWLEDGE_STATUSES = ["draft", "published", "archived"] as const
export type KnowledgeStatus = (typeof KNOWLEDGE_STATUSES)[number]

export const KNOWLEDGE_SOURCES = ["manual", "upload"] as const
export type KnowledgeSource = (typeof KNOWLEDGE_SOURCES)[number]

// ─── Acciones del historial ─────────────────────────────────────────────────

export const KNOWLEDGE_HISTORY_ACTIONS = [
  "created",
  "updated",
  "deleted",
  "indexed",
  "viewed",
  "restored",
  "category.created",
  "category.updated",
  "category.deleted",
  "tag.created",
  "tag.deleted",
] as const
export type KnowledgeHistoryAction = (typeof KNOWLEDGE_HISTORY_ACTIONS)[number]

// ─── DTOs públicos ──────────────────────────────────────────────────────────

export interface KnowledgeCategoryView {
  id: string
  storeId: string
  name: string
  slug: string
  description: string | null
  color: string
  isSystem: boolean
  documentCount?: number
}

export interface KnowledgeTagView {
  id: string
  storeId: string
  name: string
  slug: string
  documentCount?: number
}

export interface KnowledgeVersionView {
  id: string
  documentId: string
  version: number
  title: string
  changeNote: string | null
  authorId: string | null
  createdAt: string
}

export interface KnowledgeHistoryView {
  id: string
  storeId: string
  documentId: string | null
  action: KnowledgeHistoryAction | string
  title: string | null
  userId: string | null
  metadata: Record<string, unknown> | null
  createdAt: string
}

/** Vista pública de un documento de conocimiento (multitenant por storeId). */
export interface KnowledgeDocumentView {
  id: string
  storeId: string
  title: string
  /** Contenido procesado e indexable (texto extraído o redactado por el usuario). */
  content: string
  summary: string | null
  type: KnowledgeDocumentType | string
  source: KnowledgeSource | string
  status: KnowledgeStatus | string
  fileName: string | null
  fileUrl: string | null
  fileType: string | null
  fileSize: number | null
  version: number
  viewCount: number
  authorId: string | null
  authorName: string | null
  categoryIds: string[]
  categoryNames: string[]
  tagIds: string[]
  tagNames: string[]
  publishedAt: string | null
  createdAt: string
  updatedAt: string
}

// ─── Búsqueda híbrida ───────────────────────────────────────────────────────

export interface KnowledgeSearchFilters {
  /** Texto libre (título + contenido + etiquetas/categorías). */
  query?: string
  categoryId?: string
  categorySlug?: string
  tagId?: string
  tagSlug?: string
  type?: KnowledgeDocumentType | string
  status?: KnowledgeStatus | string
  authorId?: string
  /** Rango de fechas (createdAt). */
  from?: string
  to?: string
  limit?: number
  offset?: number
}

export type KnowledgeMatchField = "title" | "content" | "category" | "tag"

export interface KnowledgeSearchHit {
  document: KnowledgeDocumentView
  /** Puntuación híbrida (keywords + fuzzy + recencia + popularidad). */
  score: number
  matchedOn: KnowledgeMatchField[]
  /** Fragmento del contenido alrededor del primer término. */
  snippet: string | null
}

// ─── Respuesta con citas (integración con IA) ───────────────────────────────

export interface KnowledgeCitation {
  documentId: string
  title: string
  type: KnowledgeDocumentType | string
}

export interface KnowledgeAnswer {
  content: string
  dataSources: string[]
  citations: KnowledgeCitation[]
  /** true si la respuesta se basa en documentos de la Base de Conocimiento. */
  grounded: boolean
}

// ─── Indexación (RAG-ready) ─────────────────────────────────────────────────

export interface KnowledgeChunk {
  index: number
  text: string
  tokens: number
}

/** Reservado para el vector store futuro: hoy `vector` siempre es null. */
export interface KnowledgeEmbeddingPlaceholder {
  chunkIndex: number
  model: string | null
  dimensions: number | null
  vector: number[] | null
}

export interface KnowledgeIndexedDocument {
  documentId: string
  version: number
  title: string
  /** Documento original separado del contenido procesado. */
  original: {
    fileName: string | null
    fileUrl: string | null
    fileType: string | null
    fileSize: number | null
  }
  content: string
  chunks: KnowledgeChunk[]
  embeddings: KnowledgeEmbeddingPlaceholder[]
  metadata: {
    type: KnowledgeDocumentType | string
    status: KnowledgeStatus | string
    categoryNames: string[]
    tagNames: string[]
    authorId: string | null
    createdAt: string
  }
  indexedAt: string
}
