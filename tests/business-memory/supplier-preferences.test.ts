import { describe, expect, it, beforeEach } from "vitest"
import { createTestEngine, ctx, otherStoreCtx } from "./helpers"
import {
  readSupplierPreferences,
  recordSupplierUsage,
  saveSupplierFilter,
  SUPPLIER_PREF_CATEGORY_KEY,
  SUPPLIER_PREF_METHOD_KEY,
  SUPPLIER_PREF_FILTER_KEY,
} from "@/lib/business-memory/supplier-preferences"

describe("supplier-preferences (FASE 6C)", () => {
  let engine: ReturnType<typeof createTestEngine>

  beforeEach(() => {
    engine = createTestEngine()
  })

  it("devuelve valores por defecto cuando no hay preferencias", async () => {
    const prefs = await readSupplierPreferences(engine, ctx)
    expect(prefs).toEqual({ favoriteCategory: null, favoriteMethod: null, filter: "all" })
  })

  it("aprende la categoría favorita por repetición tras el umbral", async () => {
    // Umbral preference = 3: dos usos quedan como candidato, tres confirman.
    await recordSupplierUsage(engine, ctx, { category: "abarrotes" })
    await recordSupplierUsage(engine, ctx, { category: "abarrotes" })
    const prefs = await readSupplierPreferences(engine, ctx)
    expect(prefs.favoriteCategory).toBe("abarrotes")

    const candidate = await engine.get(ctx, SUPPLIER_PREF_CATEGORY_KEY)
    expect(candidate?.status).toBe("candidate")

    await recordSupplierUsage(engine, ctx, { category: "abarrotes" })
    const confirmed = await engine.get(ctx, SUPPLIER_PREF_CATEGORY_KEY)
    expect(confirmed?.status).toBe("confirmed")
    expect(confirmed?.metadata.strength).toBe(3)
  })

  it("aprende el método de pago usado con proveedores", async () => {
    await recordSupplierUsage(engine, ctx, { method: "Zelle" })
    const prefs = await readSupplierPreferences(engine, ctx)
    expect(prefs.favoriteMethod).toBe("Zelle")
  })

  it("persiste bajo claves bm.preference.proveedores.* con dominio proveedores", async () => {
    await recordSupplierUsage(engine, ctx, { category: "tecnologia", method: "transferencia" })
    expect(await engine.get(ctx, SUPPLIER_PREF_CATEGORY_KEY)).toMatchObject({ key: SUPPLIER_PREF_CATEGORY_KEY, kind: "preference" })
    expect(await engine.get(ctx, SUPPLIER_PREF_METHOD_KEY)).toMatchObject({ value: "transferencia" })
    const cat = await engine.get(ctx, SUPPLIER_PREF_CATEGORY_KEY)
    expect(cat?.metadata.tags).toContain("centro de proveedores")
  })

  it("guarda explícitamente el filtro activo del panel", async () => {
    await saveSupplierFilter(engine, ctx, "vencido")
    const prefs = await readSupplierPreferences(engine, ctx)
    expect(prefs.filter).toBe("vencido")
    const item = await engine.get(ctx, SUPPLIER_PREF_FILTER_KEY)
    expect(item?.status).toBe("confirmed")
    expect(item?.importance).toBe("LOW")
  })

  it("aísla las preferencias por store", async () => {
    await saveSupplierFilter(engine, ctx, "por_vencer")
    await recordSupplierUsage(engine, ctx, { category: "abarrotes" })
    const other = await readSupplierPreferences(engine, otherStoreCtx)
    expect(other).toEqual({ favoriteCategory: null, favoriteMethod: null, filter: "all" })
  })

  it("no escribe el filtro si ya coincide", async () => {
    await saveSupplierFilter(engine, ctx, "saldado")
    const before = (await engine.get(ctx, SUPPLIER_PREF_FILTER_KEY))?.updatedAt
    await saveSupplierFilter(engine, ctx, "saldado")
    const after = (await engine.get(ctx, SUPPLIER_PREF_FILTER_KEY))?.updatedAt
    expect(after).toBe(before)
  })
})
