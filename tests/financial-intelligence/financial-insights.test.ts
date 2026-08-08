import { describe, expect, it } from "vitest"
import { buildInsights, CHANGE_THRESHOLD_PCT, CONCENTRATION_THRESHOLD_PCT, RECOVERY_MIN_PCT } from "@/lib/financial-intelligence/financial-insights"
import { makeIndicators } from "./helpers"

describe("financial-insights (FASE 6D)", () => {
  it("emite flujo negativo con prioridad alta cuando el flujo es negativo", () => {
    const insights = buildInsights(makeIndicators({ netFlow: -100, revenue: 100, expenses: 200 }))
    const flujo = insights.find((i) => i.category === "flujo_negativo")
    expect(flujo?.priority).toBe("alta")
    expect(flujo?.value).toBe(100)
  })

  it("emite flujo positivo cuando el flujo es positivo", () => {
    const insights = buildInsights(makeIndicators({ netFlow: 600 }))
    expect(insights.find((i) => i.category === "flujo_positivo")?.value).toBe(600)
    expect(insights.find((i) => i.category === "flujo_negativo")).toBeUndefined()
  })

  it("emite insights de créditos vencidos solo cuando existen", () => {
    const insights = buildInsights(makeIndicators({ overdueCredits: 2, overdueCreditAmount: 350 }))
    const creditos = insights.find((i) => i.category === "creditos_vencidos")
    expect(creditos?.priority).toBe("alta")
    expect(creditos?.description).toContain("$350,00")
  })

  it("emite insights de facturas vencidas solo cuando existen", () => {
    const insights = buildInsights(makeIndicators({ overdueSupplierInvoices: 1, overdueSupplierAmount: 80 }))
    const facturas = insights.find((i) => i.category === "facturas_vencidas")
    expect(facturas?.priority).toBe("alta")
    expect(facturas?.title).toContain("una factura")
  })

  it("emite cobrar/pagar esta semana cuando hay montos próximos", () => {
    const insights = buildInsights(makeIndicators({ dueNext7DaysCollect: 250, dueNext7DaysPay: 120 }))
    expect(insights.find((i) => i.category === "cobrar_esta_semana")?.value).toBe(250)
    expect(insights.find((i) => i.category === "pagar_esta_semana")?.value).toBe(120)
  })

  it("emite ventas_crecieron solo si supera el umbral y hay base previa", () => {
    const above = buildInsights(makeIndicators({ revenue: 1100, previousRevenue: 1000, revenueDeltaPct: CHANGE_THRESHOLD_PCT }))
    expect(above.find((i) => i.category === "ventas_crecieron")).toBeTruthy()
    const below = buildInsights(makeIndicators({ revenue: 1050, previousRevenue: 1000, revenueDeltaPct: 5 }))
    expect(below.find((i) => i.category === "ventas_crecieron")).toBeUndefined()
    const noBase = buildInsights(makeIndicators({ revenue: 200, previousRevenue: 0, revenueDeltaPct: null }))
    expect(noBase.find((i) => i.category === "ventas_crecieron")).toBeUndefined()
  })

  it("emite ventas_cayeron solo si cae más del umbral con base previa", () => {
    const insights = buildInsights(makeIndicators({ revenue: 500, previousRevenue: 1000, revenueDeltaPct: -50, netFlow: -100, expenses: 900 }))
    const caida = insights.find((i) => i.category === "ventas_cayeron")
    expect(caida?.priority).toBe("alta")
    expect(caida?.value).toBe(-50)
  })

  it("emite gastos_aumentaron solo si supera el umbral con base previa", () => {
    const insights = buildInsights(makeIndicators({ expenses: 600, previousExpenses: 300, expensesDeltaPct: 100 }))
    const gastos = insights.find((i) => i.category === "gastos_aumentaron")
    expect(gastos?.priority).toBe("alta")
    expect(gastos?.value).toBe(100)
  })

  it("emite deuda_concentrada cuando el principal deudor supera el umbral", () => {
    const totalPending = 1000
    const insights = buildInsights(
      makeIndicators({ totalPending, topDebtors: [{ name: "Juan", pending: 700 }] }),
    )
    const concentrada = insights.find((i) => i.category === "deuda_concentrada")
    expect(concentrada?.value).toBeGreaterThanOrEqual(CONCENTRATION_THRESHOLD_PCT)
    expect(concentrada?.description).toContain("70%")
  })

  it("no emite deuda_concentrada cuando está dispersa", () => {
    const insights = buildInsights(
      makeIndicators({ totalPending: 1000, topDebtors: [{ name: "Juan", pending: 300 }] }),
    )
    expect(insights.find((i) => i.category === "deuda_concentrada")).toBeUndefined()
  })

  it("emite recuperacion_creditos solo si hay recuperación y es baja", () => {
    const insights = buildInsights(makeIndicators({ recoveredInPeriod: 100, recoveryRate: RECOVERY_MIN_PCT - 10 }))
    expect(insights.find((i) => i.category === "recuperacion_creditos")).toBeTruthy()
    const healthy = buildInsights(makeIndicators({ recoveredInPeriod: 100, recoveryRate: 80 }))
    expect(healthy.find((i) => i.category === "recuperacion_creditos")).toBeUndefined()
  })

  it("emite por_pagar_mayor cuando lo por pagar supera lo por cobrar", () => {
    const insights = buildInsights(makeIndicators({ totalPayable: 800, totalPending: 300 }))
    const insight = insights.find((i) => i.category === "por_pagar_mayor")
    expect(insight?.priority).toBe("alta")
    expect(insight?.value).toBe(500)
  })

  it("cada insight incluye acciones rápidas", () => {
    const insights = buildInsights(makeIndicators({ overdueCredits: 1, overdueCreditAmount: 50 }))
    expect(insights.length).toBeGreaterThan(0)
    for (const insight of insights) {
      expect(insight.actions.length).toBeGreaterThan(0)
    }
  })

  it("no emite insights sin datos que los respalden", () => {
    const insights = buildInsights(
      makeIndicators({
        netFlow: 0,
        revenue: 0,
        previousRevenue: 0,
        expenses: 0,
        previousExpenses: 0,
        revenueDeltaPct: null,
        expensesDeltaPct: null,
        totalPending: 0,
        recoveredInPeriod: 0,
        recoveryRate: 0,
        totalPayable: 0,
        topDebtors: [],
        topPayableSuppliers: [],
      }),
    )
    expect(insights).toHaveLength(0)
  })
})
