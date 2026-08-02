/**
 * Tools de pedidos (FASE 3B).
 *
 * Consultas y actualización de estado de pedidos vía `OrderService` (que valida
 * pertenencia al negocio y restaura stock al cancelar). Nunca toca Prisma.
 */
import { OrderService } from "@/services/order.service"
import type { AgentTool, ToolExecutionContext, ToolResponse } from "../types"
import { buildServiceContext } from "../context"
import { toolOk } from "../response"
import type { ToolDeps } from "../deps"

export function createOrderTools(deps: ToolDeps = {}): AgentTool[] {
  const orderService = deps.orderService ?? new OrderService()

  const getPending: AgentTool = {
    name: "orders.getPending",
    domain: "orders",
    description: "Pedidos pendientes de atender del negocio (con items y pagos).",
    requiredPermissions: ["order.read"],
    inputSchema: {
      type: "object",
      properties: {
        take: { type: "number", description: "Cantidad máxima (máx 50)", required: false },
      },
    },
    async execute(ctx: ToolExecutionContext, input: Record<string, unknown>): Promise<ToolResponse> {
      const take = typeof input.take === "number" ? Math.min(input.take, 50) : 20
      const orders = await orderService.getPending(buildServiceContext(ctx), take)
      return toolOk(orders)
    },
  }

  const getDetails: AgentTool = {
    name: "orders.getDetails",
    domain: "orders",
    description: "Detalle completo de un pedido del negocio (items, pagos y cuotas).",
    requiredPermissions: ["order.read"],
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "ID del pedido", required: true },
      },
    },
    async execute(ctx: ToolExecutionContext, input: Record<string, unknown>): Promise<ToolResponse> {
      const order = await orderService.getById(buildServiceContext(ctx), input.id as string)
      return toolOk(order)
    },
  }

  const updateStatus: AgentTool = {
    name: "orders.updateStatus",
    domain: "orders",
    description:
      "Cambia el estado de un pedido: pending, confirmed, preparing, shipped, delivered, cancelled. Al cancelar restaura stock.",
    requiredPermissions: ["order.update"],
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "ID del pedido", required: true },
        status: {
          type: "string",
          description: "Nuevo estado: pending | confirmed | preparing | shipped | delivered | cancelled",
          required: true,
        },
      },
    },
    async execute(ctx: ToolExecutionContext, input: Record<string, unknown>): Promise<ToolResponse> {
      const order = await orderService.updateStatus(buildServiceContext(ctx), input.id as string, input.status as string)
      return toolOk(order)
    },
  }

  return [getPending, getDetails, updateStatus]
}
