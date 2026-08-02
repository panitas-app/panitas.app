import { ProductService } from "@/services/product.service"
import { InventoryService } from "@/services/inventory.service"
import type { AgentTool, AgentContext } from "@/lib/agent/types"
import type { StoreServiceContext } from "@/services/context"

const productService = new ProductService()
const inventoryService = new InventoryService()

function serviceCtx(ctx: AgentContext): StoreServiceContext {
  return { userId: ctx.userId, storeId: ctx.storeId, plan: ctx.plan }
}

export const inventoryTools: AgentTool[] = [
  {
    name: "inventory.check_stock",
    description: "Consulta el stock y existencia de productos por nombre, SKU o palabra clave",
    permissions: ["inventory.read"],
    input_schema: {
      type: "object",
      properties: {
        q: { type: "string", description: "Término de búsqueda: nombre, SKU o palabra clave" },
      },
    },
    async execute(ctx, input) {
      const q = typeof input.q === "string" ? input.q : ""
      const { products, total } = await productService.list(serviceCtx(ctx), { q, skip: 0, take: 10 })
      return {
        ok: true,
        data: {
          total,
          products: products.map((p) => ({ id: p.id, name: p.name, sku: p.sku, stock: p.stock })),
        },
      }
    },
  },
  {
    name: "inventory.adjust_stock",
    description: "Ajusta el stock de un producto (increase, decrease, adjustment)",
    permissions: ["inventory.update"],
    input_schema: {
      type: "object",
      properties: {
        productId: { type: "string", description: "ID del producto" },
        type: { type: "string", description: "increase | decrease | adjustment" },
        quantity: { type: "number", description: "Cantidad (positiva)" },
      },
      required: ["productId", "type", "quantity"],
    },
    async execute(ctx, input) {
      const productId = typeof input.productId === "string" ? input.productId : ""
      const type = typeof input.type === "string" ? input.type : ""
      const quantity =
        typeof input.quantity === "number"
          ? input.quantity
          : typeof input.quantity === "string"
            ? parseInt(input.quantity, 10)
            : 0
      if (!productId || !type || !quantity) {
        return { ok: false, error: "Se requieren productId, type y quantity" }
      }
      const movement = await inventoryService.applyMovement(serviceCtx(ctx), { productId, type, quantity })
      return { ok: true, data: { movementId: movement.id, balance: movement.balance } }
    },
  },
  {
    name: "inventory.movements",
    description: "Lista movimientos de inventario con filtros opcionales (productId, type, from, to)",
    permissions: ["inventory.read"],
    input_schema: {
      type: "object",
      properties: {
        productId: { type: "string", description: "ID del producto" },
        type: { type: "string", description: "increase | decrease | adjustment" },
        from: { type: "string", description: "Fecha inicial (YYYY-MM-DD)" },
        to: { type: "string", description: "Fecha final (YYYY-MM-DD)" },
      },
    },
    async execute(ctx, input) {
      const { movements } = await inventoryService.list(serviceCtx(ctx), {
        productId: typeof input.productId === "string" ? input.productId : null,
        type: typeof input.type === "string" ? input.type : null,
        from: typeof input.from === "string" ? input.from : null,
        to: typeof input.to === "string" ? input.to : null,
        skip: 0,
        take: 20,
      })
      return { ok: true, data: movements.map((m) => ({ id: m.id, type: m.type, quantity: m.quantity, balance: m.balance, createdAt: m.createdAt })) }
    },
  },
]
