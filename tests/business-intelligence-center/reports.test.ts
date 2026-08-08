import { describe, expect, it } from "vitest"
import {
  buildBalanceReport,
  buildMonthlySeriesReport,
  buildInventoryReport,
  buildCustomersReport,
} from "@/lib/business-intelligence-center"
import type { MonthlyPoint } from "@/lib/business-intelligence-center"

describe("reports (FASE 5A)", () => {
  it("construye el resumen del mes", () => {
    const table = buildBalanceReport({
      monthRevenue: 1000,
      monthExpenses: 700,
      monthOrders: 10,
      profit: 300,
      marginPercent: 30,
      breakEven: 800,
      breakEvenPercent: 125,
      customersTotal: 40,
    })
    expect(table.title).toBe("Resumen del mes")
    expect(table.rows).toEqual([
      ["Ingresos del mes", "1000.00"],
      ["Gastos del mes", "700.00"],
      ["Pedidos del mes", "10"],
      ["Utilidad del mes", "300.00"],
      ["Margen neto (%)", "30.0"],
      ["Gastos fijos del mes", "800.00"],
      ["Cobertura del punto de equilibrio (%)", "125"],
    ])
  })

  it("construye la serie mensual con resumen del período", () => {
    const series: MonthlyPoint[] = [
      { month: "2026-01", label: "Ene 26", revenue: 100, expenses: 40 },
      { month: "2026-02", label: "Feb 26", revenue: 200, expenses: 60 },
    ]
    const table = buildMonthlySeriesReport(series)
    expect(table.rows).toHaveLength(2)
    expect(table.rows[0]).toEqual(["Ene 26", "100.00", "40.00", "60.00"])
    expect(table.summary).toEqual([
      { label: "Ingresos del período", value: "300.00" },
      { label: "Gastos del período", value: "100.00" },
      { label: "Resultado del período", value: "200.00" },
    ])
  })

  it("construye el reporte de inventario con resumen", () => {
    const table = buildInventoryReport({
      productCount: 2,
      totalCostValue: 60,
      totalSellValue: 100,
      totalProfit: 40,
      profitMargin: 40,
      products: [
        { name: "Producto A", stock: 10, costPrice: 5, price: 8, marginPerUnit: 3, marginPercent: 37.5 },
      ],
    })
    expect(table.headers[0]).toBe("Producto")
    expect(table.rows[0]).toEqual(["Producto A", "10", "5.00", "8.00", "3.00", "37.5"])
    expect(table.summary?.[0]).toEqual({ label: "Valor del inventario (venta)", value: "100.00" })
  })

  it("construye el reporte de cartera de clientes", () => {
    const table = buildCustomersReport({
      total: 50,
      newThisMonth: 5,
      recurrent: 20,
      inactive: 10,
      averageCustomerValue: 30,
      totalSpent: 1500,
    })
    expect(table.rows[0]).toEqual(["Clientes totales", "50"])
    expect(table.rows[4]).toEqual(["Valor promedio", "30.00"])
    expect(table.rows[5]).toEqual(["Total gastado (USD)", "1500.00"])
  })
})
