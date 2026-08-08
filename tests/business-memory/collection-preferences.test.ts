import { describe, expect, it, beforeEach } from "vitest"
import { createTestEngine, ctx, otherStoreCtx } from "./helpers"
import {
  readCollectionPreferences,
  recordCollectionUsage,
  saveCollectionWorkOrder,
  COLLECTION_PREF_TEMPLATE_KEY,
  COLLECTION_PREF_METHOD_KEY,
  COLLECTION_PREF_LEVEL_KEY,
  COLLECTION_PREF_ORDER_KEY,
} from "@/lib/business-memory/collection-preferences"

describe("collection-preferences (FASE 6B)", () => {
  let engine: ReturnType<typeof createTestEngine>

  beforeEach(() => {
    engine = createTestEngine()
  })

  it("devuelve valores por defecto cuando no hay preferencias", async () => {
    const prefs = await readCollectionPreferences(engine, ctx)
    expect(prefs).toEqual({ favoriteCategory: null, favoriteMethod: null, preferredLevel: null, workOrder: null })
  })

  it("aprende la categoría favorita por repetición tras el umbral", async () => {
    // Umbral preference = 3: dos usos quedan como candidato, tres confirman.
    await recordCollectionUsage(engine, ctx, { category: "primer_recordatorio" })
    await recordCollectionUsage(engine, ctx, { category: "primer_recordatorio" })
    const prefs = await readCollectionPreferences(engine, ctx)
    expect(prefs.favoriteCategory).toBe("primer_recordatorio")

    const candidate = await engine.get(ctx, COLLECTION_PREF_TEMPLATE_KEY)
    expect(candidate?.status).toBe("candidate")

    await recordCollectionUsage(engine, ctx, { category: "primer_recordatorio" })
    const confirmed = await engine.get(ctx, COLLECTION_PREF_TEMPLATE_KEY)
    expect(confirmed?.status).toBe("confirmed")
    expect(confirmed?.metadata.strength).toBe(3)
  })

  it("aprende método de pago y nivel preferido", async () => {
    await recordCollectionUsage(engine, ctx, { method: "Zelle", level: 2 })
    const prefs = await readCollectionPreferences(engine, ctx)
    expect(prefs.favoriteMethod).toBe("Zelle")
    expect(prefs.preferredLevel).toBe(2)
  })

  it("persiste bajo claves bm.preference.collection.*", async () => {
    await recordCollectionUsage(engine, ctx, { category: "ultimo_aviso", method: "Pago Móvil", level: 3 })
    expect(await engine.get(ctx, COLLECTION_PREF_TEMPLATE_KEY)).toMatchObject({ key: COLLECTION_PREF_TEMPLATE_KEY, kind: "preference" })
    expect(await engine.get(ctx, COLLECTION_PREF_METHOD_KEY)).toBeTruthy()
    expect(await engine.get(ctx, COLLECTION_PREF_LEVEL_KEY)).toMatchObject({ value: "3" })
  })

  it("guarda explícitamente el orden de trabajo", async () => {
    await saveCollectionWorkOrder(engine, ctx, "vencidos_primero")
    const prefs = await readCollectionPreferences(engine, ctx)
    expect(prefs.workOrder).toBe("vencidos_primero")
    const item = await engine.get(ctx, COLLECTION_PREF_ORDER_KEY)
    expect(item?.status).toBe("confirmed")
  })

  it("aísla las preferencias por store", async () => {
    await saveCollectionWorkOrder(engine, ctx, "vencidos_primero")
    await recordCollectionUsage(engine, ctx, { category: "primer_recordatorio" })
    const other = await readCollectionPreferences(engine, otherStoreCtx)
    expect(other).toEqual({ favoriteCategory: null, favoriteMethod: null, preferredLevel: null, workOrder: null })
  })

  it("no escribe el orden de trabajo si ya coincide", async () => {
    await saveCollectionWorkOrder(engine, ctx, "solo_vencidos")
    const before = (await engine.get(ctx, COLLECTION_PREF_ORDER_KEY))?.updatedAt
    await saveCollectionWorkOrder(engine, ctx, "solo_vencidos")
    const after = (await engine.get(ctx, COLLECTION_PREF_ORDER_KEY))?.updatedAt
    expect(after).toBe(before)
  })
})
