/**
 * Tools de ventas (FASE 3B).
 *
 * Consultas de ventas a través de `SalesService` y registro de ventas vía
 * `OrderService` (FASE 3E: `sales.create`). El precio real de los productos
 * SIEMPRE se valida en el servidor; el stock se descuenta atómicamente.
 */
import { SalesService } from "@/services/sales.service"
import { OrderService } from "@/services/order.service"
import type { AgentTool, ToolExecutionContext, ToolResponse } from "../types"
import { buildServiceContext } from "../context"
import { toolOk } from "../response"
import type { ToolDeps } from "../deps"

export function createSalesTools(deps: ToolDeps = {}): AgentTool[] {
  const salesService = deps.salesService ?? new SalesService()
  const orderService = deps.orderService ?? new OrderService()

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

  const createSale: AgentTool = {
    name: "sales.create",
    domain: "sales",
    description:
      "Registra una venta/pedido. `items` acepta productos reales (type PRODUCT + productId resuelto con la búsqueda) y conceptos adicionales (type CUSTOM, sin productId, con productName como descripción). Soporta crédito (creditTerm/creditDays/downPayment) y pagos. El precio real y el stock se validan en el servidor.",
    requiredPermissions: ["sales.create"],
    inputSchema: {
      type: "object",
      properties: {
        items: {
          type: "array",
          description:
            "Ítems de la venta. PRODUCT: { type: 'PRODUCT', productId, quantity } (usa el ID resuelto por búsqueda; precio real del servidor). CUSTOM: { type: 'CUSTOM', productName, quantity, price } (concepto adicional, sin productId).",
          required: true,
        },
        customerPhone: { type: "string", description: "Teléfono del cliente (si no existe, se crea al registrar)", required: false },
        customerName: { type: "string", description: "Nombre del cliente", required: false },
        creditTerm: { type: "string", description: "Término de crédito (p.ej. '7_dias', '15_dias', '30_dias', 'cuotas_3')", required: false },
        creditDays: { type: "number", description: "Días para el vencimiento del crédito", required: false },
        downPayment: { type: "number", description: "Abono inicial en crédito", required: false },
        payments: {
          type: "array",
          description: "Pagos: [{ method: 'cash'|'card'|'transfer'|'qr'|'credit', amount, reference? }]",
          required: false,
        },
        shippingCost: { type: "number", description: "Costo de envío", required: false },
        cashRegisterSessionId: { type: "string", description: "ID de caja abierta (si aplica)", required: false },
      },
    },
    async execute(ctx: ToolExecutionContext, input: Record<string, unknown>): Promise<ToolResponse> {
      const rawItems = Array.isArray(input.items) ? (input.items as Array<Record<string, unknown>>) : []
      const items = rawItems.map((item) => {
        const isCustom = item.type === "CUSTOM" || (!item.type && !item.productId)
        return {
          type: (isCustom ? "CUSTOM" : "PRODUCT") as "PRODUCT" | "CUSTOM",
          ...(item.productId ? { productId: String(item.productId) } : {}),
          ...(item.productName ? { productName: String(item.productName) } : {}),
          quantity: Number(item.quantity),
          ...(item.price !== undefined ? { price: Number(item.price) } : {}),
          ...(item.useWholesale !== undefined ? { useWholesale: Boolean(item.useWholesale) } : {}),
        }
      })

      const payments = Array.isArray(input.payments)
        ? (input.payments as Array<Record<string, unknown>>).map((p) => ({
            method: String(p.method ?? "cash"),
            amount: Number(p.amount),
            ...(p.reference ? { reference: String(p.reference) } : {}),
          }))
        : undefined

      const order = await orderService.create(buildServiceContext(ctx), {
        source: "assistant",
        storeId: ctx.storeId,
        items,
        ...(typeof input.customerPhone === "string" ? { customerPhone: input.customerPhone } : {}),
        ...(typeof input.customerName === "string" ? { customerName: input.customerName } : {}),
        ...(typeof input.creditTerm === "string" ? { creditTerm: input.creditTerm } : {}),
        ...(typeof input.creditDays === "number" ? { creditDays: input.creditDays } : {}),
        ...(typeof input.downPayment === "number" ? { downPayment: input.downPayment } : {}),
        ...(payments && payments.length > 0 ? { payments } : {}),
        ...(typeof input.shippingCost === "number" ? { shippingCost: input.shippingCost } : {}),
        ...(typeof input.cashRegisterSessionId === "string" ? { cashRegisterSessionId: input.cashRegisterSessionId } : {}),
      })
      return toolOk(order)
    },
  }

  return [getTodaySummary, getPeriodSummary, getTopProducts, getRecentSales, createSale]
}
