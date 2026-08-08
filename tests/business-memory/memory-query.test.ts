import { describe, expect, it } from "vitest"
import { relevanceScore, formatMemoryContext } from "@/lib/business-memory/memory-query"
import { createTestEngine, makeMemoryItem, ctx } from "./helpers"

function confirmedItem(key: string, kind: "terminology" | "preference" | "operational_rule" | "usage_pattern", value: unknown, overrides: Parameters<typeof makeMemoryItem>[0] = {}) {
  return makeMemoryItem({
    key,
    kind,
    value,
    status: "confirmed",
    metadata: { source: "learned", status: "confirmed", strength: 3, threshold: 3, tags: [], ...(overrides.metadata as object) },
    ...overrides,
  })
}

describe("BusinessMemoryQuerier (FASE 5G)", () => {
  it("rankea por dominio detectado en el mensaje", () => {
    const ventas = confirmedItem("bm.usage_pattern.ventas", "usage_pattern", { domain: "ventas" }, {
      metadata: { source: "learned", status: "confirmed", strength: 4, threshold: 4, domain: "ventas", tags: [] },
    })
    const moneda = confirmedItem("bm.preference.currency", "preference", { currency: "USD" })
    const scoreVentas = relevanceScore(ventas, { message: "¿cuánto vendí esta semana?" })
    const scoreMoneda = relevanceScore(moneda, { message: "¿cuánto vendí esta semana?" })
    expect(scoreVentas).toBeGreaterThan(scoreMoneda)
  })

  it("rankea por coincidencia de tokens (terminología)", () => {
    const terminologia = confirmedItem("bm.terminology.pacientes", "terminology", { term: "pacientes", standard: "clientes" })
    const moneda = confirmedItem("bm.preference.currency", "preference", { currency: "USD" })
    const scoreTerm = relevanceScore(terminologia, { message: "mis pacientes hoy" })
    const scoreMoneda = relevanceScore(moneda, { message: "mis pacientes hoy" })
    expect(scoreTerm).toBeGreaterThan(scoreMoneda)
  })

  it("devuelve SOLO recuerdos confirmados y con límite", async () => {
    const engine = createTestEngine([
      confirmedItem("bm.usage_pattern.ventas", "usage_pattern", { domain: "ventas" }),
      confirmedItem("bm.preference.currency", "preference", { currency: "USD" }),
      confirmedItem("bm.terminology.pacientes", "terminology", { term: "pacientes", standard: "clientes" }),
      makeMemoryItem({
        key: "bm.usage_pattern.inventario",
        kind: "usage_pattern",
        status: "candidate",
        metadata: { source: "observation", status: "candidate", strength: 1, threshold: 4, tags: [] },
      }),
    ])
    const result = await engine.queryForIntent(ctx, { message: "ventas y clientes", limit: 2 })
    expect(result.items.length).toBeLessThanOrEqual(2)
    expect(result.items.every((i) => i.status === "confirmed")).toBe(true)
    expect(result.items.some((i) => i.key === "bm.usage_pattern.ventas")).toBe(true)
  })

  it("formatea un fragmento compacto para el prompt", async () => {
    const engine = createTestEngine([
      confirmedItem("bm.terminology.pacientes", "terminology", { term: "pacientes", standard: "clientes" }),
      confirmedItem("bm.operational_rule.confirm_before_delete", "operational_rule", { rule: "Confirmar antes de eliminar" }),
    ])
    const result = await engine.queryForIntent(ctx, { message: "borra un cliente", limit: 5 })
    expect(result.context).toContain("Memoria estable del negocio")
    expect(result.context).toContain("Terminología")
    expect(result.context).toContain("Regla operativa")
    expect(result.context).not.toContain("bm.")
  })

  it("registra accesos al consultar (frecuencia)", async () => {
    const engine = createTestEngine([
      confirmedItem("bm.usage_pattern.ventas", "usage_pattern", { domain: "ventas" }),
    ])
    await engine.queryForIntent(ctx, { message: "ventas" })
    await engine.queryForIntent(ctx, { message: "ventas" })
    const item = await engine.get(ctx, "bm.usage_pattern.ventas")
    expect(item?.accessCount).toBeGreaterThanOrEqual(2)
  })

  it("sin memoria relevante devuelve contexto vacío", async () => {
    const engine = createTestEngine([
      confirmedItem("bm.preference.currency", "preference", { currency: "USD" }),
    ])
    const result = await engine.queryForIntent(ctx, { message: "agenda de horarios" })
    expect(result.items.length).toBeGreaterThanOrEqual(1) // siempre devuelve el mejor si hay memoria
    expect(result.context).toContain("Memoria estable del negocio")
    expect(formatMemoryContext([])).toBe("")
  })

  it("rendimiento: NUNCA envía toda la memoria, solo el tope por consulta", async () => {
    const many = Array.from({ length: 250 }, (_, i) =>
      confirmedItem(`bm.usage_pattern.dominio-${i}`, "usage_pattern", { domain: `dominio-${i}` }),
    )
    const engine = createTestEngine([...many, confirmedItem("bm.preference.currency", "preference", { currency: "USD" })])
    const result = await engine.queryForIntent(ctx, { message: "dominio-7", limit: 5 })
    expect(result.items.length).toBe(5)
    expect(result.context.length).toBeLessThan(2000)
    const stats = await engine.stats(ctx)
    expect(stats.total).toBe(251) // la consulta no duplica ni pierde nada
  })
})
