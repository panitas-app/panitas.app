import { describe, expect, it } from "vitest"
import {
  detectDomain,
  extractTerminologySignal,
  extractCurrencySignal,
  extractRuleSignal,
  extractUsageSignal,
  extractSignals,
  DEFAULT_LEARNING_CONFIG,
} from "@/lib/business-memory/memory-rules"

describe("BusinessMemoryRules (FASE 5G)", () => {
  it("detecta el dominio del negocio por palabras clave", () => {
    expect(detectDomain("¿cuánto vendí ayer?")).toBe("ventas")
    expect(detectDomain("listado de productos con stock bajo")).toBe("inventario")
    expect(detectDomain("gastos del mes")).toBe("finanzas")
    expect(detectDomain("¿hay pedidos pendientes?")).toBe("pedidos")
    expect(detectDomain("hola")).toBeNull()
  })

  it("detecta el dominio por el dominio de la capa de inteligencia (4A)", () => {
    expect(detectDomain("¿qué pasó?", undefined, ["sales"])).toBe("ventas")
    expect(detectDomain("¿qué pasó?", undefined, ["inventory"])).toBe("inventario")
    expect(detectDomain("¿qué pasó?", "ventas del mes")).toBe("ventas")
    expect(detectDomain("¿qué pasó?", undefined, ["agenda"])).toBeNull()
  })

  it("extrae terminología explícita", () => {
    const signal = extractTerminologySignal("yo llamo pacientes a mis clientes")
    expect(signal).toMatchObject({ explicit: true, kind: "terminology" })
    expect(signal?.value).toMatchObject({ term: "pacientes", standard: "clientes" })
    expect(signal?.key).toBe("bm.terminology.clientes")
  })

  it("no extrae terminología ambigua", () => {
    expect(extractTerminologySignal("¿cuántos pacientes tengo?")).toBeNull()
    expect(extractTerminologySignal("llamo a un cliente")).toBeNull()
  })

  it("extrae preferencia de moneda solo con intención contextual", () => {
    const signal = extractCurrencySignal("prefiero trabajar en dólares")
    expect(signal?.value).toMatchObject({ currency: "USD" })
    expect(signal?.explicit).toBe(true)
    expect(extractCurrencySignal("¿cuánto es 100 USD en bolívares?")).toBeNull()
  })

  it("extrae reglas operativas", () => {
    expect(extractRuleSignal("nunca vender sin stock")?.key).toBe("bm.operational_rule.no_sell_without_stock")
    expect(extractRuleSignal("siempre confirma antes de eliminar")?.key).toBe("bm.operational_rule.confirm_before_delete")
    expect(extractRuleSignal("¿borraste el pedido?")).toBeNull()
  })

  it("extrae patrones de uso por dominio (no explícitos)", () => {
    const signal = extractUsageSignal("¿cuánto vendí esta semana?", "consulta", ["sales"])
    expect(signal?.kind).toBe("usage_pattern")
    expect(signal?.explicit).toBe(false)
    expect(signal?.key).toBe("bm.usage_pattern.ventas")
  })

  it("combina señales de un turno", () => {
    const signals = extractSignals("prefiero trabajar en dólares y llamo pacientes a mis clientes")
    expect(signals.length).toBeGreaterThanOrEqual(2)
    expect(signals.every((s) => s.kind !== undefined)).toBe(true)
  })

  it("la configuración por defecto nunca consolida con una sola acción", () => {
    expect(DEFAULT_LEARNING_CONFIG.thresholds.terminology).toBeGreaterThan(1)
    expect(DEFAULT_LEARNING_CONFIG.thresholds.preference).toBeGreaterThan(1)
    expect(DEFAULT_LEARNING_CONFIG.thresholds.usage_pattern).toBeGreaterThan(1)
  })
})
