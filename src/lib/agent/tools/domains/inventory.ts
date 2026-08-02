/**
 * Tools de inventario (FASE 3B).
 *
 * Consultan y actualizan stock a través de los servicios. Nunca tocan Prisma.
 * El `storeId` proviene del contexto autenticado (aislamiento de negocio).
 */
import { ProductService } from "@/services/product.service"
import { InventoryService } from "@/services/inventory.service"
import type { AgentTool, ToolExecutionContext, ToolResponse } from "../types"
import { buildServiceContext } from "../context"
import { toolOk } from "../response"
import type { ToolDeps } from "../deps"

export function createInventoryTools(deps: ToolDeps = {}): AgentTool[] {
  const productService = deps.productService ?? new ProductService()
  const inventoryService = deps.inventoryService ?? new InventoryService()

  const getProducts: AgentTool = {
    name: "inventory.getProducts",
    domain: "inventory",
    description:
      "Lista los productos del negocio. Opcionalmente filtra por término de búsqueda, categoría o paginación. Para stock bajo usa inventory.getLowStock.",
    requiredPermissions: ["inventory.read"],
    inputSchema: {
      type: "object",
      properties: {
        q: { type: "string", description: "Término de búsqueda (nombre o SKU)", required: false },
        category: { type: "string", description: "ID de la categoría", required: false },
        skip: { type: "number", description: "Saltar N productos (paginación)", required: false },
        take: { type: "number", description: "Cantidad máxima (máx 100)", required: false },
      },
    },
    async execute(ctx: ToolExecutionContext, input: Record<string, unknown>): Promise<ToolResponse> {
      const products = await productService.list(buildServiceContext(ctx), {
        q: typeof input.q === "string" ? input.q : undefined,
        category: typeof input.category === "string" ? input.category : undefined,
        skip: typeof input.skip === "number" ? input.skip : undefined,
        take: Math.min(typeof input.take === "number" ? input.take : 50, 100),
      })
      return toolOk(products)
    },
  }

  const getLowStock: AgentTool = {
    name: "inventory.getLowStock",
    domain: "inventory",
    description: "Productos con stock bajo (por defecto ≤ 5 unidades).",
    requiredPermissions: ["inventory.read"],
    inputSchema: {
      type: "object",
      properties: {
        threshold: { type: "number", description: "Umbral de stock (por defecto 5)", required: false },
        take: { type: "number", description: "Cantidad máxima de resultados", required: false },
      },
    },
    async execute(ctx: ToolExecutionContext, input: Record<string, unknown>): Promise<ToolResponse> {
      const threshold = typeof input.threshold === "number" ? input.threshold : 5
      const take = typeof input.take === "number" ? Math.min(input.take, 100) : 50
      const lowStock = await inventoryService.lowStock(buildServiceContext(ctx), threshold, take)
      return toolOk(lowStock)
    },
  }

  const getStock: AgentTool = {
    name: "inventory.getStock",
    domain: "inventory",
    description: "Stock actual de un producto por su ID o SKU.",
    requiredPermissions: ["inventory.read"],
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "ID o SKU del producto", required: true },
      },
    },
    async execute(ctx: ToolExecutionContext, input: Record<string, unknown>): Promise<ToolResponse> {
      const stock = await inventoryService.getStock(buildServiceContext(ctx), input.id as string)
      return toolOk(stock)
    },
  }

  const searchProduct: AgentTool = {
    name: "inventory.searchProduct",
    domain: "inventory",
    description: "Busca productos del negocio por término (nombre o SKU).",
    requiredPermissions: ["inventory.read"],
    inputSchema: {
      type: "object",
      properties: {
        q: { type: "string", description: "Término de búsqueda", required: true },
        take: { type: "number", description: "Cantidad máxima de resultados", required: false },
      },
    },
    async execute(ctx: ToolExecutionContext, input: Record<string, unknown>): Promise<ToolResponse> {
      const take = typeof input.take === "number" ? Math.min(input.take, 50) : 20
      const products = await productService.list(buildServiceContext(ctx), {
        q: input.q as string,
        take,
      })
      return toolOk(products)
    },
  }

  const updateStock: AgentTool = {
    name: "inventory.updateStock",
    domain: "inventory",
    description:
      "Actualiza el stock de un producto: increase (entrada), decrease (salida) o adjustment (fijar valor). Registra el movimiento.",
    requiredPermissions: ["inventory.update"],
    inputSchema: {
      type: "object",
      properties: {
        productId: { type: "string", description: "ID del producto", required: true },
        type: { type: "string", description: "increase | decrease | adjustment", required: true },
        quantity: { type: "number", description: "Cantidad (para increase/decrease)", required: true },
        concept: { type: "string", description: "Motivo del movimiento", required: false },
        reference: { type: "string", description: "Referencia externa", required: false },
      },
    },
    async execute(ctx: ToolExecutionContext, input: Record<string, unknown>): Promise<ToolResponse> {
      const movement = await inventoryService.applyMovement(buildServiceContext(ctx), {
        productId: input.productId,
        type: input.type,
        quantity: input.quantity,
        concept: typeof input.concept === "string" ? input.concept : undefined,
        reference: typeof input.reference === "string" ? input.reference : undefined,
      })
      return toolOk(movement)
    },
  }

  return [getProducts, getLowStock, getStock, searchProduct, updateStock]
}
