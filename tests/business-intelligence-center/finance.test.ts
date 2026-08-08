import { describe, expect, it } from "vitest"
import {
  computeProfit,
  computeMargin,
  computeCashFlow,
  interpretFinancialHealth,
  interpretBreakEven,
} from "@/lib/business-intelligence-center"
import type { FinancialHealthSnapshot } from "@/lib/business-intelligence-center"

function snapshot(overrides: Partial<FinancialHealthSnapshot> = {}): FinancialHealthSnapshot {
  return {
    monthRevenue: 1000,
    monthExpenses: 700,
    monthOrders: 10,
    profit: 300,
    marginPercent: 30,
    breakEven: 800,
    breakEvenPercent: 125,
    cashFlow: 300,
    ...overrides,
  }
}

describe("finance (FASE 5A)", () => {
  it("calcula utilidad, margen y flujo", () => {
    expect(computeProfit(1000, 700)).toBe(300)
    expect(computeMargin(300, 1000)).toBe(30)
    expect(computeMargin(0, 0)).toBe(0)
    expect(computeCashFlow(1000, 700)).toBe(300)
  })

  it("interpreta un mes rentable con punto de equilibrio superado", () => {
    const text = interpretFinancialHealth(snapshot())
    expect(text).toContain("utilidad de $300.00")
    expect(text).toContain("margen del 30.0%")
    expect(text).toContain("superaste el punto de equilibrio")
  })

  it("interpreta un mes en pérdida", () => {
    const text = interpretFinancialHealth(
      snapshot({ profit: -250, marginPercent: -25, monthRevenue: 1000, monthExpenses: 1250 })
    )
    expect(text).toContain("gastos superan a las ventas por $250.00")
    expect(text).toContain("recuperar la rentabilidad")
  })

  it("interpreta cobertura parcial del punto de equilibrio", () => {
    const text = interpretFinancialHealth(
      snapshot({ breakEven: 1000, breakEvenPercent: 50 })
    )
    expect(text).toContain("50%")
    expect(text).toContain("faltan ventas")
  })

  it("avisa de forma informativa cuando no hay ventas en el mes", () => {
    const text = interpretFinancialHealth(snapshot({ monthRevenue: 0, profit: -700, marginPercent: 0 }))
    expect(text).toContain("Aún no registras ventas en el mes")
  })

  it("interpreta el punto de equilibrio superado o pendiente", () => {
    expect(interpretBreakEven(1000, 800, 200)).toContain("Superaste tu punto de equilibrio")
    expect(interpretBreakEven(600, 800, -200)).toContain("Te falta $200.00")
  })
})
