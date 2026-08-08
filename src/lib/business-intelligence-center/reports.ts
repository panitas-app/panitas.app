/**
 * Reportes del Business Intelligence Center (FASE 5A).
 *
 * Construcción de tablas de exportación (CSV/Excel/PDF) a partir de los datos
 * que ya devuelven las APIs. Lógica pura y testeable: la serialización a cada
 * formato vive en la UI.
 */
import type { MonthlyPoint } from "./types"

/** Tabla lista para exportar en cualquier formato. */
export interface ReportTable {
  title: string
  headers: string[]
  rows: string[][]
  /** Filas de resumen opcionales (se muestran al final). */
  summary?: { label: string; value: string }[]
}

/** Tabla del resumen financiero del mes. */
export function buildBalanceReport(input: {
  monthRevenue: number
  monthExpenses: number
  monthOrders: number
  profit: number
  marginPercent: number
  breakEven: number
  breakEvenPercent: number
  customersTotal: number
}): ReportTable {
  return {
    title: "Resumen del mes",
    headers: ["Indicador", "Valor (USD)"],
    rows: [
      ["Ingresos del mes", input.monthRevenue.toFixed(2)],
      ["Gastos del mes", input.monthExpenses.toFixed(2)],
      ["Pedidos del mes", String(input.monthOrders)],
      ["Utilidad del mes", input.profit.toFixed(2)],
      ["Margen neto (%)", input.marginPercent.toFixed(1)],
      ["Gastos fijos del mes", input.breakEven.toFixed(2)],
      ["Cobertura del punto de equilibrio (%)", String(input.breakEvenPercent)],
    ],
  }
}

/** Tabla de la serie mensual (ingresos vs gastos). */
export function buildMonthlySeriesReport(series: MonthlyPoint[]): ReportTable {
  const revenue = series.reduce((s, p) => s + p.revenue, 0)
  const expenses = series.reduce((s, p) => s + p.expenses, 0)
  return {
    title: "Serie mensual",
    headers: ["Mes", "Ingresos (USD)", "Gastos (USD)", "Resultado (USD)"],
    rows: series.map((p) => [
      p.label,
      p.revenue.toFixed(2),
      p.expenses.toFixed(2),
      (p.revenue - p.expenses).toFixed(2),
    ]),
    summary: [
      { label: "Ingresos del período", value: revenue.toFixed(2) },
      { label: "Gastos del período", value: expenses.toFixed(2) },
      { label: "Resultado del período", value: (revenue - expenses).toFixed(2) },
    ],
  }
}

/** Tabla de inventario y márgenes por producto. */
export function buildInventoryReport(input: {
  productCount: number
  totalCostValue: number
  totalSellValue: number
  totalProfit: number
  profitMargin: number
  products: {
    name: string
    stock: number
    costPrice: number
    price: number
    marginPerUnit: number
    marginPercent: number
  }[]
}): ReportTable {
  return {
    title: "Inventario y márgenes",
    headers: ["Producto", "Stock", "Costo (USD)", "Precio (USD)", "Margen (USD)", "Margen (%)"],
    rows: input.products.map((p) => [
      p.name,
      String(p.stock),
      p.costPrice.toFixed(2),
      p.price.toFixed(2),
      p.marginPerUnit.toFixed(2),
      p.marginPercent.toFixed(1),
    ]),
    summary: [
      { label: "Valor del inventario (venta)", value: input.totalSellValue.toFixed(2) },
      { label: "Valor del inventario (costo)", value: input.totalCostValue.toFixed(2) },
      { label: "Ganancia potencial", value: input.totalProfit.toFixed(2) },
      { label: "Margen (%)", value: input.profitMargin.toFixed(1) },
    ],
  }
}

/** Tabla de la cartera de clientes. */
export function buildCustomersReport(input: {
  total: number
  newThisMonth: number
  recurrent: number
  inactive: number
  averageCustomerValue: number
  totalSpent: number
}): ReportTable {
  return {
    title: "Cartera de clientes",
    headers: ["Indicador", "Valor"],
    rows: [
      ["Clientes totales", String(input.total)],
      ["Nuevos este mes", String(input.newThisMonth)],
      ["Reincidentes", String(input.recurrent)],
      ["Inactivos", String(input.inactive)],
      ["Valor promedio", input.averageCustomerValue.toFixed(2)],
      ["Total gastado (USD)", input.totalSpent.toFixed(2)],
    ],
  }
}
