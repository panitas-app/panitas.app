import { describe, expect, it } from "vitest"
import { createTestEngine, makeMemoryItem, makeObservation, ctx, otherStoreCtx } from "./helpers"

describe("BusinessMemoryEngine (FASE 5G)", () => {
  it("consulta por intención, edita, elimina y lista", async () => {
    const engine = createTestEngine([
      makeMemoryItem({ key: "bm.preference.currency", value: { currency: "USD" }, label: "Moneda USD" }),
    ])

    const result = await engine.queryForIntent(ctx, { message: "moneda", limit: 5 })
    expect(result.items.length).toBe(1)

    const updated = await engine.update(ctx, "bm.preference.currency", {
      value: { currency: "Bs" },
      label: "Moneda Bs",
    })
    expect(updated?.value).toMatchObject({ currency: "Bs" })

    expect(await engine.list(ctx)).toHaveLength(1)
    expect(await engine.remove(ctx, "bm.preference.currency")).toBe(true)
    expect(await engine.list(ctx)).toHaveLength(0)
  })

  it("observa y consolida con umbral", async () => {
    const engine = createTestEngine([], {
      thresholds: { terminology: 3, preference: 3, operational_rule: 2, usage_pattern: 4 },
    })
    await engine.observe(ctx, makeObservation({ explicit: false }))
    expect((await engine.get(ctx, "bm.preference.currency"))?.status).toBe("candidate")
    await engine.observe(ctx, makeObservation({ explicit: false }))
    await engine.observe(ctx, makeObservation({ explicit: false }))
    expect((await engine.get(ctx, "bm.preference.currency"))?.status).toBe("confirmed")
  })

  it("activa/desactiva el aprendizaje de forma persistente", async () => {
    const engine = createTestEngine()
    expect(await engine.isLearningEnabled(ctx)).toBe(true)
    await engine.setLearningEnabled(ctx, false)
    expect(await engine.isLearningEnabled(ctx)).toBe(false)
    expect(await engine.get(ctx, "bm.settings.learning_enabled")).not.toBeNull()
  })

  it("restablece la memoria conservando la configuración", async () => {
    const engine = createTestEngine([
      makeMemoryItem({ key: "bm.preference.currency", value: { currency: "USD" } }),
      makeMemoryItem({ key: "bm.terminology.clientes", kind: "terminology", value: { term: "pacientes", standard: "clientes" } }),
    ])
    await engine.setLearningEnabled(ctx, false)
    const removed = await engine.reset(ctx)
    expect(removed).toBe(2)
    const remaining = await engine.list(ctx)
    expect(remaining).toHaveLength(1)
    expect(remaining[0].key).toBe("bm.settings.learning_enabled")
    expect(await engine.isLearningEnabled(ctx)).toBe(false)
  })

  it("estadísticas por tipo y estado", async () => {
    const engine = createTestEngine([
      makeMemoryItem({ key: "bm.terminology.clientes", kind: "terminology", status: "confirmed" }),
      makeMemoryItem({ key: "bm.preference.currency", status: "confirmed" }),
      makeMemoryItem({ key: "bm.usage_pattern.ventas", kind: "usage_pattern", status: "candidate" }),
    ])
    const stats = await engine.stats(ctx)
    expect(stats.total).toBe(3)
    expect(stats.confirmed).toBe(2)
    expect(stats.candidates).toBe(1)
    expect(stats.byKind.terminology).toBe(1)
    expect(stats.byKind.usage_pattern).toBe(1)
  })

  it("todo está aislado por storeId", async () => {
    const engine = createTestEngine([
      makeMemoryItem({ key: "bm.preference.currency", value: { currency: "USD" } }),
    ])
    expect(await engine.list(otherStoreCtx)).toHaveLength(0)
    expect(await engine.get(otherStoreCtx, "bm.preference.currency")).toBeNull()
    const stats = await engine.stats(otherStoreCtx)
    expect(stats.total).toBe(0)
  })
})
