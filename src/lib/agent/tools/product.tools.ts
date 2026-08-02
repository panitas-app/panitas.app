import { ProductService } from "@/services/product.service"
import type { AgentTool, AgentContext } from "@/lib/agent/types"
import type { StoreServiceContext } from "@/services/context"

const productService = new ProductService()

function serviceCtx(ctx: AgentContext): StoreServiceContext {
  return { userId: ctx.userId, storeId: ctx.storeId, plan: ctx.plan }
}

export const productTools: AgentTool[] = [
  {
    name: "product.list",
    description: "Lista productos del catálogo con búsqueda opcional por nombre o categoría",
    permissions: ["product.read"],
    input_schema: {
      type: "object",
      properties: {
        q: { type: "string", description: "Término de búsqueda" },
        category: { type: "string", description: "ID de categoría" },
      },
    },
    async execute(ctx, input) {
      const { products, total } = await productService.list(serviceCtx(ctx), {
        q: typeof input.q === "string" ? input.q : "",
        category: typeof input.category === "string" ? input.category : "",
        skip: 0,
        take: 20,
      })
      return {
        ok: true,
        data: {
          total,
          products: products.map((p) => ({
            id: p.id,
            name: p.name,
            sku: p.sku,
            price: p.price,
            stock: p.stock,
            isActive: p.isActive,
          })),
        },
      }
    },
  },
  {
    name: "product.get",
    description: "Obtiene el detalle de un producto por ID",
    permissions: ["product.read"],
    input_schema: {
      type: "object",
      properties: {
        productId: { type: "string", description: "ID del producto" },
      },
      required: ["productId"],
    },
    async execute(ctx, input) {
      const productId = typeof input.productId === "string" ? input.productId : ""
      if (!productId) return { ok: false, error: "Se requiere productId" }
      const product = await productService.getById(serviceCtx(ctx), productId)
      return {
        ok: true,
        data: {
          id: product.id,
          name: product.name,
          sku: product.sku,
          description: product.description,
          price: product.price,
          costPrice: product.costPrice,
          stock: product.stock,
          productType: product.productType,
          isActive: product.isActive,
        },
      }
    },
  },
  {
    name: "product.create",
    description: "Crea un producto en el catálogo (nombre, precio y stock requeridos)",
    permissions: ["product.create"],
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Nombre del producto" },
        price: { type: "number", description: "Precio de venta" },
        stock: { type: "number", description: "Stock inicial" },
        description: { type: "string", description: "Descripción" },
        sku: { type: "string", description: "SKU opcional" },
        categoryId: { type: "string", description: "ID de categoría" },
      },
      required: ["name", "price"],
    },
    async execute(ctx, input) {
      const product = await productService.create(serviceCtx(ctx), input)
      if (!product) return { ok: false, error: "No se pudo crear el producto" }
      return {
        ok: true,
        data: { id: product.id, name: product.name, sku: product.sku, stock: product.stock },
      }
    },
  },
  {
    name: "product.update",
    description: "Actualiza campos de un producto existente (name, price, stock, etc.)",
    permissions: ["product.update"],
    input_schema: {
      type: "object",
      properties: {
        productId: { type: "string", description: "ID del producto" },
        name: { type: "string", description: "Nuevo nombre" },
        price: { type: "number", description: "Nuevo precio" },
        stock: { type: "number", description: "Nuevo stock" },
        isActive: { type: "boolean", description: "Activo o no" },
      },
      required: ["productId"],
    },
    async execute(ctx, input) {
      const productId = typeof input.productId === "string" ? input.productId : ""
      if (!productId) return { ok: false, error: "Se requiere productId" }
      const fields: Record<string, unknown> = { ...input }
      delete fields.productId
      const product = await productService.update(serviceCtx(ctx), productId, fields)
      if (!product) return { ok: false, error: "No se pudo actualizar el producto" }
      return {
        ok: true,
        data: { id: product.id, name: product.name, sku: product.sku, stock: product.stock },
      }
    },
  },
  {
    name: "product.delete",
    description: "Elimina un producto del catálogo",
    permissions: ["product.delete"],
    input_schema: {
      type: "object",
      properties: {
        productId: { type: "string", description: "ID del producto" },
      },
      required: ["productId"],
    },
    async execute(ctx, input) {
      const productId = typeof input.productId === "string" ? input.productId : ""
      if (!productId) return { ok: false, error: "Se requiere productId" }
      await productService.remove(serviceCtx(ctx), productId)
      return { ok: true, data: { deleted: true, productId } }
    },
  },
]
