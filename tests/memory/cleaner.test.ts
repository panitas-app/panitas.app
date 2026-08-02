import { describe, expect, it } from "vitest"
import { MemoryCleaner } from "@/lib/agent/memory"
import { createInMemoryMemoryStore, ctx, makeItem } from "./helpers"

describe("MemoryCleaner (FASE 3D)", () => {
  it("elimina ítems expirados", async () => {
    const store = createInMemoryMemoryStore([
      makeItem({ key: "expirado", expiresAt: new Date(Date.now() - 1000).toISOString() }),
      makeItem({ key: "vigente", expiresAt: new Date(Date.now() + 60_000).toISOString() }),
    ])
    const cleaner = new MemoryCleaner(store)
    const { expired } = await cleaner.clean(ctx)
    expect(expired).toBe(1)
    expect(await store.get(ctx, "expirado")).toBeNull()
    expect(await store.get(ctx, "vigente")).not.toBeNull()
  })

  it("hace cap por negocio: elimina primero lo menos importante y más antiguo", async () => {
    const now = new Date()
    const items = [
      makeItem({ key: "critico", importance: "CRITICAL", updatedAt: now.toISOString() }),
      makeItem({ key: "alto", importance: "HIGH", updatedAt: now.toISOString() }),
      makeItem({ key: "medio", importance: "MEDIUM", updatedAt: now.toISOString() }),
      makeItem({ key: "bajo", importance: "LOW", updatedAt: now.toISOString() }),
    ]
    const store = createInMemoryMemoryStore(items)
    const cleaner = new MemoryCleaner(store, { maxPerStore: 2 })
    const { capped } = await cleaner.clean(ctx)

    expect(capped.removed).toBe(2)
    expect(capped.kept).toBe(2)
    expect(await store.get(ctx, "critico")).not.toBeNull()
    expect(await store.get(ctx, "alto")).not.toBeNull()
    expect(await store.get(ctx, "bajo")).toBeNull()
    expect(await store.get(ctx, "medio")).toBeNull()
  })

  it("no borra nada si está por debajo del límite", async () => {
    const store = createInMemoryMemoryStore([makeItem({ key: "uno" }), makeItem({ key: "dos" })])
    const cleaner = new MemoryCleaner(store, { maxPerStore: 500 })
    const { capped } = await cleaner.clean(ctx)
    expect(capped).toEqual({ removed: 0, kept: 2 })
  })

  it("respeta la frontera de negocio en la limpieza", async () => {
    const store = createInMemoryMemoryStore([
      makeItem({ key: "a", storeId: "store-1", importance: "LOW" }),
      makeItem({ key: "b", storeId: "store-2", importance: "LOW" }),
    ])
    const cleaner = new MemoryCleaner(store, { maxPerStore: 0 })
    await cleaner.clean(ctx)
    expect(await store.get(ctx, "a")).toBeNull()
    expect(await store.get({ userId: "u", storeId: "store-2", negocioId: null }, "b")).not.toBeNull()
  })
})
