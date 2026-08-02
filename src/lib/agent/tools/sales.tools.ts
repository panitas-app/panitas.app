import { SalesService } from "@/services/sales.service"
import { OrderService } from "@/services/order.service"
import type { AgentTool } from "@/lib/agent/types"

const salesService = new SalesService()
const orderService = new OrderService()

export const salesTools: AgentTool[] = [
  {
    name: "sales.summary",
    description: "Resumen de ventas (ingresos, número de órdenes y artículos) para un período",
    permissions: ["sales.read"],
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
    name: "sales.create_order",
    description: "Crea una venta u orden desde el punto de venta (POS)",
    permissions: ["sales.create"],
    input_schema: {
      type: "object",
      properties: {
        items: { type: "array", description: "Artículos: [{ productId, quantity, price? }]" },
        customerPhone: { type: "string", description: "Teléfono del cliente" },
        customerName: { type: "string", description: "Nombre del cliente" },
        payments: { type: "array", description: "Pagos: [{ method, amount }]" },
      },
      required: ["items"],
    },
    async execute(ctx, input) {
      const order = await orderService.create(
        { userId: ctx.userId, storeId: ctx.storeId, plan: ctx.plan, storeName: "", storeEmail: null },
        { ...input, source: "pos" }
      )
      const anyOrder = order as unknown as { id: string; orderNumber: string }
      return { ok: true, data: { id: anyOrder.id, orderNumber: anyOrder.orderNumber } }
    },
  },
]
