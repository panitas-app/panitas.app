/**
 * FASE 6D — Inteligencia Financiera.
 *
 * Tipos compartidos del motor financiero: períodos, indicadores, insights
 * priorizados, acciones rápidas y el panel ejecutivo completo.
 *
 * Principios:
 *  - Nunca inventar datos: toda cifra viene de los repositorios reales.
 *  - Cada insight es accionable y va acompañado de acciones rápidas.
 *  - Los insights se clasifican por impacto (Alta/Media/Baja).
 */

/** Períodos soportados por el panel financiero. */
export type FinancialPeriod = "today" | "week" | "month"

/** Prioridad de impacto de un insight. */
export type FinancialPriority = "alta" | "media" | "baja"

/** Rango de fechas de un período y del período anterior (comparativa). */
export interface FinancialRange {
  period: FinancialPeriod
  /** Etiqueta humana del período, p. ej. "esta semana". */
  label: string
  from: Date
  to: Date
  prevFrom: Date
  prevTo: Date
}

export interface TopDebtor {
  name: string
  pending: number
}

export interface TopPayableSupplier {
  name: string
  outstanding: number
  dueDate: string | null
}

/**
 * Indicadores financieros agregados de un período.
 * Todos los montos en la moneda local del negocio.
 */
export interface FinancialIndicators {
  period: FinancialPeriod
  label: string

  /** Ingresos del período (ventas pagadas/verificadas). */
  revenue: number
  previousRevenue: number
  /** Variación porcentual vs período anterior (null si no hay base). */
  revenueDeltaPct: number | null

  /** Gastos registrados en el período. */
  expenses: number
  previousExpenses: number
  expensesDeltaPct: number | null

  /** Ingresos − gastos del período. */
  netFlow: number

  /** Total por cobrar (créditos pendientes). */
  totalPending: number
  /** Total recuperado de créditos dentro del período. */
  recoveredInPeriod: number
  /** % de recuperación = recuperado / (recuperado + pendiente). */
  recoveryRate: number
  /** Cantidad de créditos vencidos. */
  overdueCredits: number
  /** Monto total vencido en créditos. */
  overdueCreditAmount: number
  /** Monto por cobrar en los próximos 7 días (incluye vencidos). */
  dueNext7DaysCollect: number
  topDebtors: TopDebtor[]

  /** Total por pagar a proveedores (cuentas por pagar). */
  totalPayable: number
  /** Pagado a proveedores dentro del período. */
  paidToSuppliersInPeriod: number
  /** Cantidad de facturas de proveedores vencidas. */
  overdueSupplierInvoices: number
  /** Monto total de facturas de proveedores vencidas. */
  overdueSupplierAmount: number
  /** Monto por pagar a proveedores en los próximos 7 días (incluye vencidas). */
  dueNext7DaysPay: number
  topPayableSuppliers: TopPayableSupplier[]
}

/** Tipo de acción rápida asociada a un insight. */
export type FinancialActionType = "link" | "assistant"

export interface FinancialAction {
  label: string
  type: FinancialActionType
  /** Destino de navegación cuando type === "link". */
  href?: string
  /** Consulta sugerida para el asistente cuando type === "assistant". */
  prompt?: string
}

/** Categorías de insights emitidos por el motor. */
export type FinancialInsightCategory =
  | "flujo_negativo"
  | "flujo_positivo"
  | "creditos_vencidos"
  | "facturas_vencidas"
  | "cobrar_esta_semana"
  | "pagar_esta_semana"
  | "ventas_crecieron"
  | "ventas_cayeron"
  | "gastos_aumentaron"
  | "deuda_concentrada"
  | "recuperacion_creditos"
  | "por_pagar_mayor"

export interface FinancialInsight {
  id: string
  title: string
  description?: string
  category: FinancialInsightCategory
  priority: FinancialPriority
  /** Monto o porcentaje de referencia para ordenar dentro del mismo nivel. */
  value?: number
  actions: FinancialAction[]
}

export type FinancialSummaryTone = "positive" | "warning" | "neutral"

export interface FinancialSummary {
  paragraphs: string[]
  tone: FinancialSummaryTone
}

/** Panel ejecutivo completo de inteligencia financiera. */
export interface FinancialPanel {
  period: FinancialPeriod
  label: string
  generatedAt: string
  indicators: FinancialIndicators
  summary: FinancialSummary
  insights: FinancialInsight[]
}
