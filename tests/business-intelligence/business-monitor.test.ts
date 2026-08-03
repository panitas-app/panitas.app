import { describe, expect, it, vi } from "vitest"
import { BusinessHealthMonitor } from "@/lib/business-intelligence/monitors/business-health-monitor"
import type {
  AnalyzerResult,
  CustomerData,
  InventoryData,
  Observation,
  OrderData,
  SalesData,
} from "@/lib/business-intelligence/types"
import type { StoreServiceContext } from "@/services/context"

const ctx: StoreServiceContext = { storeId: "store-1", userId: "user-1", plan: "business" }

function result<TData>(observations: Observation[], data: TData): AnalyzerResult<TData> {
  return { observations, data }
}

function inventoryResult(): AnalyzerResult<InventoryData> {
  return result<InventoryData>(
    [
      {
        ruleId: "inventory.low_stock",
        category: "inventory",
        importance: "important",
        title: "2 productos con inventario bajo",
        description: "Hay 2 productos con stock por debajo del umbral.",
        dataSource: "inventory.overview",
      },
    ],
    { lowStockCount: 2, outOfStockCount: 1, noMovementCount: 3 }
  )
}

function salesResult(): AnalyzerResult<SalesData> {
  return result<SalesData>(
    [],
    { todayOrders: 4, todayRevenue: 100, weekRevenue: 700, monthRevenue: 2500, averageTicket: 50 }
  )
}

function ordersResult(): AnalyzerResult<OrderData> {
  return result<OrderData>([], { pendingCount: 2, delayedCount: 1 })
}

function customersResult(): AnalyzerResult<CustomerData> {
  return result<CustomerData>(
    [],
    { totalCustomers: 10, newThisMonth: 2, activeThisMonth: 4, outstandingCustomers: 1, inactiveCount: 3 }
  )
}

function makeMonitor() {
  const inventory = { run: vi.fn().mockResolvedValue(inventoryResult()) }
  const sales = { run: vi.fn().mockResolvedValue(salesResult()) }
  const orders = { run: vi.fn().mockResolvedValue(ordersResult()) }
  const customers = { run: vi.fn().mockResolvedValue(customersResult()) }
  const activity = { run: vi.fn().mockReturnValue([]) }
  const monitor = new BusinessHealthMonitor({ inventory, sales, orders, customers, activity } as never)
  return { inventory, sales, orders, customers, activity, monitor }
}

describe("BusinessHealthMonitor (FASE 4B)", () => {
  it("ejecuta los analizadores con el contexto autenticado (aislamiento por tienda)", async () => {
    const m = makeMonitor()
    await m.monitor.monitor({ ctx })

    expect(m.inventory.run).toHaveBeenCalledWith(ctx)
    expect(m.sales.run).toHaveBeenCalledWith(ctx)
    expect(m.orders.run).toHaveBeenCalledWith(ctx)
    expect(m.customers.run).toHaveBeenCalledWith(ctx)
  })

  it("arma el snapshot de actividad con los datos agregados", async () => {
    const m = makeMonitor()
    const report = await m.monitor.monitor({ ctx })

    expect(report.snapshot.salesTodayOrders).toBe(4)
    expect(report.snapshot.salesTodayRevenue).toBe(100)
    expect(report.snapshot.salesWeekRevenue).toBe(700)
    expect(report.snapshot.salesMonthRevenue).toBe(2500)
    expect(report.snapshot.averageTicketMonth).toBe(50)
    expect(report.snapshot.lowStockCount).toBe(2)
    expect(report.snapshot.pendingOrders).toBe(2)
    expect(report.snapshot.totalCustomers).toBe(10)
    expect(report.snapshot.newCustomersThisMonth).toBe(2)
    expect(report.snapshot.activeCustomersThisMonth).toBe(4)
    expect(report.snapshot.customersWithOutstanding).toBe(1)
  })

  it("consolida observaciones de todos los analizadores y las prioriza", async () => {
    const m = makeMonitor()
    const report = await m.monitor.monitor({ ctx })

    expect(m.activity.run).toHaveBeenCalledWith(report.snapshot)
    // La observación importante de inventario aparece primero.
    expect(report.observations[0].ruleId).toBe("inventory.low_stock")
    expect(report.observations[0].importance).toBe("important")
  })

  it("construye las métricas planas para la UI", async () => {
    const m = makeMonitor()
    const report = await m.monitor.monitor({ ctx })

    expect(report.metrics).toHaveLength(10)
    const byKey = Object.fromEntries(report.metrics.map((metric) => [metric.key, metric]))
    expect(byKey.sales_today).toEqual({ key: "sales_today", label: "Ventas hoy", value: 100, format: "currency" })
    expect(byKey.pending_orders.value).toBe(2)
    expect(byKey.low_stock.value).toBe(2)
    expect(byKey.outstanding_customers.value).toBe(1)
    expect(byKey.total_customers.value).toBe(10)
  })
})
