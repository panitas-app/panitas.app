/**
 * FASE 6D — Motor de insights accionables.
 *
 * Solo se emiten insights respaldados por datos reales de los indicadores.
 * Cada insight incluye título, descripción, prioridad (vía financial-priority)
 * y acciones rápidas (vía financial-actions). Nunca se inventan análisis.
 */
import type {
  FinancialIndicators,
  FinancialInsight,
  FinancialInsightCategory,
} from "./financial-types"
import { priorityFor } from "./financial-priority"
import { actionsFor } from "./financial-actions"

const fmtMoney = (value: number): string =>
  new Intl.NumberFormat("es-EC", { style: "currency", currency: "USD" }).format(value)

const fmtPct = (value: number): string => `${Math.abs(value).toFixed(0)}%`

/** Umbral de variación (%) para considerar un cambio relevante. */
export const CHANGE_THRESHOLD_PCT = 10

/** Umbral de concentración (%) de deuda en el principal deudor. */
export const CONCENTRATION_THRESHOLD_PCT = 60

/** Umbral de recuperación (%) por debajo del cual se emite el insight. */
export const RECOVERY_MIN_PCT = 50

interface InsightRule {
  category: FinancialInsightCategory
  title: string
  description: string
  value: number
}

function moneyRule(
  category: FinancialInsightCategory,
  title: string,
  description: string,
  value: number,
): FinancialInsight {
  return {
    id: category,
    category,
    title,
    description,
    value,
    priority: priorityFor(category, value),
    actions: actionsFor(category),
  }
}

/** Construye la lista de insights accionables a partir de los indicadores. */
export function buildInsights(indicators: FinancialIndicators): FinancialInsight[] {
  const rules: InsightRule[] = []
  const { revenue, previousRevenue, previousExpenses, netFlow } = indicators

  if (netFlow < 0) {
    rules.push({
      category: "flujo_negativo",
      title: `El flujo de ${indicators.label} es negativo`,
      description: `Tus gastos superaron tus ingresos en ${fmtMoney(Math.abs(netFlow))}.`,
      value: Math.abs(netFlow),
    })
  } else if (netFlow > 0) {
    rules.push({
      category: "flujo_positivo",
      title: `Flujo positivo en ${indicators.label}`,
      description: `Tus ingresos superaron tus gastos en ${fmtMoney(netFlow)}.`,
      value: netFlow,
    })
  }

  if (indicators.overdueCredits > 0) {
    rules.push({
      category: "creditos_vencidos",
      title:
        indicators.overdueCredits === 1
          ? "Tienes un crédito vencido"
          : `Tienes ${indicators.overdueCredits} créditos vencidos`,
      description: `Hay ${fmtMoney(indicators.overdueCreditAmount)} por cobrar que ya venció.`,
      value: indicators.overdueCreditAmount,
    })
  }

  if (indicators.overdueSupplierInvoices > 0) {
    rules.push({
      category: "facturas_vencidas",
      title:
        indicators.overdueSupplierInvoices === 1
          ? "Tienes una factura de proveedor vencida"
          : `Tienes ${indicators.overdueSupplierInvoices} facturas de proveedores vencidas`,
      description: `Debes ${fmtMoney(indicators.overdueSupplierAmount)} en facturas vencidas.`,
      value: indicators.overdueSupplierAmount,
    })
  }

  if (indicators.dueNext7DaysCollect > 0) {
    rules.push({
      category: "cobrar_esta_semana",
      title: "Tienes montos por cobrar en los próximos días",
      description: `Puedes cobrar ${fmtMoney(indicators.dueNext7DaysCollect)} en los próximos 7 días.`,
      value: indicators.dueNext7DaysCollect,
    })
  }

  if (indicators.dueNext7DaysPay > 0) {
    rules.push({
      category: "pagar_esta_semana",
      title: "Tienes pagos a proveedores próximos",
      description: `Debes pagar ${fmtMoney(indicators.dueNext7DaysPay)} a tus proveedores en los próximos 7 días.`,
      value: indicators.dueNext7DaysPay,
    })
  }

  if (revenue > 0 && indicators.revenueDeltaPct != null && indicators.revenueDeltaPct >= CHANGE_THRESHOLD_PCT) {
    rules.push({
      category: "ventas_crecieron",
      title: "Tus ventas están creciendo",
      description: `Aumentaron ${fmtPct(indicators.revenueDeltaPct)} respecto al período anterior.`,
      value: indicators.revenueDeltaPct,
    })
  }

  if (
    previousRevenue > 0 &&
    indicators.revenueDeltaPct != null &&
    indicators.revenueDeltaPct <= -CHANGE_THRESHOLD_PCT
  ) {
    rules.push({
      category: "ventas_cayeron",
      title: "Tus ventas cayeron",
      description: `Bajaron ${fmtPct(indicators.revenueDeltaPct)} respecto al período anterior.`,
      value: indicators.revenueDeltaPct,
    })
  }

  if (previousExpenses > 0 && indicators.expensesDeltaPct != null && indicators.expensesDeltaPct >= CHANGE_THRESHOLD_PCT) {
    rules.push({
      category: "gastos_aumentaron",
      title: "Tus gastos aumentaron",
      description: `Subieron ${fmtPct(indicators.expensesDeltaPct)} respecto al período anterior.`,
      value: indicators.expensesDeltaPct,
    })
  }

  if (indicators.totalPending > 0 && indicators.topDebtors.length > 0) {
    const concentration = indicators.topDebtors[0].pending / indicators.totalPending
    if (concentration >= CONCENTRATION_THRESHOLD_PCT / 100) {
      rules.push({
        category: "deuda_concentrada",
        title: "Tu deuda por cobrar está concentrada",
        description: `${indicators.topDebtors[0].name} concentra el ${(concentration * 100).toFixed(0)}% de lo que tienes por cobrar.`,
        value: concentration * 100,
      })
    }
  }

  if (indicators.recoveredInPeriod > 0 && indicators.recoveryRate < RECOVERY_MIN_PCT) {
    rules.push({
      category: "recuperacion_creditos",
      title: "La recuperación de créditos es baja",
      description: `Recuperaste ${fmtPct(indicators.recoveryRate)} de lo que tienes por cobrar.`,
      value: indicators.recoveryRate,
    })
  }

  if (indicators.totalPayable > indicators.totalPending) {
    rules.push({
      category: "por_pagar_mayor",
      title: "Debes más de lo que tienes por cobrar",
      description: `Tienes ${fmtMoney(indicators.totalPayable)} por pagar frente a ${fmtMoney(indicators.totalPending)} por cobrar.`,
      value: indicators.totalPayable - indicators.totalPending,
    })
  }

  return rules.map((rule) => moneyRule(rule.category, rule.title, rule.description, rule.value))
}
