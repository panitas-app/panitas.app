import { describe, expect, it } from "vitest"
import { IntentEngine } from "@/lib/agent-intel/intent-engine"

const engine = new IntentEngine()

describe("IntentEngine", () => {
  it("clasifica una consulta de inventario", () => {
    const r = engine.classify("¿cuánto stock hay de abrazadera 2\"?")
    expect(r.type).toBe("consulta")
    expect(r.needsTools).toBe(true)
    expect(r.domains).toContain("inventory")
    expect(r.confidence).toBeGreaterThan(0.5)
  })

  it("clasifica una consulta de stock bajo", () => {
    const r = engine.classify("¿qué productos tienen stock bajo?")
    expect(r.type).toBe("consulta")
    expect(r.domains).toContain("inventory")
  })

  it("clasifica ventas de la semana como consulta de dominio sales", () => {
    const r = engine.classify("muestrame las ventas de esta semana")
    expect(r.type).toBe("consulta")
    expect(r.domains).toContain("sales")
  })

  it("clasifica un análisis", () => {
    const r = engine.classify("analiza por qué bajaron mis ventas este mes")
    expect(r.type).toBe("analisis")
    expect(r.needsTools).toBe(true)
    expect(r.domains).toContain("sales")
  })

  it("clasifica un reporte", () => {
    const r = engine.classify("dame el reporte de ventas del mes")
    expect(r.type).toBe("reporte")
    expect(r.needsTools).toBe(true)
  })

  it("clasifica una acción destructiva como accion y marca destructive", () => {
    const r = engine.classify("elimina el producto abrazadera")
    expect(r.type).toBe("accion")
    expect(r.destructive).toBe(true)
    expect(r.needsTools).toBe(true)
  })

  it("clasifica la cancelación de un pedido como destructiva", () => {
    const r = engine.classify("cancelar el pedido #123")
    expect(r.type).toBe("accion")
    expect(r.destructive).toBe(true)
  })

  it("clasifica incremento de stock como acción NO destructiva", () => {
    const r = engine.classify("agregar 10 unidades de abrazadera al stock")
    expect(r.type).toBe("accion")
    expect(r.destructive).toBe(false)
  })

  it("clasifica conversación casual sin tools", () => {
    const r = engine.classify("hola, ¿cómo estás?")
    expect(r.type).toBe("conversacion")
    expect(r.needsTools).toBe(false)
  })

  it("clasifica pedido de ayuda sin tools", () => {
    const r = engine.classify("¿qué puedes hacer por mí?")
    expect(r.type).toBe("ayuda")
    expect(r.needsTools).toBe(false)
  })

  it("normaliza sin tildes", () => {
    const r = engine.classify("¿Cuánto inventario tengo?")
    expect(r.message).not.toContain("á")
    expect(r.message).toContain("cuanto")
  })

  it("extrae entidades de producto y cantidad", () => {
    const r = engine.classify("¿cuánto stock hay de abrazadera de 2 pulgadas?")
    expect(r.entities.producto).toBe("abrazadera de 2 pulgadas")
  })

  it("extrae cantidad de unidades", () => {
    const r = engine.classify("¿tengo 12 unidades de codo?")
    expect(r.entities.cantidad).toBe("12")
  })

  it("mantiene la confianza acotada", () => {
    const r = engine.classify("hola hola hola hola hola hola hola hola hola hola")
    expect(r.confidence).toBeLessThanOrEqual(0.98)
  })
})
