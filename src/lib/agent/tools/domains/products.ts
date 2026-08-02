/**
 * Tools de productos (FASE 3B).
 *
 * CRUD de productos a través de `ProductService`. Nunca toca Prisma.
 * El `storeId` proviene del contexto autenticado (aislamiento de negocio).
 */
import { ProductService } from "@/services/product.service"
import type { AgentTool, ToolExecutionContext, ToolResponse } from "../types"
import { buildServiceContext } from "../context"
import { toolOk } from "../response"
import type { ToolDeps } from "../deps"

export function createProductTools(deps: ToolDeps = {}): AgentTool[] {
  const productService = deps.productService ?? new ProductService()

  const get: AgentTool = {
    name: "products.get",
    domain: "products",
    description: "Detalle completo de un producto del negocio por su ID.",
    requiredPermissions: ["product.read"],
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "ID del producto", required: true },
      },
    },
    async execute(ctx: ToolExecutionContext, input: Record<string, unknown>): Promise<ToolResponse> {
      const product = await productService.getById(buildServiceContext(ctx), input.id as string)
      return toolOk(product)
    },
  }

  const create: AgentTool = {
    name: "products.create",
    domain: "products",
    description: "Crea un producto en el negocio. Se validan límites de plan y datos en el servidor.",
    requiredPermissions: ["product.create"],
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Nombre del producto", required: true },
        price: { type: "number", description: "Precio de venta", required: true },
        description: { type: "string", description: "Descripción", required: false },
        stock: { type: "number", description: "Stock inicial (por defecto 0)", required: false },
        sku: { type: "string", description: "SKU (si no se envía, se genera)", required: false },
        categoryId: { type: "string", description: "ID de categoría", required: false },
        costPrice: { type: "number", description: "Costo", required: false },
        isActive: { type: "boolean", description: "Activo (por defecto true)", required: false },
      },
    },
    async execute(ctx: ToolExecutionContext, input: Record<string, unknown>): Promise<ToolResponse> {
      const product = await productService.create(buildServiceContext(ctx), input)
      return toolOk(product)
    },
  }

  const update: AgentTool = {
    name: "products.update",
    domain: "products",
    description: "Actualiza campos de un producto existente del negocio.",
    requiredPermissions: ["product.update"],
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "ID del producto", required: true },
        name: { type: "string", description: "Nuevo nombre", required: false },
        price: { type: "number", description: "Nuevo precio", required: false },
        description: { type: "string", description: "Nueva descripción", required: false },
        stock: { type: "number", description: "Nuevo stock", required: false },
        sku: { type: "string", description: "Nuevo SKU", required: false },
        isActive: { type: "boolean", description: "Activo/inactivo", required: false },
      },
    },
    async execute(ctx: ToolExecutionContext, input: Record<string, unknown>): Promise<ToolResponse> {
      const { id, ...body } = input
      const product = await productService.update(buildServiceContext(ctx), id as string, body)
      return toolOk(product)
    },
  }

  const remove: AgentTool = {
    name: "products.delete",
    domain: "products",
    description: "Elimina un producto del negocio. Acción destructiva.",
    requiredPermissions: ["product.delete"],
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "ID del producto", required: true },
      },
    },
    async execute(ctx: ToolExecutionContext, input: Record<string, unknown>): Promise<ToolResponse> {
      const result = await productService.remove(buildServiceContext(ctx), input.id as string)
      return toolOk(result)
    },
  }

  return [get, create, update, remove]
}
