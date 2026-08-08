/**
 * Contratos de la capa Business Intelligence Center (FASE 5A).
 *
 * Tipos compartidos por las cinco áreas del panel: Monitor, Operación,
 * Salud Financiera, Análisis y Reportes. Solo contratos y agregados listos
 * para la UI — la consulta a la base de datos vive en las APIs existentes.
 */

/** Punto de una serie mensual (ingresos/gastos del mes). */
export interface MonthlyPoint {
  /** Clave "YYYY-MM". */
  month: string
  /** Etiqueta corta ("Ene 26"). */
  label: string
  revenue: number
  expenses: number
}

/** Totales de pedidos por estado. */
export interface OrderStatusTotals {
  total: number
  cancelled: number
  /** total - cancelados (pedidos que realmente cuentan para el negocio). */
  active: number
  pending: number
  delivered: number
  byStatus: Record<string, number>
}

/** Cartera de clientes (shape de CustomerService.metrics). */
export interface CustomerSnapshot {
  total: number
  newThisMonth: number
  recurrent: number
  inactive: number
  averageCustomerValue: number
  totalSpent: number
}

/** Snapshot de la operación diaria/mensual del negocio. */
export interface OperationSnapshot {
  sales: {
    todayRevenue: number
    weekRevenue: number
    monthRevenue: number
    averageTicketMonth: number
  }
  orders: OrderStatusTotals
  customers: CustomerSnapshot
  inventory: {
    productCount: number
    totalSellValue: number
    totalCostValue: number
    totalProfit: number
    profitMargin: number
  }
}

/** Snapshot de salud financiera del mes en curso. */
export interface FinancialHealthSnapshot {
  monthRevenue: number
  monthExpenses: number
  monthOrders: number
  profit: number
  marginPercent: number
  breakEven: number
  breakEvenPercent: number
  cashFlow: number
}
