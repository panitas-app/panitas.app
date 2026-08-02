import { createAuditEntry } from "@/lib/audit"
import { safeStr, safeInt } from "@/lib/validate"
import { InventoryRepository } from "@/repositories/inventory.repository"
import { serviceError } from "@/services/errors"
import type { StoreServiceContext } from "@/services/context"

export type StockMovementListOptions = {
  productId?: string | null
  type?: string | null
  from?: string | null
  to?: string | null
  skip?: number
  take?: number
}

export class InventoryService {
  constructor(private readonly repo = new InventoryRepository()) {}

  list(ctx: StoreServiceContext, options: StockMovementListOptions) {
    return this.repo.listMovements({
      storeId: ctx.storeId,
      productId: options.productId || undefined,
      type: options.type || undefined,
      from: options.from ? new Date(options.from) : undefined,
      to: options.to ? new Date(options.to) : undefined,
      skip: options.skip,
      take: options.take,
    })
  }

  async applyMovement(ctx: StoreServiceContext, body: Record<string, unknown>) {
    const type = body.type
    if (!["increase", "decrease", "adjustment"].includes(type as string)) {
      throw serviceError("Tipo inválido", 400)
    }

    const productId = safeStr(body.productId, 64)
    if (!productId) throw serviceError("Producto requerido", 400)

    const quantity = safeInt(body.quantity, 999999, 1)
    if (!quantity) throw serviceError("Cantidad inválida", 400)

    const product = await this.repo.findProductById(productId)
    if (!product || product.storeId !== ctx.storeId) {
      throw serviceError("Producto no encontrado", 404)
    }

    let newStock: number
    if (type === "increase") {
      newStock = product.stock + quantity
    } else if (type === "decrease") {
      if (product.stock < quantity) throw serviceError("Stock insuficiente", 400)
      newStock = product.stock - quantity
    } else {
      newStock = quantity
    }

    // Sequential: create movement then update product (Neon HTTP doesn't support transactions)
    const movement = await this.repo.recordMovement({
      type: type as string,
      quantity: type === "increase" ? quantity : -quantity,
      balance: newStock,
      concept: safeStr(body.concept, 500) || null,
      reference: safeStr(body.reference, 200) || null,
      productId,
      storeId: ctx.storeId,
    })

    await this.repo.updateStock(productId, newStock, "set")

    await createAuditEntry({
      action: `stock.${type}`,
      entity: "StockMovement",
      entityId: movement.id,
      storeId: ctx.storeId,
      userId: ctx.userId,
    })

    return movement
  }
}
