/**
 * Memory Manager (FASE 3D).
 *
 * Fachada del Memory System: orquesta clasificación, almacenamiento, recuperación
 * y limpieza. Responsabilidades:
 *
 *   - `remember`: guarda (o actualiza) un ítem; clasifica si falta la importancia.
 *   - `recall` / `forget`: acceso directo por clave.
 *   - `search`: recupera memoria relevante para una pregunta (scoring).
 *   - `saveTurn`: extrae y guarda los hechos de un turno de chat (best-effort).
 *   - `buildMemoryContext`: formatea la memoria recuperada como texto para el agente.
 *   - `clean`: limpieza (expiración + límite por negocio).
 *
 * Emite eventos (`memory.created/updated/deleted`) y audita. Regla de capas:
 * el manager NUNCA toca Prisma; usa `MemoryStore` (BD).
 */
import { eventService } from "@/events/event.service"
import { createAuditEntry } from "@/lib/audit"
import type { MemoryClassifier } from "./classifier"
import { MemoryClassifier as DefaultClassifier } from "./classifier"
import type { MemoryCleaner } from "./cleaner"
import { MemoryCleaner as DefaultCleaner } from "./cleaner"
import type { MemoryExtractor } from "./extractor"
import { DefaultMemoryExtractor } from "./extractor"
import type { MemoryRetriever } from "./retriever"
import { MemoryRetriever as DefaultRetriever } from "./retriever"
import { MemoryStorage as DefaultStorage } from "./storage"
import type {
  MemoryContext,
  MemoryItem,
  MemoryItemInput,
  MemorySearchOptions,
  MemorySearchResult,
  MemoryStore,
  MemoryTurn,
} from "./types"

export const MEMORY_CONTEXT_FORMAT_LIMIT = 2500

export interface MemoryManagerOptions {
  store?: MemoryStore
  classifier?: MemoryClassifier
  retriever?: MemoryRetriever
  cleaner?: MemoryCleaner
  extractor?: MemoryExtractor
}

export class MemoryManager {
  private readonly store: MemoryStore
  private readonly classifier: MemoryClassifier
  private readonly retriever: MemoryRetriever
  private readonly cleaner: MemoryCleaner
  private readonly extractor: MemoryExtractor

  constructor(options: MemoryManagerOptions = {}) {
    const storage = options.store ?? new DefaultStorage()
    this.store = storage
    this.classifier = options.classifier ?? new DefaultClassifier()
    this.retriever = options.retriever ?? new DefaultRetriever(storage)
    this.cleaner = options.cleaner ?? new DefaultCleaner(storage)
    this.extractor = options.extractor ?? new DefaultMemoryExtractor(this.classifier)
  }

  /** Guarda o actualiza un ítem (upsert por storeId+key). */
  async remember(ctx: MemoryContext, input: MemoryItemInput): Promise<MemoryItem> {
    const resolved: MemoryItemInput = { ...input }

    if (!resolved.importance || !resolved.type || !resolved.kind) {
      const classified = this.classifier.classify({ content: stringifyValue(input.value), source: "system" })
      resolved.importance = resolved.importance ?? classified.importance
      resolved.type = resolved.type ?? classified.type
      resolved.kind = resolved.kind ?? classified.kind
      resolved.expiresAt = resolved.expiresAt ?? classified.expiresAt ?? null
    }

    const existing = await this.store.get(ctx, input.key)
    const item = await this.store.set(ctx, resolved)

    eventService.emit(existing ? "memory.updated" : "memory.created", {
      storeId: ctx.storeId,
      userId: ctx.userId,
      key: item.key,
      type: item.type,
      importance: item.importance,
      kind: item.kind,
    })
    createAuditEntry({
      action: existing ? "memory.updated" : "memory.created",
      entity: "BusinessMemory",
      entityId: item.id,
      metadata: { key: item.key, importance: item.importance, kind: item.kind, type: item.type },
      userId: ctx.userId,
      storeId: ctx.storeId,
    }).catch(() => undefined)

    return item
  }

  async recall(ctx: MemoryContext, key: string): Promise<MemoryItem | null> {
    return this.store.get(ctx, key)
  }

  async forget(ctx: MemoryContext, key: string): Promise<boolean> {
    const deleted = await this.store.delete(ctx, key)
    if (deleted) {
      eventService.emit("memory.deleted", { storeId: ctx.storeId, userId: ctx.userId, key })
      createAuditEntry({
        action: "memory.deleted",
        entity: "BusinessMemory",
        metadata: { key },
        userId: ctx.userId,
        storeId: ctx.storeId,
      }).catch(() => undefined)
    }
    return deleted
  }

  /** Recupera la memoria relevante para una pregunta, ordenada por score. */
  search(ctx: MemoryContext, query: string, options: MemorySearchOptions = {}): Promise<MemorySearchResult[]> {
    return this.retriever.retrieve(ctx, query, options)
  }

  /** Lista la memoria del negocio (sin scoring), respetando la frontera de aislamiento. */
  list(ctx: MemoryContext, options: MemorySearchOptions = {}): Promise<MemoryItem[]> {
    return this.store.list(ctx, { limit: options.limit, types: options.types })
  }

  /** Extrae y guarda los hechos de un turno (nunca lanza: best-effort). */
  async saveTurn(ctx: MemoryContext, turn: MemoryTurn): Promise<MemoryItem[]> {
    let candidates: MemoryItemInput[] = []
    try {
      candidates = await this.extractor.extract(turn)
    } catch (error) {
      console.error("[memory] saveTurn: el extractor falló", error)
      return []
    }
    const saved: MemoryItem[] = []
    for (const candidate of candidates) {
      try {
        saved.push(await this.remember(ctx, candidate))
      } catch (error) {
        console.error("[memory] saveTurn falló al guardar", candidate.key, error)
      }
    }
    return saved
  }

  /** Formatea la memoria recuperada como texto compacto para el agente. */
  async buildMemoryContext(ctx: MemoryContext, query: string, options: MemorySearchOptions = {}): Promise<string> {
    const results = await this.retriever.retrieve(ctx, query, { ...options, limit: options.limit ?? 8 })
    if (results.length === 0) return ""

    const lines: string[] = ["Memoria relevante del negocio:"]
    for (const { item } of results) {
      lines.push(`- [${item.importance}] ${formatValue(item)}`)
    }

    const text = lines.join("\n")
    return text.length > MEMORY_CONTEXT_FORMAT_LIMIT ? `${text.slice(0, MEMORY_CONTEXT_FORMAT_LIMIT)}…` : text
  }

  /** Limpieza completa (expiración + límite por negocio). */
  clean(ctx: MemoryContext) {
    return this.cleaner.clean(ctx)
  }
}

function stringifyValue(value: unknown): string {
  if (value === null || value === undefined) return ""
  return typeof value === "string" ? value : JSON.stringify(value)
}

function formatValue(item: MemoryItem): string {
  const value = item.value
  const text = typeof value === "string" ? value : JSON.stringify(value)
  return text.length > 200 ? `${text.slice(0, 200)}…` : text
}
