import { describe, expect, it } from "vitest"
import { aggregateOrdersByStatus, interpretOperation } from "@/lib/business-intelligence-center"

describe("operation (FASE 5A)", () => {
  it("agrega conteos por estado con los 6 estados siempre presentes", () => {
    const totals = aggregateOrdersByStatus({ pending: 3, delivered: 5, cancelled: 2 })
    expect(totals.total).toBe(10)
    expect(totals.cancelled).toBe(2)
    expect(totals.active).toBe(8)
    expect(totals.pending).toBe(3)
    expect(totals.delivered).toBe(5)
    expect(totals.byStatus.confirmed).toBe(0)
    expect(Object.keys(totals.byStatus)).toHaveLength(6)
  })

  it("no cuenta cancelados como pedidos activos", () => {
    const totals = aggregateOrdersByStatus({ pending: 1, cancelled: 4 })
    expect(totals.total).toBe(5)
    expect(totals.active).toBe(1)
  })

  it("interpreta la operación con datos del mes", () => {
    const text = interpretOperation({
      monthRevenue: 500,
      monthOrders: 10,
      activeOrders: 8,
      pendingOrders: 2,
      customersTotal: 50,
      newCustomersThisMonth: 5,
      productCount: 20,
      lowStockCount: 3,
    })
    expect(text).toContain("10 pedidos este mes por $500.00")
    expect(text).toContain("8 pedidos están activos")
    expect(text).toContain("2 están pendientes")
    expect(text).toContain("50 clientes")
    expect(text).toContain("5 nuevos este mes")
    expect(text).toContain("20 productos en inventario, 3 con stock bajo")
  })

  it("interpreta un mes sin actividad", () => {
    const text = interpretOperation({
      monthRevenue: 0,
      monthOrders: 0,
      activeOrders: 0,
      pendingOrders: 0,
      customersTotal: 0,
      newCustomersThisMonth: 0,
      productCount: 0,
      lowStockCount: 0,
    })
    expect(text).toContain("Aún no registras pedidos este mes")
  })
})
