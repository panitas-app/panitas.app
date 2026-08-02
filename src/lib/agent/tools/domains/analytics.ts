/**
 * Tools de analítica de negocio (FASE 3B).
 *
 * Componen métricas de ventas, inventario y clientes (capa FASE 2C) más pedidos
 * pendientes. Solo lectura.
 */
import { getSalesMetrics } from "@/lib/analytics"
import { getInventoryHealth } from "@/lib/analytics"
import { getCustomerMetrics } from "@/lib/analytics"
import { OrderService } from "@/services/order.service"
import type { AgentTool, ToolExecutionContext, ToolResponse } from "../types"
import { buildServiceContext } from "../context"
import { toolOk } from "../response"
import type { ToolDeps } from "../deps"

export type BusinessAlert = {
  severity: "info" | "warning" | "critical"
  type: string
  message: string
}

export function createAnalyticsTools(deps: ToolDeps = {}): AgentTool[] {
  const orderService = deps.orderService ?? new OrderService()

  const businessSummary: AgentTool = {
    name: "analytics.businessSummary",
    domain: "analytics",
    description:
      "Resumen general del negocio: ventas (hoy/semana/mes), salud del inventario, métricas de clientes y pedidos pendientes.",
    requiredPermissions: ["report.read"],
    inputSchema: { type: "object", properties: {} },
    async execute(ctx: ToolExecutionContext): Promise<ToolResponse> {
      const storeId = ctx.storeId
      const [sales, inventory, customers, pendingOrders] = await Promise.all([
        getSalesMetrics(storeId),
        getInventoryHealth(storeId),
        getCustomerMetrics(storeId),
        orderService.getPending(buildServiceContext(ctx), 10),
      ])
      return toolOk({
        sales,
        inventory: {
          lowStockCount: inventory.lowStock.length,
          lowStock: inventory.lowStock,
          noMovementCount: inventory.noMovement.length,
        },
        customers,
        pendingOrders: {
          count: pendingOrders.length,
          orders: pendingOrders,
        },
      })
    },
  }

  const businessAlerts: AgentTool = {
    name: "analytics.businessAlerts",
    domain: "analytics",
    description: "Alertas de negocio: stock bajo, productos sin movimiento, ventas bajas hoy y pedidos pendientes.",
    requiredPermissions: ["report.read"],
    inputSchema: { type: "object", properties: {} },
    async execute(ctx: ToolExecutionContext): Promise<ToolResponse> {
      const storeId = ctx.storeId
      const [inventory, sales, pendingOrders] = await Promise.all([
        getInventoryHealth(storeId),
        getSalesMetrics(storeId),
        orderService.getPending(buildServiceContext(ctx), 20),
      ])

      const alerts: BusinessAlert[] = []

      for (const item of inventory.lowStock) {
        alerts.push({
          severity: item.stock === 0 ? "critical" : "warning",
          type: "low_stock",
          message: `Stock bajo: ${item.name} (${item.stock})`,
        })
      }

      for (const item of inventory.noMovement) {
        alerts.push({
          severity: "info",
          type: "no_movement",
          message: `Sin movimientos en 30 días: ${item.name}`,
        })
      }

      if (sales.today.revenue === 0) {
        alerts.push({ severity: "info", type: "no_sales_today", message: "Aún no hay ventas registradas hoy." })
      }

      if (pendingOrders.length > 0) {
        alerts.push({
          severity: "warning",
          type: "pending_orders",
          message: `Hay ${pendingOrders.length} pedidos pendientes de atender.`,
        })
      }

      return toolOk(alerts)
    },
  }

  return [businessSummary, businessAlerts]
}
