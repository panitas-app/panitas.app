/**
 * Memory Retriever (FASE 3D).
 *
 * Recupera la memoria relevante ANTES de responder. Scoring determinista:
 *
 *   score = 0.45·keyword + 0.25·importancia + 0.20·recencia + 0.10·frecuencia
 *
 *   - keyword: solape de tokens entre la pregunta y (clave + valor) del ítem.
 *   - importancia: 0.25 (LOW) … 1.00 (CRITICAL).
 *   - recencia: decae exponencialmente con la antigüedad (media vida 30 días).
 *   - frecuencia: min(accessCount, 5) / 5.
 *
 * RAG futuro: si se inyecta un `semanticRetriever`, sus resultados se fusionan
 * (cada hit semántico recibe el peso restante sobre el score base). Ningún
 * proveedor semántico se implementa en esta fase.
 */
import { MEMORY_IMPORTANCE_ORDER } from "./types"
import type {
  MemoryContext,
  MemoryItem,
  MemorySearchOptions,
  MemorySearchResult,
  SemanticMemoryRetriever,
} from "./types"
import type { MemoryStore } from "./types"

export interface MemoryRetrieverOptions {
  limit?: number
  minImportance?: MemorySearchOptions["minImportance"]
  keywordWeight?: number
  importanceWeight?: number
  recencyWeight?: number
  frequencyWeight?: number
  recencyHalfLifeDays?: number
  semanticRetriever?: SemanticMemoryRetriever
}

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9áéíóúñü\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2)
}

export function keywordOverlap(query: string, item: MemoryItem): number {
  const queryTokens = tokenize(query)
  if (queryTokens.length === 0) return 0
  const target = `${item.key} ${stringifyValue(item.value)}`
  const targetTokens = new Set(tokenize(target))
  const matched = queryTokens.filter((t) => targetTokens.has(t)).length
  return matched / queryTokens.length
}

function stringifyValue(value: unknown): string {
  if (value === null || value === undefined) return ""
  if (typeof value === "string") return value
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

export interface ScoreWeights {
  keywordWeight: number
  importanceWeight: number
  recencyWeight: number
  frequencyWeight: number
  recencyHalfLifeDays: number
}

export function scoreItem(query: string, item: MemoryItem, weights: ScoreWeights): number {
  const keyword = keywordOverlap(query, item)
  const importance = MEMORY_IMPORTANCE_ORDER[item.importance] / 4
  const ageMs = Date.now() - new Date(item.updatedAt).getTime()
  const recency = Math.exp(-(ageMs / (1000 * 60 * 60 * 24 * weights.recencyHalfLifeDays)))
  const frequency = Math.min(item.accessCount, 5) / 5

  return (
    weights.keywordWeight * keyword +
    weights.importanceWeight * importance +
    weights.recencyWeight * recency +
    weights.frequencyWeight * frequency
  )
}

export class MemoryRetriever {
  private readonly opts: {
    limit: number
    minImportance: MemorySearchOptions["minImportance"]
    keywordWeight: number
    importanceWeight: number
    recencyWeight: number
    frequencyWeight: number
    recencyHalfLifeDays: number
    semanticRetriever: SemanticMemoryRetriever | undefined
  }

  constructor(private readonly store: MemoryStore, options: MemoryRetrieverOptions = {}) {
    this.opts = {
      limit: options.limit ?? 8,
      minImportance: options.minImportance,
      keywordWeight: options.keywordWeight ?? 0.45,
      importanceWeight: options.importanceWeight ?? 0.25,
      recencyWeight: options.recencyWeight ?? 0.2,
      frequencyWeight: options.frequencyWeight ?? 0.1,
      recencyHalfLifeDays: options.recencyHalfLifeDays ?? 30,
      semanticRetriever: options.semanticRetriever,
    }
  }

  async retrieve(ctx: MemoryContext, query: string, options: MemorySearchOptions = {}): Promise<MemorySearchResult[]> {
    const limit = options.limit ?? this.opts.limit
    const minImportance = options.minImportance ?? this.opts.minImportance
    const candidates = await this.store.list(ctx, {
      limit: 100,
      types: options.types,
      includeExpired: options.includeExpired,
    })

    const scored = candidates
      .map((item) => ({
        item,
        score: scoreItem(query, item, this.opts),
      }))
      .filter((r) => {
        if (minImportance && MEMORY_IMPORTANCE_ORDER[r.item.importance] < MEMORY_IMPORTANCE_ORDER[minImportance]) return false
        return true
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)

    if (this.opts.semanticRetriever) {
      return this.mergeSemantic(ctx, query, scored, limit)
    }

    return scored
  }

  /** RAG futuro: fusiona hits semánticos con el scoring base. */
  private async mergeSemantic(
    ctx: MemoryContext,
    query: string,
    base: MemorySearchResult[],
    limit: number
  ): Promise<MemorySearchResult[]> {
    if (!this.opts.semanticRetriever) return base
    const semantic = await this.opts.semanticRetriever.retrieve(ctx, query, limit)
    const byKey = new Map<string, MemorySearchResult>()
    for (const hit of semantic) byKey.set(hit.item.key, hit)

    const merged = base.map((r) => {
      const sem = byKey.get(r.item.key)
      return sem ? { ...r, score: Math.max(r.score, sem.score) } : r
    })
    for (const [key, hit] of byKey) {
      if (!merged.some((r) => r.item.key === key)) merged.push(hit)
    }
    return merged.sort((a, b) => b.score - a.score).slice(0, limit)
  }
}
