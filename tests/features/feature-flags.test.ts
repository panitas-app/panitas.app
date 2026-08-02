import { describe, expect, it } from "vitest"
import { canUseFeature, getPanitasPlan, isPlusPlan } from "@/lib/feature-flags"

describe("feature-flags (FASE 2A) delegando en la capa central", () => {
  it("isPlusPlan reconoce los planes Plus legacy y nuevos", () => {
    expect(isPlusPlan("mayorista")).toBe(true)
    expect(isPlusPlan("empresa")).toBe(true)
    expect(isPlusPlan("empresarial")).toBe(true)
    expect(isPlusPlan("plus")).toBe(true)
    expect(isPlusPlan("negocios_plus")).toBe(true)
    expect(isPlusPlan("comercio")).toBe(false)
    expect(isPlusPlan("tienda")).toBe(false)
    expect(isPlusPlan(undefined)).toBe(false)
  })

  it("getPanitasPlan devuelve el plan comercial", () => {
    expect(getPanitasPlan("mayorista")).toBe("negocios_plus")
    expect(getPanitasPlan("comercio")).toBe("negocios")
  })

  it("canUseFeature: features Plus requieren Plus", () => {
    expect(canUseFeature("comercio", "conversaciones")).toBe(false)
    expect(canUseFeature("comercio", "sugerencias_ia")).toBe(false)
    expect(canUseFeature("comercio", "intencion_cliente")).toBe(false)
    expect(canUseFeature("comercio", "clientes_interesados")).toBe(false)
    expect(canUseFeature("comercio", "recomendaciones_comerciales")).toBe(false)

    expect(canUseFeature("mayorista", "conversaciones")).toBe(true)
    expect(canUseFeature("mayorista", "sugerencias_ia")).toBe(true)
    expect(canUseFeature("mayorista", "recomendaciones_comerciales")).toBe(true)
  })

  it("canUseFeature: el asistente IA ahora es base (basic_ai en Panitas Negocios)", () => {
    expect(canUseFeature("comercio", "asistente_ia")).toBe(true)
    expect(canUseFeature("mayorista", "asistente_ia")).toBe(true)
  })
})
