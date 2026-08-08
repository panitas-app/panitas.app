import { describe, expect, it } from "vitest"
import { createInMemoryBusinessMemoryStore } from "@/lib/business-memory/memory-store"
import { makeMemoryItem, ctx, otherStoreCtx } from "./helpers"

describe("BusinessMemoryStore en memoria (FASE 5G)", () => {
  it("persiste y recupera un ítem por (storeId, key)", async () => {
    const store = createInMemoryBusinessMemoryStore()
    const item = makeMemoryItem({ key: "bm.preference.currency", value: { currency: "USD" } })
    await store.put(ctx, item)
    const found = await store.get(ctx, "bm.preference.currency")
    expect(found).toMatchObject({ key: "bm.preference.currency", value: { currency: "USD" } })
  })

  it("actualiza por upsert sin duplicar", async () => {
    const store = createInMemoryBusinessMemoryStore()
    await store.put(ctx, makeMemoryItem({ key: "bm.preference.currency", label: "A" }))
    await store.put(ctx, makeMemoryItem({ key: "bm.preference.currency", label: "B" }))
    const items = await store.list(ctx)
    expect(items).toHaveLength(1)
    expect(items[0].label).toBe("B")
  })

  it("lista filtrando por tipo y estado, excluyendo expirados por defecto", async () => {
    const store = createInMemoryBusinessMemoryStore()
    await store.put(ctx, makeMemoryItem({ key: "bm.terminology.cliente", kind: "terminology", status: "confirmed", expiresAt: null }))
    await store.put(ctx, makeMemoryItem({ key: "bm.preference.currency", kind: "preference", status: "confirmed" }))
    await store.put(ctx, makeMemoryItem({
      key: "bm.usage_pattern.ventas",
      kind: "usage_pattern",
      status: "candidate",
      expiresAt: new Date(Date.now() - 1000).toISOString(),
    }))

    expect(await store.list(ctx)).toHaveLength(2)
    expect(await store.list(ctx, { status: "candidate", includeExpired: true })).toHaveLength(1)
    expect(await store.list(ctx, { kinds: ["terminology"] })).toHaveLength(1)
  })

  it("aísla por storeId (un negocio jamás ve memoria de otro)", async () => {
    const store = createInMemoryBusinessMemoryStore()
    await store.put(ctx, makeMemoryItem({ key: "bm.preference.currency" }))
    expect(await store.get(otherStoreCtx, "bm.preference.currency")).toBeNull()
    expect(await store.list(otherStoreCtx)).toHaveLength(0)
    expect(await store.remove(otherStoreCtx, "bm.preference.currency")).toBe(false)
    expect(await store.get(ctx, "bm.preference.currency")).not.toBeNull()
  })

  it("registra accesos con touch sin alterar updatedAt", async () => {
    const store = createInMemoryBusinessMemoryStore()
    await store.put(ctx, makeMemoryItem({ key: "bm.preference.currency" }))
    await store.touch(ctx, "bm.preference.currency")
    const item = await store.get(ctx, "bm.preference.currency")
    expect(item?.accessCount).toBe(1)
    expect(item?.lastAccessAt).toBeDefined()
  })

  it("removeAll excluye las claves protegidas (configuración)", async () => {
    const store = createInMemoryBusinessMemoryStore()
    await store.put(ctx, makeMemoryItem({ key: "bm.preference.currency" }))
    await store.put(ctx, makeMemoryItem({ key: "bm.settings.learning_enabled", value: false }))
    const removed = await store.removeAll(ctx, { excludeKeys: ["bm.settings.learning_enabled"] })
    expect(removed).toBe(1)
    expect(await store.get(ctx, "bm.settings.learning_enabled")).not.toBeNull()
    expect(await store.count(ctx)).toBe(1)
  })
})
