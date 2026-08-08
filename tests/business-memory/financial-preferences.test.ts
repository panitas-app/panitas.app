import { describe, expect, it, beforeEach } from "vitest"
import { createTestEngine, ctx, otherStoreCtx } from "./helpers"
import {
  readFinancialPreferences,
  recordFinancialUsage,
  saveFinancialVisualization,
  FINANCIAL_PREF_PERIOD_KEY,
  FINANCIAL_PREF_VISUALIZATION_KEY,
} from "@/lib/business-memory/financial-preferences"

describe("financial-preferences (FASE 6D)", () => {
  let engine: ReturnType<typeof createTestEngine>

  beforeEach(() => {
    engine = createTestEngine()
  })

  it("devuelve valores por defecto cuando no hay preferencias", async () => {
    const prefs = await readFinancialPreferences(engine, ctx)
    expect(prefs).toEqual({ favoritePeriod: null, indicatorFocus: null, visualization: "resumen" })
  })

  it("aprende el período favorito por repetición tras el umbral", async () => {
    await recordFinancialUsage(engine, ctx, { period: "month" })
    await recordFinancialUsage(engine, ctx, { period: "month" })
    const prefs = await readFinancialPreferences(engine, ctx)
    expect(prefs.favoritePeriod).toBe("month")

    const candidate = await engine.get(ctx, FINANCIAL_PREF_PERIOD_KEY)
    expect(candidate?.status).toBe("candidate")

    await recordFinancialUsage(engine, ctx, { period: "month" })
    const confirmed = await engine.get(ctx, FINANCIAL_PREF_PERIOD_KEY)
    expect(confirmed?.status).toBe("confirmed")
    expect(confirmed?.metadata.strength).toBe(3)
  })

  it("aprende los indicadores más consultados", async () => {
    await recordFinancialUsage(engine, ctx, { indicators: ["flujo", "por_cobrar"] })
    const prefs = await readFinancialPreferences(engine, ctx)
    expect(prefs.indicatorFocus).toBe("flujo,por_cobrar")
  })

  it("persiste bajo claves bm.preference.finanzas.* con dominio finanzas", async () => {
    await recordFinancialUsage(engine, ctx, { period: "week" })
    expect(await engine.get(ctx, FINANCIAL_PREF_PERIOD_KEY)).toMatchObject({ key: FINANCIAL_PREF_PERIOD_KEY, kind: "preference" })
    const item = await engine.get(ctx, FINANCIAL_PREF_PERIOD_KEY)
    expect(item?.metadata.tags).toContain("panel financiero")
    expect(item?.metadata.tags).toContain("finanzas")
  })

  it("guarda explícitamente la visualización del panel", async () => {
    await saveFinancialVisualization(engine, ctx, "insights")
    const prefs = await readFinancialPreferences(engine, ctx)
    expect(prefs.visualization).toBe("insights")
    const item = await engine.get(ctx, FINANCIAL_PREF_VISUALIZATION_KEY)
    expect(item?.status).toBe("confirmed")
    expect(item?.importance).toBe("LOW")
  })

  it("aísla las preferencias por store", async () => {
    await saveFinancialVisualization(engine, ctx, "indicadores")
    await recordFinancialUsage(engine, ctx, { period: "month" })
    const other = await readFinancialPreferences(engine, otherStoreCtx)
    expect(other).toEqual({ favoritePeriod: null, indicatorFocus: null, visualization: "resumen" })
  })

  it("no escribe la visualización si ya coincide", async () => {
    await saveFinancialVisualization(engine, ctx, "indicadores")
    const before = (await engine.get(ctx, FINANCIAL_PREF_VISUALIZATION_KEY))?.updatedAt
    await saveFinancialVisualization(engine, ctx, "indicadores")
    const after = (await engine.get(ctx, FINANCIAL_PREF_VISUALIZATION_KEY))?.updatedAt
    expect(after).toBe(before)
  })

  it("ignora visualizaciones no soportadas", async () => {
    await engine.observe(ctx, {
      key: FINANCIAL_PREF_VISUALIZATION_KEY,
      kind: "preference",
      label: "Visualización del panel financiero",
      value: "mapa",
      domain: "finanzas",
      tags: ["finanzas"],
      explicit: true,
      ctx: { ...ctx, userId: ctx.userId },
    })
    const prefs = await readFinancialPreferences(engine, ctx)
    expect(prefs.visualization).toBe("resumen")
  })

  it("se combina con el aprendizaje de otros dominios sin interferir", async () => {
    await recordFinancialUsage(engine, ctx, { period: "today" })
    await engine.observe(ctx, {
      key: "bm.preference.proveedores.filtro",
      kind: "preference",
      label: "Filtro de proveedores",
      value: "vencido",
      domain: "proveedores",
      tags: ["proveedores"],
      explicit: true,
      importance: "LOW",
      ctx: { ...ctx, userId: ctx.userId },
    })
    const prefs = await readFinancialPreferences(engine, ctx)
    expect(prefs.favoritePeriod).toBe("today")
    const supplier = await engine.get(ctx, "bm.preference.proveedores.filtro")
    expect(supplier?.value).toBe("vencido")
  })
})
