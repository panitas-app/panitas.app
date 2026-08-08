/**
 * FASE 6D — Resumen ejecutivo en lenguaje natural.
 *
 * Genera un resumen legible del panel financiero. Solo menciona cifras y
 * situaciones que existen en los indicadores; nunca inventa datos.
 */
import type { FinancialIndicators, FinancialSummary, FinancialSummaryTone } from "./financial-types"

const fmtMoney = (value: number): string =>
  new Intl.NumberFormat("es-EC", { style: "currency", currency: "USD" }).format(value)

/** Tono del resumen según la situación real del negocio. */
export function summaryTone(indicators: FinancialIndicators): FinancialSummaryTone {
  const isWarning =
    indicators.netFlow < 0 ||
    indicators.overdueCredits > 0 ||
    indicators.overdueSupplierInvoices > 0 ||
    indicators.totalPayable > indicators.totalPending

  if (isWarning) return "warning"

  const isPositive = indicators.netFlow > 0
  return isPositive ? "positive" : "neutral"
}

/** Construye el resumen ejecutivo en lenguaje natural. */
export function buildExecutiveSummary(indicators: FinancialIndicators): FinancialSummary {
  const paragraphs: string[] = []

  if (indicators.netFlow > 0) {
    paragraphs.push(
      `En ${indicators.label} tus ingresos (${fmtMoney(indicators.revenue)}) superaron tus gastos (${fmtMoney(indicators.expenses)}).`,
    )
  } else if (indicators.netFlow < 0) {
    paragraphs.push(
      `En ${indicators.label} tus gastos (${fmtMoney(indicators.expenses)}) superaron tus ingresos (${fmtMoney(indicators.revenue)}).`,
    )
  } else {
    paragraphs.push(
      `En ${indicators.label} tus ingresos (${fmtMoney(indicators.revenue)}) igualaron tus gastos (${fmtMoney(indicators.expenses)}).`,
    )
  }

  const collectFragments: string[] = []
  if (indicators.overdueCredits > 0) {
    const noun =
      indicators.overdueCredits === 1 ? "un crédito vencido" : `${indicators.overdueCredits} créditos vencidos`
    collectFragments.push(`${noun} por ${fmtMoney(indicators.overdueCreditAmount)}`)
  }
  if (indicators.dueNext7DaysCollect > 0) {
    collectFragments.push(`${fmtMoney(indicators.dueNext7DaysCollect)} por cobrar en los próximos 7 días`)
  }

  if (collectFragments.length > 0) {
    paragraphs.push(`Sin embargo, tienes ${joinFragments(collectFragments)}.`)
  }

  const payFragments: string[] = []
  if (indicators.overdueSupplierInvoices > 0) {
    const noun =
      indicators.overdueSupplierInvoices === 1
        ? "una factura de proveedor vencida"
        : `${indicators.overdueSupplierInvoices} facturas de proveedores vencidas`
    payFragments.push(`${noun} por ${fmtMoney(indicators.overdueSupplierAmount)}`)
  }
  if (indicators.dueNext7DaysPay > 0) {
    payFragments.push(`${fmtMoney(indicators.dueNext7DaysPay)} por pagar en los próximos 7 días`)
  }

  if (payFragments.length > 0) {
    paragraphs.push(`Por el lado de proveedores, tienes ${joinFragments(payFragments)}.`)
  }

  if (indicators.totalPending > indicators.totalPayable) {
    paragraphs.push(
      `Tienes más por cobrar (${fmtMoney(indicators.totalPending)}) que por pagar (${fmtMoney(indicators.totalPayable)}).`,
    )
  } else if (indicators.totalPayable > indicators.totalPending) {
    paragraphs.push(
      `Tienes más por pagar (${fmtMoney(indicators.totalPayable)}) que por cobrar (${fmtMoney(indicators.totalPending)}), por lo que conviene priorizar el cobro.`,
    )
  }

  return { paragraphs, tone: summaryTone(indicators) }
}

function joinFragments(fragments: string[]): string {
  if (fragments.length === 1) return fragments[0]
  return `${fragments.slice(0, -1).join(", ")} y ${fragments[fragments.length - 1]}`
}
