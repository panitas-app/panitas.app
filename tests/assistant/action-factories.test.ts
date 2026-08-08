import { describe, expect, it } from "vitest"
import { customerActions, expenseActions, productActions, saleActions, vendorActions } from "@/lib/conversational/action-factories"
import type { QuickAction } from "@/lib/conversational-actions"

describe("action-factories (FASE 5E)", () => {
  it("productActions devuelve acciones semánticas sin tool names", () => {
    const actions = productActions("café")
    expect(actions.length).toBeGreaterThanOrEqual(3)
    const labels = actions.map((a) => a.label)
    expect(labels).toEqual(expect.arrayContaining(["Editar", "Agregar stock", "Eliminar"]))
    for (const action of actions) {
      expect(action.action).toContain("café")
      expect(action.action).not.toMatch(/products\.|inventory\.|tool|call\s*:/i)
    }
    const destructive = actions.find((a) => a.variant === "destructive")
    expect(destructive?.confirm).toBe(true)
  })

  it("saleActions incluye ver detalle y duplicar", () => {
    const actions = saleActions("123")
    expect(actions.map((a) => a.label)).toEqual(expect.arrayContaining(["Ver detalle", "Duplicar"]))
  })

  it("customerActions incluye historial, registrar venta y registrar pago", () => {
    const actions = customerActions("Ana")
    const labels = actions.map((a) => a.label)
    expect(labels).toEqual(expect.arrayContaining(["Historial", "Registrar venta", "Registrar pago"]))
    expect(actions.some((a) => a.action.includes("Ana"))).toBe(true)
  })

  it("expenseActions marca eliminar como destructiva confirmada", () => {
    const actions = expenseActions("alquiler")
    const del = actions.find((a) => a.label === "Eliminar")
    expect(del?.variant).toBe("destructive")
    expect(del?.confirm).toBe(true)
    expect(actions.some((a) => a.label === "Editar")).toBe(true)
  })

  it("vendorActions incluye comprar de nuevo y ver gastos", () => {
    const actions = vendorActions("Mercantil")
    expect(actions.map((a) => a.label)).toEqual(expect.arrayContaining(["Comprar de nuevo", "Ver gastos"]))
  })

  it("todas las acciones tienen icono conocido y acción semántica", () => {
    const all: QuickAction[] = [
      ...productActions("x"),
      ...customerActions("x"),
      ...expenseActions("x"),
      ...vendorActions("x"),
      ...saleActions("x"),
    ]
    for (const a of all) {
      expect(a.icon).toBeTruthy()
      expect(typeof a.action).toBe("string")
      expect(a.action.length).toBeGreaterThan(0)
    }
  })
})
