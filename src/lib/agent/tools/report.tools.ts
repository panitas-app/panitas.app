import { SalesService } from "@/services/sales.service"
import type { AgentTool } from "@/lib/agent/types"

const salesService = new SalesService()

export const reportTools: AgentTool[] = [
  {
    name: "report.sales",
    description: "Reporte de ventas para un período con ingresos, órdenes y artículos",
    permissions: ["report.read"],
    input_schema: {
      type: "object",
      properties: {
        from: { type: "string", description: "Fecha inicial (YYYY-MM-DD)" },
        to: { type: "string", description: "Fecha final (YYYY-MM-DD)" },
      },
    },
    async execute(ctx, input) {
      const summary = await salesService.summary(
        { userId: ctx.userId, storeId: ctx.storeId },
        {
          from: typeof input.from === "string" ? input.from : null,
          to: typeof input.to === "string" ? input.to : null,
        }
      )
      return { ok: true, data: summary }
    },
  },
  {
    name: "report.today",
    description: "Resumen de las ventas de hoy (ingresos, órdenes y artículos)",
    permissions: ["report.read"],
    async execute(ctx) {
      const now = new Date()
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const summary = await salesService.summary(
        { userId: ctx.userId, storeId: ctx.storeId },
        { from: start.toISOString(), to: now.toISOString() }
      )
      return { ok: true, data: { ...summary, date: start.toISOString().slice(0, 10) } }
    },
  },
]
