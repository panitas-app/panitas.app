/**
 * Business Knowledge Base (FASE 7D) — Búsqueda híbrida.
 *
 * Combina dos estrategias sobre los documentos indexados del tenant:
 *
 *   1. Keywords: Prisma `ILIKE` sobre título, contenido, categorías y
 *      etiquetas (vía `KnowledgeSearchStore` inyectable).
 *   2. Fuzzy: `fuse.js` sobre el resultado para tolerancia a typos.
 *
 * El ranking final mezcla relevancia por término, similitud difusa, recencia y
 * popularidad (viewCount). El store es una interfaz pura para poder probar el
 * motor sin base de datos.
 */
import Fuse from "fuse.js"
import type {
  KnowledgeDocumentView,
  KnowledgeMatchField,
  KnowledgeSearchFilters,
  KnowledgeSearchHit,
} from "./knowledge-types"
import { KNOWLEDGE_DOCUMENT_TYPES } from "./knowledge-types"
import { KNOWLEDGE_SYSTEM_CATEGORY_SLUGS } from "./knowledge-categories"

/** Fila cruda (shape Prisma) que consume el motor de búsqueda. */
export interface KnowledgeDocumentRow {
  id: string
  storeId: string
  title: string
  content: string
  summary: string | null
  type: string
  source: string
  status: string
  fileName: string | null
  fileUrl: string | null
  fileType: string | null
  fileSize: number | null
  version: number
  viewCount: number
  authorId: string | null
  authorName: string | null
  publishedAt: Date | string | null
  createdAt: Date | string
  updatedAt: Date | string
  categories: Array<{ id: string; name: string; slug: string; color?: string | null }>
  tags: Array<{ id: string; name: string; slug: string }>
}

export interface KnowledgeSearchStoreResult {
  rows: KnowledgeDocumentRow[]
  total: number
}

/** Acceso de datos mínimo del motor de búsqueda (implementación Prisma abajo). */
export interface KnowledgeSearchStore {
  search(storeId: string, filters: KnowledgeSearchFilters): Promise<KnowledgeSearchStoreResult>
}

export function toDate(value: Date | string | null | undefined): string | null {
  if (!value) return null
  return value instanceof Date ? value.toISOString() : String(value)
}

export function toView(row: KnowledgeDocumentRow): KnowledgeDocumentView {
  return {
    id: row.id,
    storeId: row.storeId,
    title: row.title,
    content: row.content,
    summary: row.summary,
    type: row.type,
    source: row.source,
    status: row.status,
    fileName: row.fileName,
    fileUrl: row.fileUrl,
    fileType: row.fileType,
    fileSize: row.fileSize,
    version: row.version,
    viewCount: row.viewCount,
    authorId: row.authorId,
    authorName: row.authorName,
    categoryIds: row.categories.map((c) => c.id),
    categoryNames: row.categories.map((c) => c.name),
    tagIds: row.tags.map((t) => t.id),
    tagNames: row.tags.map((t) => t.name),
    publishedAt: toDate(row.publishedAt),
    createdAt: toDate(row.createdAt) ?? new Date(0).toISOString(),
    updatedAt: toDate(row.updatedAt) ?? new Date(0).toISOString(),
  }
}

const SEARCHABLE_TYPES = new Set<string>(KNOWLEDGE_DOCUMENT_TYPES)

export function isKnownType(value: string | undefined): value is string {
  return !!value && SEARCHABLE_TYPES.has(value)
}

// ─── Snipet ─────────────────────────────────────────────────────────────────

/** Genera un fragmento del contenido alrededor del primer término encontrado. */
export function buildSnippet(content: string, query: string, radius = 90): string | null {
  const text = (content ?? "").trim()
  if (!text) return null
  const terms = (query ?? "").toLowerCase().split(/\s+/).filter((t) => t.length > 2)
  if (terms.length === 0) return text.slice(0, radius * 2) + (text.length > radius * 2 ? "…" : "")

  let index = -1
  for (const term of terms) {
    const idx = text.toLowerCase().indexOf(term)
    if (idx !== -1) {
      index = idx
      break
    }
  }
  if (index === -1) {
    return text.slice(0, radius * 2) + (text.length > radius * 2 ? "…" : "")
  }
  const start = Math.max(0, index - radius / 2)
  const end = Math.min(text.length, index + radius * 1.5)
  const prefix = start > 0 ? "…" : ""
  const suffix = end < text.length ? "…" : ""
  return `${prefix}${text.slice(start, end).replace(/\n+/g, " ").trim()}${suffix}`
}

