import { OrderService } from "@/services/order.service"
import type { AgentTool } from "@/lib/agent/types"

const orderService = new OrderService()

export const orderTools: AgentTool[] = [
  {
    name: "order.list",
    description: "Lista órdenes/pedidos con filtro opcional por estado",
    permissions: ["order.read"],
    input_schema: {
      type: "object",
      properties: {
        status: { type: "string", description: "Estado: pending, confirmed, preparing, shipped, delivered, cancelled" },
      },
    },
    async execute(ctx, input) {
      const status = typeof input.status === "string" && input.status ? input.status : null
      const { orders, total } = await orderService.list(
        { userId: ctx.userId, storeId: ctx.storeId },
        { status, skip: 0, take: 20 }
      )
      return {
        ok: true,
        data: {
          total,
          orders: orders.map((o) => ({
            id: o.id,
            orderNumber: o.orderNumber,
            status: o.status,
            paymentStatus: o.paymentStatus,
            total: o.total,
            customerName: o.customerName,
            createdAt: o.createdAt,
          })),
        },
      }
    },
  },
  {
    name: "order.get",
    description: "Obtiene el detalle de una orden por ID",
    permissions: ["order.read"],
    input_schema: {
      type: "object",
      properties: {
        orderId: { type: "string", description: "ID de la orden" },
      },
      required: ["orderId"],
    },
    async execute(ctx, input) {
      const orderId = typeof input.orderId === "string" ? input.orderId : ""
      if (!orderId) return { ok: false, error: "Se requiere orderId" }
      const order = await orderService.getById({ userId: ctx.userId, storeId: ctx.storeId }, orderId)
      return {
        ok: true,
        data: {
          id: order.id,
          orderNumber: order.orderNumber,
          status: order.status,
          paymentStatus: order.paymentStatus,
          total: order.total,
          customerName: order.customerName,
          customerPhone: order.customerPhone,
          createdAt: order.createdAt,
        },
      }
    },
  },
  {
    name: "order.create",
    description: "Crea una orden/pedido con los productos y cliente indicados",
    permissions: ["order.create"],
    input_schema: {
      type: "object",
      properties: {
        items: { type: "array", description: "Artículos: [{ productId, quantity, price? }]" },
        customerPhone: { type: "string", description: "Teléfono del cliente" },
        customerName: { type: "string", description: "Nombre del cliente" },
      },
      required: ["items"],
    },
    async execute(ctx, input) {
      const order = await orderService.create(
        { userId: ctx.userId, storeId: ctx.storeId, plan: ctx.plan, storeName: "", storeEmail: null },
        { ...input, source: "manual" }
      )
      const anyOrder = order as unknown as { id: string; orderNumber: string }
      return { ok: true, data: { id: anyOrder.id, orderNumber: anyOrder.orderNumber } }
    },
  },
]
