/**
 * Tools de ventas (FASE 3B).
 *
 * Consultas de ventas a través de `SalesService`. Solo lectura.
 */
import { SalesService } from "@/services/sales.service"
import type { AgentTool, ToolExecutionContext, ToolResponse } from "../types"
import { buildServiceContext } from "../context"
import { toolOk } from "../response"
import type { ToolDeps } from "../deps"

export function createSalesTools(deps: ToolDeps = {}): AgentTool[] {
  const salesService = deps.salesService ?? new SalesService()

  const getTodaySummary: AgentTool = {
    name: "sales.getTodaySummary",
    domain: "sales",
    description: "Resumen de ventas del día, la semana y el mes (ingresos, pedidos, ticket promedio, top productos, clientes frecuentes).",
    requiredPermissions: ["sales.read"],
    inputSchema: { type: "object", properties: {} },
    async execute(ctx: ToolExecutionContext): Promise<ToolResponse> {
      const summary = await salesService.dailySummary(buildServiceContext(ctx))
      return toolOk(summary)
    },
  }

  const getPeriodSummary: AgentTool = {
    name: "sales.getPeriodSummary",
    domain: "sales",
    description: "Resumen de ventas para un período (from/to ISO): ingresos, pedidos, items y ticket promedio.",
    requiredPermissions: ["sales.read"],
    inputSchema: {
      type: "object",
      properties: {
        from: { type: "string", description: "Fecha inicio (ISO)", required: false },
        to: { type: "string", description: "Fecha fin (ISO)", required: false },
      },
    },
    async execute(ctx: ToolExecutionContext, input: Record<string, unknown>): Promise<ToolResponse> {
      const summary = await salesService.summary(buildServiceContext(ctx), {
        from: typeof input.from === "string" ? input.from : null,
        to: typeof input.to === "string" ? input.to : null,
      })
      return toolOk(summary)
    },
  }

  const getTopProducts: AgentTool = {
    name: "sales.getTopProducts",
    domain: "sales",
    description: "Productos más vendidos del negocio en un período (por cantidad).",
    requiredPermissions: ["sales.read"],
    inputSchema: {
      type: "object",
      properties: {
        from: { type: "string", description: "Fecha inicio (ISO)", required: false },
        to: { type: "string", description: "Fecha fin (ISO)", required: false },
        take: { type: "number", description: "Cantidad máxima (máx 20)", required: false },
      },
    },
    async execute(ctx: ToolExecutionContext, input: Record<string, unknown>): Promise<ToolResponse> {
      const take = typeof input.take === "number" ? Math.min(input.take, 20) : 10
      const products = await salesService.productsSold(
        buildServiceContext(ctx),
        typeof input.from === "string" ? input.from : undefined,
        typeof input.to === "string" ? input.to : undefined,
        take
      )
      return toolOk(products)
    },
  }

  const getRecentSales: AgentTool = {
    name: "sales.getRecentSales",
    domain: "sales",
    description: "Últimas ventas registradas del negocio (con items y pagos).",
    requiredPermissions: ["sales.read"],
    inputSchema: {
      type: "object",
      properties: {
        take: { type: "number", description: "Cantidad máxima (máx 50)", required: false },
      },
    },
    async execute(ctx: ToolExecutionContext, input: Record<string, unknown>): Promise<ToolResponse> {
      const take = typeof input.take === "number" ? Math.min(input.take, 50) : 10
      const recent = await salesService.recent(buildServiceContext(ctx), take)
      return toolOk(recent)
    },
  }

  return [getTodaySummary, getPeriodSummary, getTopProducts, getRecentSales]
}