/** Determina en qué campo(s) aparece el término de búsqueda. */
export function matchedOn(row: KnowledgeDocumentRow, query: string): KnowledgeMatchField[] {
  const q = (query ?? "").toLowerCase()
  const fields: KnowledgeMatchField[] = []
  if (!q) return fields
  const words = q.split(/\s+/).filter((w) => w.length > 2)
  const hit = (value: string): boolean => words.some((w) => value.toLowerCase().includes(w))
  if (hit(row.title)) fields.push("title")
  if (hit(row.content)) fields.push("content")
  if (row.categories.some((c) => hit(c.name))) fields.push("category")
  if (row.tags.some((t) => hit(t.name))) fields.push("tag")
  return fields
}

// ─── Motor híbrido ──────────────────────────────────────────────────────────

export interface KnowledgeSearchEngineOptions {
  /** Peso del resultado keyword (0-1); el resto es fuzzy + recencia + popularidad. */
  keywordWeight?: number
  /** Ventana de recencia en días para el bono de actualización. */
  recencyWindowDays?: number
}

interface ScoredRow {
  row: KnowledgeDocumentRow
  keywordHits: number
  keywordScore: number
  fuseScore: number | null
  matchedOn: KnowledgeMatchField[]
}

export class KnowledgeSearchEngine {
  private readonly store: KnowledgeSearchStore
  private readonly options: Required<KnowledgeSearchEngineOptions>

  constructor(store: KnowledgeSearchStore, options: KnowledgeSearchEngineOptions = {}) {
    this.store = store
    this.options = {
      keywordWeight: options.keywordWeight ?? 0.65,
      recencyWindowDays: options.recencyWindowDays ?? 30,
    }
  }

  private keywordScore(row: KnowledgeDocumentRow, terms: string[]): { hits: number; score: number } {
    if (terms.length === 0) return { hits: 0, score: 0 }
    let hits = 0
    let weighted = 0
    const fields: Array<{ value: string; weight: number }> = [
      { value: row.title, weight: 4 },
      { value: row.summary ?? "", weight: 2.5 },
      { value: row.content, weight: 1.5 },
      { value: row.categories.map((c) => c.name).join(" "), weight: 3 },
      { value: row.tags.map((t) => t.name).join(" "), weight: 2 },
    ]
    for (const term of terms) {
      let best = 0
      for (const field of fields) {
        const fieldScore = field.value.toLowerCase().includes(term) ? field.weight : 0
        best = Math.max(best, fieldScore)
      }
      if (best > 0) {
        hits += 1
        weighted += best
      }
    }
    const maxWeighted = terms.length * 4
    return { hits, score: maxWeighted > 0 ? weighted / maxWeighted : 0 }
  }

  private recencyBonus(row: KnowledgeDocumentRow): number {
    const created = toDate(row.createdAt)
    if (!created) return 0
    const ageMs = Date.now() - new Date(created).getTime()
    if (ageMs < 0) return 0
    const ageDays = ageMs / (86_400_000)
    return Math.max(0, 1 - ageDays / this.options.recencyWindowDays) * 0.06
  }

  private popularityBonus(row: KnowledgeDocumentRow): number {
    if (row.viewCount <= 0) return 0
    return Math.min(row.viewCount, 50) / 50 * 0.04
  }

  /** Busca y devuelve resultados rankeados. */
  async search(storeId: string, filters: KnowledgeSearchFilters): Promise<{ hits: KnowledgeSearchHit[]; total: number }> {
    const { rows, total } = await this.store.search(storeId, filters)
    const query = (filters.query ?? "").trim()
    const terms = query.toLowerCase().split(/\s+/).filter((t) => t.length > 2)

    const fuse = new Fuse(rows, {
      keys: [
        { name: "title", weight: 2 },
        { name: "content", weight: 0.6 },
        { name: "summary", weight: 0.8 },
        { name: "categories", getFn: (row: KnowledgeDocumentRow) => row.categories.map((c) => c.name) },
        { name: "tags", getFn: (row: KnowledgeDocumentRow) => row.tags.map((t) => t.name) },
      ],
      threshold: 0.4,
      includeScore: true,
      ignoreLocation: true,
      minMatchCharLength: 2,
    })

    const scored: ScoredRow[] = rows.map((row) => {
      const keyword = this.keywordScore(row, terms)
      const fuseMatch = query ? fuse.search(query).find((r) => r.item.id === row.id) : undefined
      return {
        row,
        keywordHits: keyword.hits,
        keywordScore: keyword.score,
        fuseScore: fuseMatch?.score != null ? 1 - fuseMatch.score : null,
        matchedOn: matchedOn(row, query),
      }
    })

    const hits: KnowledgeSearchHit[] = scored
      .map((s) => {
        const fuseScore = s.fuseScore ?? 0
        const score =
          s.keywordScore * this.options.keywordWeight +
          fuseScore * (1 - this.options.keywordWeight) +
          this.recencyBonus(s.row) +
          this.popularityBonus(s.row)
        return {
          score,
          document: toView(s.row),
          matchedOn: s.matchedOn,
          snippet: buildSnippet(s.row.content, query),
          // Un documento solo es relevante si hubo match por keyword o fuzzy;
          // los bonos de recencia/popularidad NO convierten un ítem irrelevante
          // en resultado.
          _match: s.keywordHits > 0 || s.fuseScore != null,
        }
      })
      .filter((h) => query.length === 0 || h._match)
      .sort((a, b) => b.score - a.score)
      .map(({ _match: _ignored, ...hit }) => hit)

    return { hits, total }
  }
}

