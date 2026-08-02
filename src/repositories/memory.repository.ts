import { Prisma, PrismaClient } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import type { MemoryImportance, MemoryItem, MemoryItemInput, MemoryKind, MemoryScope, MemoryType } from "@/lib/agent/memory/types"

/**
 * Memory Repository (FASE 3D).
 *
 * Único punto de acceso a BD para la memoria del negocio. Regla de aislamiento:
 * TODA query lleva `storeId` en el `where` (el Negocio A jamás toca memoria del B).
 * Los ítems `scope="user"` además exigen el `userId` del autor.
 */
export type MemoryScopeFilter = {
  storeId: string
  userId: string
  negocioId?: string | null
}

export type MemorySearchFilters = {
  query?: string
  limit?: number
  minImportance?: MemoryImportance
  types?: MemoryType[]
  includeExpired?: boolean
}

type PrismaMemoryRow = {
  id: string
  storeId: string
  userId: string
  negocioId: string | null
  scope: string
  type: string
  kind: string
  importance: string
  key: string
  value: string
  metadata: string | null
  source: string | null
  expiresAt: Date | null
  lastAccessAt: Date | null
  accessCount: number
  createdAt: Date
  updatedAt: Date
}

export class MemoryRepository {
  constructor(private readonly db: PrismaClient = prisma) {}

  /** Frontera de aislamiento: storeId siempre; userId solo para ítems personales. */
  private scopeWhere(scope: MemoryScopeFilter): Prisma.BusinessMemoryWhereInput {
    return {
      storeId: scope.storeId,
      OR: [{ scope: "store" }, { scope: "user", userId: scope.userId }],
    }
  }

  findByKey(scope: MemoryScopeFilter, key: string) {
    return this.db.businessMemory.findFirst({
      where: { ...this.scopeWhere(scope), key },
    })
  }

  /** Inserta o actualiza por (storeId, key). Nunca duplica un hecho. */
  async upsert(scope: MemoryScopeFilter, input: MemoryItemInput) {
    const data = this.toData(scope, input)
    return this.db.businessMemory.upsert({
      where: { storeId_key: { storeId: scope.storeId, key: input.key } },
      create: data,
      update: {
        value: data.value,
        metadata: data.metadata,
        source: data.source,
        type: data.type,
        kind: data.kind,
        importance: data.importance,
        scope: data.scope,
        negocioId: data.negocioId,
        expiresAt: data.expiresAt,
        updatedAt: new Date(),
      },
    })
  }

  async search(scope: MemoryScopeFilter, filters: MemorySearchFilters) {
    const and: Prisma.BusinessMemoryWhereInput[] = [this.scopeWhere(scope)]

    if (filters.query) {
      and.push({
        OR: [
          { key: { contains: filters.query, mode: "insensitive" } },
          { value: { contains: filters.query, mode: "insensitive" } },
          { kind: { contains: filters.query, mode: "insensitive" } },
        ],
      })
    }
    if (filters.types && filters.types.length > 0) and.push({ type: { in: filters.types } })
    if (filters.minImportance) and.push({ importance: { in: this.importanceAndAbove(filters.minImportance) } })
    if (!filters.includeExpired) {
      and.push({ OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] })
    }

    return this.db.businessMemory.findMany({
      where: { AND: and },
      orderBy: [{ updatedAt: "desc" }],
      take: filters.limit,
    })
  }

  list(scope: MemoryScopeFilter, filters: { limit?: number; types?: MemoryType[] } = {}) {
    const where: Prisma.BusinessMemoryWhereInput = this.scopeWhere(scope)
    if (filters.types && filters.types.length > 0) where.type = { in: filters.types }
    return this.db.businessMemory.findMany({
      where,
      orderBy: [{ importance: "desc" }, { updatedAt: "desc" }],
      take: filters.limit,
    })
  }

  count(scope: MemoryScopeFilter) {
    return this.db.businessMemory.count({ where: this.scopeWhere(scope) })
  }

  /** Elimina un ítem solo si está dentro del scope. */
  async delete(scope: MemoryScopeFilter, key: string) {
    const result = await this.db.businessMemory.deleteMany({
      where: { ...this.scopeWhere(scope), key },
    })
    return result.count > 0
  }

  deleteExpired(scope: MemoryScopeFilter) {
    return this.db.businessMemory.deleteMany({
      where: { ...this.scopeWhere(scope), expiresAt: { lte: new Date() } },
    })
  }

  /** Elimina por claves, respetando el scope (usado por el cleaner para límites). */
  deleteByKeys(scope: MemoryScopeFilter, keys: string[]) {
    return this.db.businessMemory.deleteMany({
      where: { ...this.scopeWhere(scope), key: { in: keys } },
    })
  }

  touchAccess(scope: MemoryScopeFilter, key: string) {
    return this.db.businessMemory.updateMany({
      where: { ...this.scopeWhere(scope), key },
      data: { accessCount: { increment: 1 }, lastAccessAt: new Date() },
    })
  }

  private toData(scope: MemoryScopeFilter, input: MemoryItemInput): Prisma.BusinessMemoryUncheckedCreateInput {
    return {
      storeId: scope.storeId,
      userId: scope.userId,
      negocioId: scope.negocioId ?? null,
      scope: input.scope ?? "store",
      type: input.type ?? "long_term",
      kind: input.kind ?? "fact",
      importance: input.importance ?? "MEDIUM",
      key: input.key,
      value: typeof input.value === "string" ? input.value : JSON.stringify(input.value ?? null),
      metadata: input.metadata ? JSON.stringify(input.metadata) : null,
      source: input.source ?? null,
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
    }
  }

  private importanceAndAbove(importance: MemoryImportance): MemoryImportance[] {
    const order: MemoryImportance[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"]
    return order.slice(order.indexOf(importance))
  }
}

/** Convierte una fila de BD en un `MemoryItem` (DTO plano, value ya parseado). */
export function rowToItem(row: PrismaMemoryRow): MemoryItem {
  return {
    id: row.id,
    storeId: row.storeId,
    userId: row.userId,
    negocioId: row.negocioId,
    scope: row.scope as MemoryScope,
    type: row.type as MemoryType,
    kind: row.kind as MemoryKind,
    importance: row.importance as MemoryImportance,
    key: row.key,
    value: parseStoredValue(row.value),
    metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
    source: row.source ?? undefined,
    expiresAt: row.expiresAt ? row.expiresAt.toISOString() : undefined,
    lastAccessAt: row.lastAccessAt ? row.lastAccessAt.toISOString() : undefined,
    accessCount: row.accessCount,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

function parseStoredValue(raw: string): unknown {
  try {
    return JSON.parse(raw)
  } catch {
    return raw
  }
}
