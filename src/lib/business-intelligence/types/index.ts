/**
 * Contratos de la capa de Business Intelligence (FASE 4B).
 *
 * Tipos compartidos por el Business Monitor: observaciones de los analizadores,
 * insights priorizados, métricas y el resumen final listo para dashboard, chat
 * y móvil. Solo contratos, sin lógica.
 *
 * Regla de capas: estos tipos no dependen de Prisma ni de repositorios.
 * El aislamiento de negocio se garantiza porque toda consulta parte del
 * `StoreServiceContext` autenticado.
 */
import type { StoreServiceContext } from "@/services/context"

/** Categorías de situación que detecta el monitor. */
export type InsightCategory = "inventory" | "sales" | "orders" | "customers" | "activity" | "general"

/** Importancia de un insight (INFO/WARNING/IMPORTANT — sin lenguaje alarmista). */
export type InsightImportance = "info" | "warning" | "important"

/** Estado de salud general del negocio. */
export type HealthStatus = "estable" | "atencion" | "revision"

/** Hallazgo crudo de un analizador (antes de convertirse en insight). */
export interface Observation {
  /** Id de la regla del catálogo que la originó. */
  ruleId: string
  category: InsightCategory
  importance: InsightImportance
  title: string
  description: string
  /** Fuente de datos con la que se construyó (servicio/analytics). */
  dataSource: string
  /** Sugerencia de revisión/acción concreta (nunca una decisión automática). */
  action?: string
  metricValue?: number
  entityId?: string
}

/** Insight final, priorizado y listo para consumir. */
export interface Insight {
  id: string
  category: InsightCategory
  importance: InsightImportance
  title: string
  description: string
  dataSource: string
  createdAt: string
  action?: string
  metricValue?: number
  entityId?: string
}

/** Métrica plana para tarjetas de dashboard (valor crudo + formato). */
export interface BusinessMetric {
  key: string
  label: string
  value: number
  format: "currency" | "number" | "percent"
}

/** Vista general de salud del negocio. */
export interface HealthOverview {
  status: HealthStatus
  summary: string
  counts: {
    important: number
    warning: number
    info: number
  }
}

/** Resumen completo del negocio (shape de la API / dashboard / chat). */
export interface BusinessSummary {
  storeId: string
  generatedAt: string
  greeting: string
  /** Párrafo en lenguaje natural que responde "¿cómo está mi negocio?". */
  summary: string
  overview: HealthOverview
  insights: Insight[]
  metrics: BusinessMetric[]
  /** Acciones de revisión sugeridas (sin decisiones automáticas). */
  recommendations: string[]
}

/** Valores agregados que el monitor deja listos para el resumen y la UI. */
export interface ActivitySnapshot {
  salesTodayOrders: number
  salesTodayRevenue: number
  salesWeekRevenue: number
  salesMonthRevenue: number
  averageTicketMonth: number
  lowStockCount: number
  pendingOrders: number
  totalCustomers: number
  newCustomersThisMonth: number
  activeCustomersThisMonth: number
  customersWithOutstanding: number
}

/** Reporte intermedio producido por el Business Health Monitor. */
export interface MonitorReport {
  generatedAt: string
  snapshot: ActivitySnapshot
  observations: Observation[]
  metrics: BusinessMetric[]
}

/** Entrada del monitor y del generador (siempre con contexto autenticado). */
export interface BusinessMonitorInput {
  ctx: StoreServiceContext
  userName?: string
  storeName?: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Datos que cada analizador devuelve junto a sus observaciones (para que el
// monitor arme el snapshot sin repetir consultas).
// ─────────────────────────────────────────────────────────────────────────────

export interface InventoryData {
  lowStockCount: number
  outOfStockCount: number
  noMovementCount: number
}

export interface SalesData {
  todayOrders: number
  todayRevenue: number
  weekRevenue: number
  monthRevenue: number
  averageTicket: number
}

export interface OrderData {
  pendingCount: number
  delayedCount: number
}

export interface CustomerData {
  totalCustomers: number
  newThisMonth: number
  activeThisMonth: number
  outstandingCustomers: number
  inactiveCount: number
}

export interface AnalyzerResult<TData> {
  observations: Observation[]
  data: TData
}
