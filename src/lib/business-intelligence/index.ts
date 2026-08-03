/**
 * Business Intelligence (FASE 4B) — API pública.
 *
 * Capa de monitor de negocio e inteligencia operativa: responde a la pregunta
 * "¿cómo está mi negocio?" con datos reales, sin predicciones ni decisiones
 * automáticas por el usuario.
 */
export * from "./types"
export { RULES, rule } from "./rules"
export type { RuleDef } from "./rules"
export { InventoryAnalyzer } from "./analyzers/inventory-analyzer"
export type { InventoryAnalyzerDeps } from "./analyzers/inventory-analyzer"
export { SalesAnalyzer } from "./analyzers/sales-analyzer"
export type { SalesAnalyzerDeps } from "./analyzers/sales-analyzer"
export { OrderAnalyzer } from "./analyzers/order-analyzer"
export type { OrderAnalyzerDeps } from "./analyzers/order-analyzer"
export { CustomerAnalyzer } from "./analyzers/customer-analyzer"
export type { CustomerAnalyzerDeps } from "./analyzers/customer-analyzer"
export { ActivityAnalyzer } from "./analyzers/activity-analyzer"
export type { ActivityAnalyzerDeps } from "./analyzers/activity-analyzer"
export { InsightEngine } from "./insights/insight-engine"
export type { InsightEngineOptions } from "./insights/insight-engine"
export { prioritize, compareInsights, importanceRank, categoryRank, CATEGORY_PRIORITY, IMPORTANCE_PRIORITY } from "./insights/prioritization"
export { BusinessHealthMonitor } from "./monitors/business-health-monitor"
export type { BusinessMonitorDeps } from "./monitors/business-health-monitor"
export { BusinessSummaryGenerator } from "./generators/business-summary-generator"
export type { BusinessSummaryGeneratorDeps } from "./generators/business-summary-generator"
export { createBusinessMonitor, createBusinessSummaryGenerator } from "./factory"
export { money, pct } from "./format"
