/**
 * Business Health Monitor (FASE 4B) — el corazón del monitor de negocio.
 *
 * Ejecuta los analizadores (inventario, ventas, pedidos, clientes, actividad)
 * en paralelo, consolida las observaciones, arma el snapshot de actividad y
 * las métricas planas para la UI. Responde a la pregunta "¿cómo está mi
 * negocio?" con datos reales, sin predicciones ni decisiones.
 *
 * Flujo: Monitor → Analizers → Services → Repositories.
 */
import { InventoryAnalyzer } from "../analyzers/inventory-analyzer"
import { SalesAnalyzer } from "../analyzers/sales-analyzer"
import { OrderAnalyzer } from "../analyzers/order-analyzer"
import { CustomerAnalyzer } from "../analyzers/customer-analyzer"
import { ActivityAnalyzer } from "../analyzers/activity-analyzer"
import { prioritize } from "../insights/prioritization"
import type {
  ActivitySnapshot,
  BusinessMetric,
  BusinessMonitorInput,
  MonitorReport,
  Observation,
} from "../types"

export interface BusinessMonitorDeps {
  inventory?: InventoryAnalyzer
  sales?: SalesAnalyzer
  orders?: OrderAnalyzer
  customers?: CustomerAnalyzer
  activity?: ActivityAnalyzer
}

export class BusinessHealthMonitor {
  private readonly inventory: InventoryAnalyzer
  private readonly sales: SalesAnalyzer
  private readonly orders: OrderAnalyzer
  private readonly customers: CustomerAnalyzer
  private readonly activity: ActivityAnalyzer

  constructor(deps: BusinessMonitorDeps = {}) {
    this.inventory = deps.inventory ?? new InventoryAnalyzer()
    this.sales = deps.sales ?? new SalesAnalyzer()
    this.orders = deps.orders ?? new OrderAnalyzer()
    this.customers = deps.customers ?? new CustomerAnalyzer()
    this.activity = deps.activity ?? new ActivityAnalyzer()
  }

  async monitor(input: BusinessMonitorInput): Promise<MonitorReport> {
    const ctx = input.ctx

    const [inventory, sales, orders, customers] = await Promise.all([
      this.inventory.run(ctx),
      this.sales.run(ctx),
      this.orders.run(ctx),
      this.customers.run(ctx),
    ])

    const snapshot: ActivitySnapshot = {
      salesTodayOrders: sales.data.todayOrders,
      salesTodayRevenue: sales.data.todayRevenue,
      salesWeekRevenue: sales.data.weekRevenue,
      salesMonthRevenue: sales.data.monthRevenue,
      averageTicketMonth: sales.data.averageTicket,
      lowStockCount: inventory.data.lowStockCount,
      pendingOrders: orders.data.pendingCount,
      totalCustomers: customers.data.totalCustomers,
      newCustomersThisMonth: customers.data.newThisMonth,
      activeCustomersThisMonth: customers.data.activeThisMonth,
      customersWithOutstanding: customers.data.outstandingCustomers,
    }

    const activityObservations = this.activity.run(snapshot)

    const observations: Observation[] = [
      ...inventory.observations,
      ...sales.observations,
      ...orders.observations,
      ...customers.observations,
      ...activityObservations,
    ]

    return {
      generatedAt: new Date().toISOString(),
      snapshot,
      observations: prioritize(observations),
      metrics: this.buildMetrics(snapshot),
    }
  }

  private buildMetrics(snapshot: ActivitySnapshot): BusinessMetric[] {
    return [
      { key: "sales_today", label: "Ventas hoy", value: snapshot.salesTodayRevenue, format: "currency" },
      { key: "sales_week", label: "Ventas esta semana", value: snapshot.salesWeekRevenue, format: "currency" },
      { key: "sales_month", label: "Ventas del mes", value: snapshot.salesMonthRevenue, format: "currency" },
      { key: "average_ticket", label: "Ticket promedio", value: snapshot.averageTicketMonth, format: "currency" },
      { key: "pending_orders", label: "Pedidos pendientes", value: snapshot.pendingOrders, format: "number" },
      { key: "low_stock", label: "Productos con stock bajo", value: snapshot.lowStockCount, format: "number" },
      { key: "active_customers", label: "Clientes activos este mes", value: snapshot.activeCustomersThisMonth, format: "number" },
      { key: "new_customers", label: "Clientes nuevos este mes", value: snapshot.newCustomersThisMonth, format: "number" },
      { key: "total_customers", label: "Total de clientes", value: snapshot.totalCustomers, format: "number" },
      { key: "outstanding_customers", label: "Clientes con saldo pendiente", value: snapshot.customersWithOutstanding, format: "number" },
    ]
  }
}
