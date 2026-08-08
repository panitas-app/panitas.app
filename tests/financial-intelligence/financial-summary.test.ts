import { describe, expect, it } from "vitest"
import { summaryTone, buildExecutiveSummary } from "@/lib/financial-intelligence/financial-summary"
import { makeIndicators } from "./helpers"

describe("financial-summary (FASE 6D)", () => {
  it("tono warning cuando el flujo es negativo", () => {
    expect(summaryTone(makeIndicators({ netFlow: -50 }))).toBe("warning")
  })

  it("tono warning cuando hay créditos vencidos", () => {
    expect(summaryTone(makeIndicators({ overdueCredits: 1, overdueCreditAmount: 40 }))).toBe("warning")
  })

  it("tono warning cuando hay facturas vencidas", () => {
    expect(summaryTone(makeIndicators({ overdueSupplierInvoices: 1, overdueSupplierAmount: 40 }))).toBe("warning")
  })

  it("tono warning cuando por pagar supera por cobrar", () => {
    expect(summaryTone(makeIndicators({ totalPayable: 900, totalPending: 200 }))).toBe("warning")
  })

  it("tono positive con flujo positivo y sin alertas", () => {
    expect(summaryTone(makeIndicators({ netFlow: 100 }))).toBe("positive")
  })

  it("tono neutral cuando el flujo es cero", () => {
    expect(summaryTone(makeIndicators({ netFlow: 0 }))).toBe("neutral")
  })

  it("resume ingresos vs gastos en lenguaje natural", () => {
    const summary = buildExecutiveSummary(makeIndicators({ revenue: 1000, expenses: 400, netFlow: 600 }))
    expect(summary.paragraphs[0]).toContain("tus ingresos")
    expect(summary.paragraphs[0]).toContain("$1.000,00")
    expect(summary.paragraphs[0]).toContain("$400,00")
    expect(summary.tone).toBe("positive")
  })

  it("menciona créditos vencidos y cobranza próxima", () => {
    const summary = buildExecutiveSummary(
      makeIndicators({ overdueCredits: 2, overdueCreditAmount: 300, dueNext7DaysCollect: 150 }),
    )
    expect(summary.paragraphs.some((p) => p.includes("2 créditos vencidos"))).toBe(true)
    expect(summary.paragraphs.some((p) => p.includes("por cobrar en los próximos 7 días"))).toBe(true)
  })

  it("menciona facturas vencidas y pagos próximos a proveedores", () => {
    const summary = buildExecutiveSummary(
      makeIndicators({ overdueSupplierInvoices: 1, overdueSupplierAmount: 80, dueNext7DaysPay: 200 }),
    )
    expect(summary.paragraphs.some((p) => p.includes("una factura de proveedor vencida"))).toBe(true)
    expect(summary.paragraphs.some((p) => p.includes("por pagar en los próximos 7 días"))).toBe(true)
  })

  it("compara por cobrar vs por pagar", () => {
    const moreCollect = buildExecutiveSummary(makeIndicators({ totalPending: 600, totalPayable: 300 }))
    expect(moreCollect.paragraphs.some((p) => p.includes("más por cobrar"))).toBe(true)
    const morePay = buildExecutiveSummary(makeIndicators({ totalPending: 200, totalPayable: 500 }))
    expect(morePay.paragraphs.some((p) => p.includes("más por pagar"))).toBe(true)
  })

  it("no fabrica párrafos sin datos", () => {
    const summary = buildExecutiveSummary(
      makeIndicators({ netFlow: 0, revenue: 0, expenses: 0, totalPending: 0, totalPayable: 0 }),
    )
    expect(summary.paragraphs).toHaveLength(1)
  })
})