// ─── Implementación Prisma del store ────────────────────────────────────────

import type { PrismaClient } from "@prisma/client"

const STATUS_FILTERS = new Set(["draft", "published", "archived"])

/** Store basado en Prisma: filtra por tenant y ejecuta los ILIKE en BD. */
export function createPrismaKnowledgeSearchStore(prisma: PrismaClient): KnowledgeSearchStore {
  return {
    async search(storeId: string, filters: KnowledgeSearchFilters): Promise<KnowledgeSearchStoreResult> {
      const query = (filters.query ?? "").trim()
      const where: Record<string, unknown> = { storeId }

      // Solo se exponen por búsqueda los publicados salvo filtro explícito.
      const status = filters.status ?? "published"
      where.status = STATUS_FILTERS.has(status) ? status : "published"

      if (filters.type && isKnownType(filters.type)) where.type = filters.type
      if (filters.authorId) where.authorId = filters.authorId

      if (filters.from || filters.to) {
        const createdAt: Record<string, Date> = {}
        if (filters.from) createdAt.gte = new Date(filters.from)
        if (filters.to) createdAt.lte = new Date(filters.to)
        where.createdAt = createdAt
      }

      const AND: Array<Record<string, unknown>> = []
      if (filters.categoryId || filters.categorySlug) {
        AND.push({
          categories: {
            some: filters.categoryId ? { categoryId: filters.categoryId } : { category: { slug: filters.categorySlug } },
          },
        })
      }
      if (filters.tagId || filters.tagSlug) {
        AND.push({
          tags: {
            some: filters.tagId ? { tagId: filters.tagId } : { tag: { slug: filters.tagSlug } },
          },
        })
      }
      if (query) {
        AND.push({
          OR: [
            { title: { contains: query, mode: "insensitive" as const } },
            { content: { contains: query, mode: "insensitive" as const } },
            { summary: { contains: query, mode: "insensitive" as const } },
            { categories: { some: { category: { name: { contains: query, mode: "insensitive" as const } } } } },
            { tags: { some: { tag: { name: { contains: query, mode: "insensitive" as const } } } } },
          ],
        })
      }
      if (AND.length > 0) where.AND = AND

      const limit = Math.min(Math.max(filters.limit ?? 20, 1), 100)
      const offset = Math.max(filters.offset ?? 0, 0)

      const [rows, total] = await Promise.all([
        prisma.knowledgeDocument.findMany({
          where,
          orderBy: { updatedAt: "desc" },
          skip: offset,
          take: limit,
          include: {
            categories: { include: { category: { select: { id: true, name: true, slug: true, color: true } } } },
            tags: { include: { tag: { select: { id: true, name: true, slug: true } } } },
            author: { select: { name: true } },
          },
        }),
        prisma.knowledgeDocument.count({ where }),
      ])

      return {
        rows: rows.map((row) => ({
          id: row.id,
          storeId: row.storeId,
          title: row.title,
          content: row.content,
          summary: row.summary,
          type: row.type,
          source: row.source,
          status: row.status,
          fileName: row.fileName,
          fileUrl: row.fileUrl,
          fileType: row.fileType,
          fileSize: row.fileSize,
          version: row.version,
          viewCount: row.viewCount,
          authorId: row.authorId,
          authorName: row.author?.name ?? null,
          publishedAt: row.publishedAt,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
          categories: row.categories.map((jc) => ({
            id: jc.category.id,
            name: jc.category.name,
            slug: jc.category.slug,
            color: jc.category.color ?? null,
          })),
          tags: row.tags.map((jt) => ({
            id: jt.tag.id,
            name: jt.tag.name,
            slug: jt.tag.slug,
          })),
        })),
        total,
      }
    },
  }
}

// ─── Utilidades de categorías ───────────────────────────────────────────────

export { KNOWLEDGE_SYSTEM_CATEGORY_SLUGS }
