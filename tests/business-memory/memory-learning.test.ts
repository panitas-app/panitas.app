import { describe, expect, it } from "vitest"
import { BusinessMemoryLearner } from "@/lib/business-memory/memory-learning"
import { createInMemoryBusinessMemoryStore } from "@/lib/business-memory/memory-store"
import type { LearningConfig } from "@/lib/business-memory"
import { makeObservation, ctx, otherStoreCtx } from "./helpers"

function makeHarness(config: Partial<LearningConfig> = {}) {
  const store = createInMemoryBusinessMemoryStore()
  const learner = new BusinessMemoryLearner(store, config)
  return { learner, store }
}

describe("BusinessMemoryLearner (FASE 5G)", () => {
  it("consolida de inmediato una observación explícita", async () => {
    const { learner, store } = makeHarness()
    const item = await learner.observe(ctx, makeObservation({ explicit: true }))
    expect(item?.status).toBe("confirmed")
    expect(item?.metadata.source).toBe("explicit")
    expect(item?.importance).toBe("HIGH")
    expect(await store.get(ctx, "bm.preference.currency")).not.toBeNull()
  })

  it("NUNCA consolida con una sola acción repetitiva (sigue candidato)", async () => {
    const { learner } = makeHarness({ thresholds: { terminology: 3, preference: 3, operational_rule: 2, usage_pattern: 4 } })
    const item = await learner.observe(ctx, makeObservation())
    expect(item?.status).toBe("candidate")
    expect(item?.metadata.strength).toBe(1)
    expect(item?.metadata.threshold).toBe(3)
    expect(item?.expiresAt).toBeDefined()
  })

  it("consolida un candidato al cruzar el umbral por repetición", async () => {
    const { learner, store } = makeHarness({ thresholds: { terminology: 3, preference: 3, operational_rule: 2, usage_pattern: 4 } })
    for (let i = 0; i < 3; i++) {
      await learner.observe(ctx, makeObservation())
    }
    const item = await store.get(ctx, "bm.preference.currency")
    expect(item?.status).toBe("confirmed")
    expect(item?.metadata.strength).toBe(3)
    expect(item?.expiresAt).toBeNull()
  })

  it("respeta el umbral configurable por tipo (patrones de uso: 4)", async () => {
    const { learner, store } = makeHarness({ thresholds: { terminology: 3, preference: 3, operational_rule: 2, usage_pattern: 4 } })
    for (let i = 0; i < 3; i++) {
      await learner.observe(ctx, makeObservation({ kind: "usage_pattern", key: "bm.usage_pattern.ventas" }))
    }
    expect((await store.get(ctx, "bm.usage_pattern.ventas"))?.status).toBe("candidate")
    await learner.observe(ctx, makeObservation({ kind: "usage_pattern", key: "bm.usage_pattern.ventas" }))
    expect((await store.get(ctx, "bm.usage_pattern.ventas"))?.status).toBe("confirmed")
  })

  it("no aprende cuando el aprendizaje está desactivado", async () => {
    const { learner, store } = makeHarness()
    await learner.setLearningEnabled(ctx, false)
    expect(await learner.isLearningEnabled(ctx)).toBe(false)
    const item = await learner.observe(ctx, makeObservation({ explicit: true }))
    expect(item).toBeNull()
    expect(await store.count(ctx)).toBe(1) // solo el setting
  })

  it("el aprendizaje se desactiva por negocio (aislado)", async () => {
    const { learner } = makeHarness()
    await learner.setLearningEnabled(ctx, false)
    expect(await learner.isLearningEnabled(otherStoreCtx)).toBe(true)
  })

  it("aprende de un turno completo (terminología explícita)", async () => {
    const { learner, store } = makeHarness()
    const learned = await learner.learnFromTurn(ctx, { message: "yo llamo pacientes a mis clientes" })
    expect(learned).toBeGreaterThan(0)
    const item = await store.get(ctx, "bm.terminology.clientes")
    expect(item?.status).toBe("confirmed")
    expect(item?.value).toMatchObject({ term: "pacientes", standard: "clientes" })
  })

  it("aprende patrones de uso por repetición desde un turno", async () => {
    const { learner, store } = makeHarness({ thresholds: { terminology: 3, preference: 3, operational_rule: 2, usage_pattern: 2 } })
    for (let i = 0; i < 2; i++) {
      await learner.learnFromTurn(ctx, { message: "¿cuánto vendí esta semana?", intent: "sales_summary" })
    }
    const item = await store.get(ctx, "bm.usage_pattern.ventas")
    expect(item?.status).toBe("confirmed")
    expect(item?.metadata.domain).toBe("ventas")
  })
})
