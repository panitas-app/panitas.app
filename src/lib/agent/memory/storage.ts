/**
 * Memory Storage (FASE 3D).
 *
 * Implementación concreta de `MemoryStore` sobre el `MemoryRepository` (BD).
 * Aplica la frontera de aislamiento por `storeId` en toda operación y convierte
 * filas de Prisma a `MemoryItem` (DTO). No decide qué guardar: eso es del clasificador.
 */
import { MemoryRepository, rowToItem } from "@/repositories/memory.repository"
import type {
  MemoryContext,
  MemoryItem,
  MemoryItemInput,
  MemorySearchOptions,
  MemorySearchResult,
  MemoryStore,
} from "./types"

export class MemoryStorage implements MemoryStore {
  constructor(private readonly repo = new MemoryRepository()) {}

  async get(ctx: MemoryContext, key: string): Promise<MemoryItem | null> {
    const row = await this.repo.findByKey(this.scope(ctx), key)
    return row ? rowToItem(row as never) : null
  }

  async set(ctx: MemoryContext, input: MemoryItemInput): Promise<MemoryItem> {
    const row = await this.repo.upsert(this.scope(ctx), input)
    return rowToItem(row as never)
  }

  async search(ctx: MemoryContext, query: string, opts: MemorySearchOptions = {}): Promise<MemorySearchResult[]> {
    const rows = await this.repo.search(this.scope(ctx), {
      query: query || undefined,
      limit: opts.limit,
      minImportance: opts.minImportance,
      types: opts.types,
      includeExpired: opts.includeExpired,
    })
    return rows.map((row) => ({ item: rowToItem(row as never), score: 0 }))
  }

  async list(ctx: MemoryContext, opts: MemorySearchOptions = {}): Promise<MemoryItem[]> {
    const rows = await this.repo.list(this.scope(ctx), { limit: opts.limit, types: opts.types })
    return rows.map((row) => rowToItem(row as never))
  }

  async delete(ctx: MemoryContext, key: string): Promise<boolean> {
    return this.repo.delete(this.scope(ctx), key)
  }

  async deleteByKeys(ctx: MemoryContext, keys: string[]): Promise<number> {
    const result = await this.repo.deleteByKeys(this.scope(ctx), keys)
    return result.count
  }

  async deleteExpired(ctx: MemoryContext): Promise<number> {
    const result = await this.repo.deleteExpired(this.scope(ctx))
    return result.count
  }

  async count(ctx: MemoryContext): Promise<number> {
    return this.repo.count(this.scope(ctx))
  }

  private scope(ctx: MemoryContext): Parameters<MemoryRepository["findByKey"]>[0] {
    return { storeId: ctx.storeId, userId: ctx.userId, negocioId: ctx.negocioId ?? null }
  }
}
