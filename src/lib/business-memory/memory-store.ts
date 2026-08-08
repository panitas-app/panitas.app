/**
 * Almacenamiento de la memoria estable del negocio (FASE 5G).
 *
 * Implementaciones:
 *
 *   - `createInMemoryBusinessMemoryStore`: implementación en memoria para tests
 *     (respeta la frontera por `storeId`).
 *   - `PrismaBusinessMemoryStore`: persistencia real sobre la tabla
 *     `BusinessMemory` (FASE 3D), SIEMPRE con `storeId` en el `where`
 *     (aislamiento por tenant garantizado) y `scope="store"`.
 *
 * Ambas implementan la misma interfaz `BusinessMemoryStore` de `memory-types`.
 */
import { prisma } from "@/lib/prisma"
import type {
  BusinessMemoryItem,
  BusinessMemoryListOptions,
  BusinessMemoryMetadata,
  BusinessMemoryStore,
  BusinessMemoryKind,
} from "./memory-types"
import { BUSINESS_MEMORY_KEY_PREFIX } from "./memory-types"
import type { MemoryContext } from "@/lib/agent/memory"

function isBusinessKey(key: string): boolean {
  return key.startsWith(BUSINESS_MEMORY_KEY_PREFIX)
}

/** Claves que sobreviven a un reset (configuración del negocio). */
export const SETTINGS_LEARNING_ENABLED_KEY = `${BUSINESS_MEMORY_KEY_PREFIX}settings.learning_enabled`

interface StoredMetadata extends BusinessMemoryMetadata {
  /** Etiqueta humana (la tabla no tiene columna `label`, vive en metadata). */
  label?: string
}

function toMetadata(raw: string | null, fallback: StoredMetadata): StoredMetadata {
  if (!raw) return fallback
  try {
    return { ...fallback, ...(JSON.parse(raw) as Partial<StoredMetadata>) }
  } catch {
    return fallback
  }
}

function parseValue(raw: string): unknown {
  try {
    return JSON.parse(raw)
  } catch {
    return raw
  }
}

// ─── Implementación en memoria (tests) ─────────────────────────────────────────

export function createInMemoryBusinessMemoryStore(): BusinessMemoryStore & { items: Map<string, BusinessMemoryItem> } {
  const items = new Map<string, BusinessMemoryItem>()
  let seq = 0

  return {
    items,
    async get(ctx, key) {
      const item = items.get(`${ctx.storeId}:${key}`)
      return item && item.storeId === ctx.storeId ? item : null
    },
    async put(ctx, item) {
      const stored = { ...item, id: item.id || `bm-mem-${++seq}` }
      items.set(`${ctx.storeId}:${stored.key}`, stored)
      return stored
    },
    async list(ctx, opts: BusinessMemoryListOptions = {}) {
      let result = [...items.values()].filter((i) => {
        if (i.storeId !== ctx.storeId) return false
        if (!isBusinessKey(i.key)) return false
        if (!opts.includeExpired && i.expiresAt && new Date(i.expiresAt).getTime() < Date.now()) return false
        if (opts.kinds && opts.kinds.length > 0 && !opts.kinds.includes(i.kind)) return false
        if (opts.status && i.status !== opts.status) return false
        return true
      })
      result = result.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      if (opts.limit) result = result.slice(0, opts.limit)
      return result
    },
    async remove(ctx, key) {
      return items.delete(`${ctx.storeId}:${key}`)
    },
    async removeAll(ctx, opts = {}) {
      const excluded = new Set(opts.excludeKeys ?? [])
      let removed = 0
      for (const [mapKey, item] of [...items.entries()]) {
        if (item.storeId !== ctx.storeId) continue
        if (!isBusinessKey(item.key)) continue
        if (excluded.has(item.key)) continue
        items.delete(mapKey)
        removed += 1
      }
      return removed
    },
    async count(ctx) {
      return [...items.values()].filter((i) => i.storeId === ctx.storeId && isBusinessKey(i.key)).length
    },
    async touch(ctx, key) {
      const item = items.get(`${ctx.storeId}:${key}`)
      if (!item) return
      items.set(`${ctx.storeId}:${key}`, {
        ...item,
        accessCount: item.accessCount + 1,
        lastAccessAt: new Date().toISOString(),
      })
    },
  }
}

// ─── Implementación Prisma (producción) ────────────────────────────────────────

type BusinessMemoryRow = {
  id: string
  storeId: string
  userId: string
  negocioId: string | null
  kind: string
  importance: string
  key: string
  value: string
  metadata: string | null
  source: string
  status: string
  expiresAt: Date | null
  lastAccessAt: Date | null
  accessCount: number
  createdAt: Date
  updatedAt: Date
}

