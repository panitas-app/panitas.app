/**
 * Tools de reportes (FASE 3B).
 *
 * Reportes de ventas a través de `SalesService`. Solo lectura.
 */
import { SalesService } from "@/services/sales.service"
import type { AgentTool, ToolExecutionContext, ToolResponse } from "../types"
import { buildServiceContext } from "../context"
import { toolOk } from "../response"
import type { ToolDeps } from "../deps"

export function createReportTools(deps: ToolDeps = {}): AgentTool[] {
  const salesService = deps.salesService ?? new SalesService()

  const sales: AgentTool = {
    name: "reports.sales",
    domain: "reports",
    description: "Reporte de ventas para un período (from/to ISO): ingresos, pedidos, items y ticket promedio.",
    requiredPermissions: ["report.read"],
    inputSchema: {
      type: "object",
      properties: {
        from: { type: "string", description: "Fecha inicio (ISO)", required: false },
        to: { type: "string", description: "Fecha fin (ISO)", required: false },
      },
    },
    async execute(ctx: ToolExecutionContext, input: Record<string, unknown>): Promise<ToolResponse> {
      const report = await salesService.summary(buildServiceContext(ctx), {
        from: typeof input.from === "string" ? input.from : null,
        to: typeof input.to === "string" ? input.to : null,
      })
      return toolOk(report)
    },
  }

  const today: AgentTool = {
    name: "reports.today",
    domain: "reports",
    description: "Reporte de ventas de hoy, la semana y el mes (ingresos, pedidos, ticket, top productos, clientes frecuentes).",
    requiredPermissions: ["report.read"],
    inputSchema: { type: "object", properties: {} },
    async execute(ctx: ToolExecutionContext): Promise<ToolResponse> {
      const report = await salesService.dailySummary(buildServiceContext(ctx))
      return toolOk(report)
    },
  }

  return [sales, today]
}
