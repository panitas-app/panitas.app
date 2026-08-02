import type {
  MemoryContext,
  MemoryItem,
  MemoryItemInput,
  MemorySearchOptions,
  MemorySearchResult,
  MemoryStore,
} from "@/lib/agent/memory"

let seq = 0

export function makeItem(overrides: Partial<MemoryItem> = {}): MemoryItem {
  seq += 1
  const now = new Date()
  return {
    id: `mem-${seq}`,
    storeId: "store-1",
    userId: "user-1",
    negocioId: null,
    scope: "store",
    type: "long_term",
    kind: "fact",
    importance: "MEDIUM",
    key: `key-${seq}`,
    value: "valor de ejemplo",
    source: "test",
    expiresAt: undefined,
    accessCount: 0,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    ...overrides,
  }
}

/** Implementación en memoria de `MemoryStore` para tests (respeta la frontera por storeId). */
export function createInMemoryMemoryStore(seed: MemoryItem[] = []): MemoryStore & { items: Map<string, MemoryItem> } {
  const items = new Map<string, MemoryItem>()
  for (const item of seed) items.set(`${item.storeId}:${item.key}`, { ...item })

  function withinStore(items: MemoryItem[], ctx: MemoryContext): MemoryItem[] {
    return items.filter((i) => {
      if (i.storeId !== ctx.storeId) return false
      if (i.scope === "store") return true
      return i.userId === ctx.userId
    })
  }

  return {
    items,
    async get(ctx, key) {
      return withinStore([...items.values()], ctx).find((i) => i.key === key) ?? null
    },
    async set(ctx, input: MemoryItemInput) {
      const existing = withinStore([...items.values()], ctx).find((i) => i.key === input.key)
      const item: MemoryItem = {
        id: existing?.id ?? `mem-${++seq}`,
        storeId: ctx.storeId,
        userId: existing?.userId ?? ctx.userId,
        negocioId: existing?.negocioId ?? ctx.negocioId ?? null,
        scope: input.scope ?? existing?.scope ?? "store",
        type: input.type ?? existing?.type ?? "long_term",
        kind: input.kind ?? existing?.kind ?? "fact",
        importance: input.importance ?? existing?.importance ?? "MEDIUM",
        key: input.key,
        value: input.value ?? existing?.value,
        metadata: input.metadata ?? existing?.metadata,
        source: input.source ?? existing?.source,
        expiresAt: input.expiresAt ?? existing?.expiresAt,
        accessCount: existing?.accessCount ?? 0,
        createdAt: existing?.createdAt ?? new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      items.set(`${ctx.storeId}:${input.key}`, item)
      return item
    },
    async search(ctx, _query, _opts) {
      const scopeItems = withinStore([...items.values()], ctx)
      const results: MemorySearchResult[] = scopeItems.map((item) => ({ item, score: 0.5 }))
      return results.slice(0, _opts?.limit ?? 8)
    },
    async list(ctx, opts: MemorySearchOptions = {}) {
      let scopeItems = withinStore([...items.values()], ctx)
      if (opts.types) scopeItems = scopeItems.filter((i) => opts.types!.includes(i.type))
      if (opts.limit) scopeItems = scopeItems.slice(0, opts.limit)
      return scopeItems
    },
    async delete(ctx, key) {
      const match = withinStore([...items.values()], ctx).find((i) => i.key === key)
      if (!match) return false
      items.delete(`${ctx.storeId}:${key}`)
      return true
    },
    async deleteByKeys(ctx, keys) {
      const target = withinStore([...items.values()], ctx).filter((i) => keys.includes(i.key))
      for (const item of target) items.delete(`${item.storeId}:${item.key}`)
      return target.length
    },
    async deleteExpired(ctx) {
      const now = Date.now()
      const target = withinStore([...items.values()], ctx).filter((i) => i.expiresAt && new Date(i.expiresAt).getTime() < now)
      for (const item of target) items.delete(`${item.storeId}:${item.key}`)
      return target.length
    },
    async count(ctx) {
      return withinStore([...items.values()], ctx).length
    },
  }
}

export const ctx: MemoryContext = { userId: "user-1", storeId: "store-1", negocioId: null }
export const otherStoreCtx: MemoryContext = { userId: "user-9", storeId: "store-2", negocioId: null }
