import { describe, expect, it, vi } from "vitest"
import { BusinessSummaryGenerator } from "@/lib/business-intelligence/generators/business-summary-generator"
import type { ActivitySnapshot, MonitorReport } from "@/lib/business-intelligence/types"
import type { StoreServiceContext } from "@/services/context"

const ctx: StoreServiceContext = { storeId: "store-1", userId: "user-1", plan: "business" }

function report(observations: MonitorReport["observations"], snapshot: Partial<ActivitySnapshot> = {}): MonitorReport {
  return {
    generatedAt: "2026-08-03T12:00:00.000Z",
    snapshot: {
      salesTodayOrders: 4,
      salesTodayRevenue: 100,
      salesWeekRevenue: 700,
      salesMonthRevenue: 2500,
      averageTicketMonth: 50,
      lowStockCount: 2,
      pendingOrders: 2,
      totalCustomers: 10,
      newCustomersThisMonth: 2,
      activeCustomersThisMonth: 4,
      customersWithOutstanding: 1,
      ...snapshot,
    },
    observations,
    metrics: [{ key: "sales_today", label: "Ventas hoy", value: 100, format: "currency" }],
  }
}

const importantObservation = {
  ruleId: "inventory.low_stock",
  category: "inventory" as const,
  importance: "important" as const,
  title: "2 productos con inventario bajo",
  description: "Hay 2 productos con stock por debajo del umbral.",
  dataSource: "inventory.overview",
  action: "Revisa los productos con inventario bajo.",
}

function makeMonitor() {
  return {
    monitor: vi.fn(),
  }
}

describe("BusinessSummaryGenerator (FASE 4B)", () => {
  it("compone resumen, salud, insights y métricas del reporte del monitor", async () => {
    const monitor = makeMonitor()
    monitor.monitor.mockResolvedValue(report([importantObservation]))
    const generator = new BusinessSummaryGenerator({ monitor: monitor as never, now: new Date("2026-08-03T09:00:00") })

    const summary = await generator.generate({ ctx, userName: "Juan" })

    expect(summary.storeId).toBe("store-1")
    expect(summary.greeting).toBe("Buenos días Juan")
    expect(summary.overview.status).toBe("revision")
    expect(summary.overview.counts).toEqual({ important: 1, warning: 0, info: 0 })
    expect(summary.overview.summary).toContain("1 punto importante")
    expect(summary.summary).toContain("Revisé el estado de tu negocio.")
    expect(summary.summary).toContain("Encontré 1 punto importante para revisar.")
    expect(summary.summary).toContain("4 ventas")
    expect(summary.summary).toContain("Bs 100,00")

    expect(summary.insights).toHaveLength(1)
    expect(summary.insights[0].id).toBe("insight:inventory.low_stock")
    expect(summary.metrics[0].key).toBe("sales_today")

    // La acción sugerida del insight pasa a recomendaciones.
    expect(summary.recommendations).toContain("Revisa los productos con inventario bajo.")
  })

  it("estado estable cuando solo hay insights informativos", async () => {
    const monitor = makeMonitor()
    monitor.monitor.mockResolvedValue(
      report([
        {
          ruleId: "activity.overview",
          category: "activity",
          importance: "info",
          title: "Actividad del negocio",
          description: "Hoy hay 4 ventas.",
          dataSource: "monitor.snapshot",
        },
      ])
    )
    const generator = new BusinessSummaryGenerator({ monitor: monitor as never, now: new Date("2026-08-03T12:00:00") })

    const summary = await generator.generate({ ctx })

    expect(summary.overview.status).toBe("estable")
    expect(summary.overview.counts.important).toBe(0)
    expect(summary.overview.counts.warning).toBe(0)
    expect(summary.summary).toContain("Todo se ve estable en ventas, inventario y pedidos.")
  })

  it("estado de atención cuando hay warnings pero ningún importante", async () => {
    const monitor = makeMonitor()
    monitor.monitor.mockResolvedValue(
      report([
        {
          ruleId: "orders.delayed",
          category: "orders",
          importance: "warning",
          title: "1 pedido con posible demora",
          description: "1 pedido lleva más de 3 días sin completarse.",
          dataSource: "orders.list",
        },
      ])
    )
    const generator = new BusinessSummaryGenerator({ monitor: monitor as never, now: new Date("2026-08-03T12:00:00") })

    const summary = await generator.generate({ ctx })

    expect(summary.overview.status).toBe("atencion")
    expect(summary.overview.summary).toContain("1 punto merece seguimiento")
  })

  it("deduplica recomendaciones repetidas", async () => {
    const monitor = makeMonitor()
    monitor.monitor.mockResolvedValue(
      report([importantObservation, { ...importantObservation, ruleId: "inventory.out_of_stock", title: "1 producto agotado" }])
    )
    const generator = new BusinessSummaryGenerator({ monitor: monitor as never, now: new Date("2026-08-03T12:00:00") })

    const summary = await generator.generate({ ctx })
    expect(summary.recommendations).toHaveLength(1)
  })

  it("saluda según la hora del día", async () => {
    const monitor = makeMonitor()
    monitor.monitor.mockResolvedValue(report([]))
    const morning = new BusinessSummaryGenerator({ monitor: monitor as never, now: new Date("2026-08-03T08:00:00") })
    const afternoon = new BusinessSummaryGenerator({ monitor: monitor as never, now: new Date("2026-08-03T15:00:00") })
    const night = new BusinessSummaryGenerator({ monitor: monitor as never, now: new Date("2026-08-03T21:00:00") })

    expect((await morning.generate({ ctx })).greeting).toBe("Buenos días")
    expect((await afternoon.generate({ ctx })).greeting).toBe("Buenas tardes")
    expect((await night.generate({ ctx })).greeting).toBe("Buenas noches")
  })
})
