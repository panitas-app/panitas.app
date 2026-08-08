/**
 * Business Intelligence Center (FASE 5A) — API pública.
 *
 * Capa de helpers puros que alimentan las cinco áreas del panel (Monitor,
 * Operación, Salud Financiera, Análisis y Reportes). Reutilizan los datos que
 * ya producen las APIs y servicios existentes: no consultan la base de datos.
 */
export * from "./types"
export { monthKey, monthLabel, lastMonths, buildMonthlySeries } from "./series"
export {
  computeProfit,
  computeMargin,
  computeCashFlow,
  interpretFinancialHealth,
  interpretBreakEven,
} from "./finance"
export { ORDER_STATUSES, aggregateOrdersByStatus, interpretOperation } from "./operation"
export { topFindings, findingsByCategory } from "./monitor"
export type { ReportTable } from "./reports"
export {
  buildBalanceReport,
  buildMonthlySeriesReport,
  buildInventoryReport,
  buildCustomersReport,
} from "./reports"
