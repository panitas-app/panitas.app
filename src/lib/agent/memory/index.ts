// FASE 1C (legado) — se conservan intactos para no romper código previo.
export { ShortTermMemory, agentMemory } from "@/lib/agent/memory/short-term-memory"
export { createLongTermMemory } from "@/lib/agent/memory/long-term-memory"
export type {
  LongTermMemory,
  LongTermMemoryStore,
  LongTermMemoryRecord,
  LongTermMemoryKind,
} from "@/lib/agent/memory/long-term-memory"

// ── FASE 3D — Panitas Business Context & Memory System ────────────────────────
export { MemoryClassifier, importanceFromSignals, typeForKind, expiresForImportance, keyForContent } from "@/lib/agent/memory/classifier"
export { MemoryStorage } from "@/lib/agent/memory/storage"
export { MemoryRetriever, tokenize, keywordOverlap, scoreItem } from "@/lib/agent/memory/retriever"
export type { ScoreWeights } from "@/lib/agent/memory/retriever"
export { MemoryCleaner } from "@/lib/agent/memory/cleaner"
export { MemoryManager, MEMORY_CONTEXT_FORMAT_LIMIT } from "@/lib/agent/memory/manager"
export { DefaultMemoryExtractor, TOOL_MEMORY_RULES } from "@/lib/agent/memory/extractor"
export type { MemoryExtractor } from "@/lib/agent/memory/extractor"
export {
  MEMORY_IMPORTANCE_ORDER,
  MEMORY_IMPORTANCE_TTL_MS,
} from "@/lib/agent/memory/types"
export type {
  MemoryScope,
  MemoryType,
  MemoryKind,
  MemoryImportance,
  MemoryItem,
  MemoryItemInput,
  MemoryContext,
  MemorySearchOptions,
  MemorySearchResult,
  MemoryStore,
  MemoryClassifyInput,
  MemoryClassifyResult,
  EmbeddingProvider,
  MemoryVectorStore,
  SemanticMemoryRetriever,
  MemoryTurn,
} from "@/lib/agent/memory/types"
