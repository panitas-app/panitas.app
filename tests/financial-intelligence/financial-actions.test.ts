import { describe, expect, it } from "vitest"
import { linkAction, askAction, actionsFor } from "@/lib/financial-intelligence/financial-actions"
import type { FinancialAction } from "@/lib/financial-intelligence"

describe("financial-actions (FASE 6D)", () => {
  it("construye acciones link y assistant", () => {
    const link = linkAction("Ver créditos", "/dashboard/creditos")
    const ask = askAction("Consultar", "cuánto tengo por cobrar")
    expect(link).toMatchObject({ type: "link", label: "Ver créditos", href: "/dashboard/creditos" })
    expect(ask).toMatchObject({ type: "assistant", label: "Consultar", prompt: "cuánto tengo por cobrar" })
  })

  it("cada categoría expone al menos una acción de navegación y una de asistente", () => {
    const categories = [
      "flujo_negativo",
      "flujo_positivo",
      "creditos_vencidos",
      "facturas_vencidas",
      "cobrar_esta_semana",
      "pagar_esta_semana",
      "ventas_crecieron",
      "ventas_cayeron",
      "gastos_aumentaron",
      "deuda_concentrada",
      "recuperacion_creditos",
      "por_pagar_mayor",
    ] as const
    for (const category of categories) {
      const actions = actionsFor(category)
      expect(actions.length).toBeGreaterThanOrEqual(2)
      expect(actions.some((a) => a.type === "link")).toBe(true)
      expect(actions.some((a) => a.type === "assistant")).toBe(true)
    }
  })

  it("las acciones link apuntan a rutas reales del dashboard", () => {
    const links = new Set<string>()
    for (const category of [
      "flujo_negativo",
      "flujo_positivo",
      "creditos_vencidos",
      "facturas_vencidas",
      "cobrar_esta_semana",
      "pagar_esta_semana",
      "ventas_crecieron",
      "ventas_cayeron",
      "gastos_aumentaron",
      "deuda_concentrada",
      "recuperacion_creditos",
      "por_pagar_mayor",
    ] as const) {
      for (const action of actionsFor(category)) {
        if (action.type === "link") links.add(action.href ?? "")
      }
    }
    expect(links).toEqual(new Set(["/dashboard/creditos", "/dashboard/suppliers", "/dashboard/reports", "/dashboard/finanzas"]))
  })

  it("las acciones de asistente usan prompts en lenguaje natural", () => {
    for (const category of ["flujo_negativo", "creditos_vencidos", "facturas_vencidas"] as const) {
      for (const action of actionsFor(category)) {
        if (action.type === "assistant") {
          expect(typeof action.prompt).toBe("string")
          expect((action.prompt ?? "").length).toBeGreaterThan(5)
        }
      }
    }
  })

  it("devuelve una acción por defecto para categorías desconocidas", () => {
    const actions: FinancialAction[] = actionsFor("no_existe" as never)
    expect(actions.length).toBe(1)
    expect(actions[0].type).toBe("assistant")
  })
})
