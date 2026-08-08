import { describe, expect, it, beforeEach } from "vitest"
import { createTestEngine, ctx, otherStoreCtx } from "./helpers"
import {
  readCreditPreferences,
  saveCreditPreferences,
  CREDIT_PREF_FILTER_KEY,
  CREDIT_PREF_SEARCH_KEY,
} from "@/lib/business-memory/credit-preferences"

describe("credit-preferences (FASE 6A)", () => {
  let engine: ReturnType<typeof createTestEngine>

  beforeEach(() => {
    engine = createTestEngine()
  })

  it("devuelve valores por defecto cuando no hay preferencias guardadas", async () => {
    const prefs = await readCreditPreferences(engine, ctx)
    expect(prefs).toEqual({ filter: "all", search: "" })
  })

  it("guarda y recupera el filtro y la búsqueda del centro de cobranza", async () => {
    await saveCreditPreferences(engine, ctx, { filter: "overdue", search: "juan" })
    const prefs = await readCreditPreferences(engine, ctx)
    expect(prefs).toEqual({ filter: "overdue", search: "juan" })
  })

  it("persiste bajo claves bm.preference.creditos.*", async () => {
    await saveCreditPreferences(engine, ctx, { filter: "upcoming", search: "" })
    expect(await engine.get(ctx, CREDIT_PREF_FILTER_KEY)).toMatchObject({ kind: "preference", status: "confirmed" })
    expect(await engine.get(ctx, CREDIT_PREF_SEARCH_KEY)).toBeTruthy()
  })

  it("aísla las preferencias por store", async () => {
    await saveCreditPreferences(engine, ctx, { filter: "overdue", search: "" })
    const other = await readCreditPreferences(engine, otherStoreCtx)
    expect(other).toEqual({ filter: "all", search: "" })
  })

  it("no escribe cuando el valor ya coincide con el guardado", async () => {
    await saveCreditPreferences(engine, ctx, { filter: "overdue", search: "juan" })
    const before = (await engine.get(ctx, CREDIT_PREF_FILTER_KEY))?.updatedAt
    await saveCreditPreferences(engine, ctx, { filter: "overdue", search: "juan" })
    const after = (await engine.get(ctx, CREDIT_PREF_FILTER_KEY))?.updatedAt
    expect(after).toBe(before)
  })
})