function rowToBusinessMemory(row: BusinessMemoryRow): BusinessMemoryItem {
  const metadata = toMetadata(row.metadata, {
    source: row.source as BusinessMemoryItem["source"],
    status: row.status as BusinessMemoryItem["status"],
    strength: 0,
    threshold: 1,
    tags: [],
  })
  return {
    id: row.id,
    storeId: row.storeId,
    userId: row.userId,
    negocioId: row.negocioId,
    kind: row.kind as BusinessMemoryKind,
    importance: row.importance as BusinessMemoryItem["importance"],
    key: row.key,
    label: metadata.label ?? "Memoria del negocio",
    value: parseValue(row.value),
    metadata,
    source: metadata.source,
    status: metadata.status,
    expiresAt: row.expiresAt ? row.expiresAt.toISOString() : null,
    lastAccessAt: row.lastAccessAt ? row.lastAccessAt.toISOString() : undefined,
    accessCount: row.accessCount,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

function toRow(item: BusinessMemoryItem): BusinessMemoryRow {
  return {
    id: item.id,
    storeId: item.storeId,
    userId: item.userId,
    negocioId: item.negocioId,
    kind: item.kind,
    importance: item.importance,
    key: item.key,
    value: typeof item.value === "string" ? item.value : JSON.stringify(item.value ?? null),
    metadata: JSON.stringify({ ...item.metadata, label: item.label }),
    source: item.source,
    status: item.status,
    expiresAt: item.expiresAt ? new Date(item.expiresAt) : null,
    lastAccessAt: item.lastAccessAt ? new Date(item.lastAccessAt) : null,
    accessCount: item.accessCount,
    createdAt: new Date(item.createdAt),
    updatedAt: new Date(item.updatedAt),
  }
}

export class PrismaBusinessMemoryStore implements BusinessMemoryStore {
  constructor(private readonly db = prisma) {}

  private where(ctx: MemoryContext) {
    return {
      storeId: ctx.storeId,
      scope: "store" as const,
      key: { startsWith: BUSINESS_MEMORY_KEY_PREFIX },
    }
  }

  async get(ctx: MemoryContext, key: string): Promise<BusinessMemoryItem | null> {
    const row = await this.db.businessMemory.findFirst({
      where: { ...this.where(ctx), key },
    })
    return row ? rowToBusinessMemory(row as unknown as BusinessMemoryRow) : null
  }

  async put(ctx: MemoryContext, item: BusinessMemoryItem): Promise<BusinessMemoryItem> {
    const row = toRow(item)
    const saved = await this.db.businessMemory.upsert({
      where: { storeId_key: { storeId: ctx.storeId, key: item.key } },
      create: {
        storeId: ctx.storeId,
        userId: item.userId,
        negocioId: item.negocioId,
        scope: "store",
        type: "business",
        kind: item.kind,
        importance: item.importance,
        key: item.key,
        value: row.value,
        metadata: row.metadata,
        source: item.source,
        expiresAt: row.expiresAt,
        lastAccessAt: row.lastAccessAt,
        accessCount: item.accessCount,
      },
      update: {
        kind: item.kind,
        importance: item.importance,
        value: row.value,
        metadata: row.metadata,
        source: item.source,
        expiresAt: row.expiresAt,
        accessCount: item.accessCount,
        updatedAt: new Date(),
      },
    })
    return rowToBusinessMemory(saved as unknown as BusinessMemoryRow)
  }

  async list(ctx: MemoryContext, opts: BusinessMemoryListOptions = {}): Promise<BusinessMemoryItem[]> {
    const where: Record<string, unknown> = { ...this.where(ctx) }
    if (opts.kinds && opts.kinds.length > 0) where.kind = { in: opts.kinds }
    if (opts.status) where.status = opts.status
    if (!opts.includeExpired) {
      where.OR = [{ expiresAt: null }, { expiresAt: { gt: new Date() } }]
    }
    const rows = await this.db.businessMemory.findMany({
      where,
      orderBy: [{ updatedAt: "desc" }],
      take: opts.limit,
    })
    return rows.map((r) => rowToBusinessMemory(r as unknown as BusinessMemoryRow))
  }

  async remove(ctx: MemoryContext, key: string): Promise<boolean> {
    const result = await this.db.businessMemory.deleteMany({ where: { ...this.where(ctx), key } })
    return result.count > 0
  }

  async removeAll(ctx: MemoryContext, opts: { excludeKeys?: string[] } = {}): Promise<number> {
    const excluded = opts.excludeKeys ?? []
    const result = await this.db.businessMemory.deleteMany({
      where: {
        ...this.where(ctx),
        ...(excluded.length > 0 ? { key: { notIn: excluded } } : {}),
      },
    })
    return result.count
  }

  async count(ctx: MemoryContext): Promise<number> {
    return this.db.businessMemory.count({ where: this.where(ctx) })
  }

  async touch(ctx: MemoryContext, key: string): Promise<void> {
    await this.db.businessMemory.updateMany({
      where: { ...this.where(ctx), key },
      data: { accessCount: { increment: 1 }, lastAccessAt: new Date() },
    })
  }
}

/** Store por defecto en producción. */
export function createDefaultBusinessMemoryStore(): BusinessMemoryStore {
  return new PrismaBusinessMemoryStore()
}
