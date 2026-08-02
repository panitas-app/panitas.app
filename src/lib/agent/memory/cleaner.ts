/**
 * Memory Cleaner (FASE 3D).
 *
 * Mantiene la memoria sana: elimina ítems expirados y limita el número de ítems
 * por negocio (por defecto 500). En el límite se eliminan primero los menos
 * importantes y más antiguos (nunca los CRITICAL si hay otra opción).
 */
import { MEMORY_IMPORTANCE_ORDER } from "./types"
import type { MemoryContext, MemoryItem, MemoryStore } from "./types"

export interface MemoryCleanerOptions {
  /** Límite de ítems por negocio. */
  maxPerStore?: number
  /** Listar hasta N ítems para evaluar el límite. */
  scanLimit?: number
}

function priority(item: MemoryItem): number {
  return MEMORY_IMPORTANCE_ORDER[item.importance] * 1_000_000 - new Date(item.updatedAt).getTime()
}

export class MemoryCleaner {
  private readonly maxPerStore: number
  private readonly scanLimit: number

  constructor(private readonly store: MemoryStore, options: MemoryCleanerOptions = {}) {
    this.maxPerStore = options.maxPerStore ?? 500
    this.scanLimit = options.scanLimit ?? 1000
  }

  async deleteExpired(ctx: MemoryContext): Promise<number> {
    return this.store.deleteExpired(ctx)
  }

  /** Elimina el excedente por encima del límite (menos importante/antiguo primero). */
  async enforceCap(ctx: MemoryContext): Promise<{ removed: number; kept: number }> {
    const count = await this.store.count(ctx)
    if (count <= this.maxPerStore) return { removed: 0, kept: count }

    const items = await this.store.list(ctx, { limit: this.scanLimit })
    const excess = count - this.maxPerStore
    const sorted = [...items].sort((a, b) => priority(a) - priority(b))
    const toRemove = sorted.slice(0, excess)

    if (toRemove.length === 0) return { removed: 0, kept: count }
    await this.store.deleteByKeys(ctx, toRemove.map((i) => i.key))
    return { removed: toRemove.length, kept: count - toRemove.length }
  }

  /** Limpieza completa del negocio (expiración + límite). */
  async clean(ctx: MemoryContext): Promise<{ expired: number; capped: { removed: number; kept: number } }> {
    const expired = await this.deleteExpired(ctx)
    const capped = await this.enforceCap(ctx)
    return { expired, capped }
  }
}
