/**
 * Business Knowledge Base (FASE 7D) — barrel público.
 *
 * Punto de entrada único del módulo de conocimiento: tipos puros, categorías,
 * eventos, parser, indexador, búsqueda híbrida, resumen con citas y servicio.
 * Preparado para conectar un vector store en el futuro sin cambiar la API.
 */
export {
  KNOWLEDGE_DOCUMENT_TYPES,
  KNOWLEDGE_DOCUMENT_TYPE_LABELS,
  KNOWLEDGE_HISTORY_ACTIONS,
  KNOWLEDGE_SOURCES,
  KNOWLEDGE_STATUSES,
  type KnowledgeAnswer,
  type KnowledgeCategoryView,
  type KnowledgeChunk,
  type KnowledgeCitation,
  type KnowledgeDocumentType,
  type KnowledgeDocumentView,
  type KnowledgeEmbeddingPlaceholder,
  type KnowledgeHistoryAction,
  type KnowledgeHistoryView,
  type KnowledgeIndexedDocument,
  type KnowledgeMatchField,
  type KnowledgeSearchFilters,
  type KnowledgeSearchHit,
  type KnowledgeSource,
  type KnowledgeStatus,
  type KnowledgeTagView,
  type KnowledgeVersionView,
} from "./knowledge-types"
export {
  KNOWLEDGE_EVENT_DOMAIN,
  KNOWLEDGE_EVENTS,
  KNOWLEDGE_EVENT_LABELS,
  type KnowledgeEventName,
  type KnowledgeEventRecord,
} from "./knowledge-events"
export {
  KNOWLEDGE_SYSTEM_CATEGORIES,
  KNOWLEDGE_SYSTEM_CATEGORY_SLUGS,
  isValidCategoryName,
  slugify,
  systemCategoryViews,
} from "./knowledge-categories"
export {
  detectTextFormat,
  extractDocxText,
  extractPdfText,
  extractTextFromBuffer,
  normalizeExtractedText,
  type ExtractionResult,
} from "./knowledge-parser"
export {
  KNOWLEDGE_CHUNK_MAX_CHARS,
  KNOWLEDGE_CHUNK_OVERLAP,
  chunkText,
  extractTitleFromContent,
  indexDocument,
  tokenCount,
} from "./knowledge-index"
export {
  KnowledgeSearchEngine,
  buildSnippet,
  createPrismaKnowledgeSearchStore,
  isKnownType,
  matchedOn,
  toView,
  type KnowledgeDocumentRow,
  type KnowledgeSearchEngineOptions,
  type KnowledgeSearchStore,
  type KnowledgeSearchStoreResult,
} from "./knowledge-search"
export {
  KnowledgeService,
  createKnowledgeService,
  type CreateKnowledgeCategoryInput,
  type CreateKnowledgeDocumentInput,
  type KnowledgePermission,
  type KnowledgeServiceOptions,
  type UpdateKnowledgeDocumentInput,
} from "./knowledge-service"
export { buildKnowledgeAnswer, type BuildKnowledgeAnswerInput } from "./knowledge-answer"
