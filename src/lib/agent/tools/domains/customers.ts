/**
 * Tools de clientes (FASE 3B).
 *
 * Consultas y creación de clientes a través de los servicios. Nunca toca Prisma.
 */
import { CustomerService } from "@/services/customer.service"
import { SalesService } from "@/services/sales.service"
import type { AgentTool, ToolExecutionContext, ToolResponse } from "../types"
import { buildServiceContext } from "../context"
import { toolOk } from "../response"
import type { ToolDeps } from "../deps"

export function createCustomerTools(deps: ToolDeps = {}): AgentTool[] {
  const customerService = deps.customerService ?? new CustomerService()
  const salesService = deps.salesService ?? new SalesService()

  const search: AgentTool = {
    name: "customers.search",
    domain: "customers",
    description: "Busca clientes del negocio por término (nombre, teléfono, email o documento).",
    requiredPermissions: ["customer.read"],
    inputSchema: {
      type: "object",
      properties: {
        q: { type: "string", description: "Término de búsqueda", required: false },
        take: { type: "number", description: "Cantidad máxima (máx 50)", required: false },
      },
    },
    async execute(ctx: ToolExecutionContext, input: Record<string, unknown>): Promise<ToolResponse> {
      const take = typeof input.take === "number" ? Math.min(input.take, 50) : 20
      const result = await customerService.list(buildServiceContext(ctx), {
        q: typeof input.q === "string" ? input.q : undefined,
        take,
      })
      return toolOk(result)
    },
  }

  const getHistory: AgentTool = {
    name: "customers.getHistory",
    domain: "customers",
    description: "Historial de compras de un cliente del negocio (con items).",
    requiredPermissions: ["customer.read"],
    inputSchema: {
      type: "object",
      properties: {
        customerId: { type: "string", description: "ID del cliente", required: true },
        take: { type: "number", description: "Cantidad máxima de pedidos", required: false },
      },
    },
    async execute(ctx: ToolExecutionContext, input: Record<string, unknown>): Promise<ToolResponse> {
      const take = typeof input.take === "number" ? Math.min(input.take, 50) : 20
      const history = await customerService.getHistory(buildServiceContext(ctx), input.customerId as string, take)
      return toolOk(history)
    },
  }

  const getTopCustomers: AgentTool = {
    name: "customers.getTopCustomers",
    domain: "customers",
    description: "Clientes frecuentes del negocio en un período (por compras y total gastado).",
    requiredPermissions: ["customer.read"],
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
      const customers = await salesService.frequentCustomers(
        buildServiceContext(ctx),
        typeof input.from === "string" ? input.from : undefined,
        typeof input.to === "string" ? input.to : undefined,
        take
      )
      return toolOk(customers)
    },
  }

  const create: AgentTool = {
    name: "customers.create",
    domain: "customers",
    description: "Busca un cliente por teléfono o lo crea si no existe.",
    requiredPermissions: ["customer.create"],
    inputSchema: {
      type: "object",
      properties: {
        phone: { type: "string", description: "Teléfono del cliente", required: true },
        name: { type: "string", description: "Nombre", required: false },
        email: { type: "string", description: "Email", required: false },
        documentId: { type: "string", description: "Documento", required: false },
        address: { type: "string", description: "Dirección", required: false },
        city: { type: "string", description: "Ciudad", required: false },
        state: { type: "string", description: "Estado/Provincia", required: false },
      },
    },
    async execute(ctx: ToolExecutionContext, input: Record<string, unknown>): Promise<ToolResponse> {
      const result = await customerService.findOrCreateByPhone(buildServiceContext(ctx), {
        phone: input.phone as string,
        name: typeof input.name === "string" ? input.name : null,
        documentId: typeof input.documentId === "string" ? input.documentId : null,
        email: typeof input.email === "string" ? input.email : null,
        address: typeof input.address === "string" ? input.address : null,
        city: typeof input.city === "string" ? input.city : null,
        state: typeof input.state === "string" ? input.state : null,
      })
      return toolOk(result)
    },
  }

  return [search, getHistory, getTopCustomers, create]
}
