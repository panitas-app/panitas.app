import { createAuditEntry } from "@/lib/audit"
import { safeStr, safeInt } from "@/lib/validate"
import { InventoryRepository } from "@/repositories/inventory.repository"
import { eventService } from "@/events/event.service"
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

export type InventoryOverviewOptions = {
  lowStockThreshold?: number
  windowDays?: number
}

const LOW_STOCK_THRESHOLD = 5

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

    const delta = newStock - product.stock
    eventService.emit("inventory.updated", {
      productId,
      storeId: ctx.storeId,
      productName: product.name,
      stock: newStock,
      delta,
      reason: type as string,
    })

    if (newStock > 0 && newStock <= LOW_STOCK_THRESHOLD) {
      await createAuditEntry({
        action: "stock.low",
        entity: "Product",
        entityId: productId,
        metadata: { productName: product.name, remainingStock: newStock },
        storeId: ctx.storeId,
      })
      eventService.emit("inventory.low_stock", {
        productId,
        storeId: ctx.storeId,
        productName: product.name,
        remainingStock: newStock,
      })
    }

    return movement
  }

  /** Stock actual de un producto (por id o SKU). */
  async getStock(ctx: StoreServiceContext, productIdOrSku: string) {
    const product =
      (await this.repo.findProductById(productIdOrSku)) ??
      (await this.repo.findProductByStoreSku(ctx.storeId, productIdOrSku))
    if (!product || product.storeId !== ctx.storeId) {
      throw serviceError("Producto no encontrado", 404)
    }
    return {
      productId: product.id,
      name: product.name,
      sku: product.sku,
      stock: product.stock,
      costPrice: product.costPrice,
      price: product.price,
    }
  }

  /** Productos con stock bajo (umbral por defecto 5). */
  lowStock(ctx: StoreServiceContext, threshold = LOW_STOCK_THRESHOLD, take = 50) {
    return this.repo.lowStock(ctx.storeId, threshold, take)
  }

  /** Productos sin movimiento de stock en los últimos `days` días. */
  noMovement(ctx: StoreServiceContext, days = 30, take = 50) {
    return this.repo.noMovement(ctx.storeId, days, take)
  }

  /** Productos más vendidos por cantidad en un rango (con nombre y stock). */
  async bestSellers(ctx: StoreServiceContext, from?: string, to?: string, take = 10) {
    const rows = await this.repo.bestSellers(
      ctx.storeId,
      from ? new Date(from) : undefined,
      to ? new Date(to) : undefined,
      take
    )
    const productIds = rows.map((r) => r.productId)
    if (productIds.length === 0) return []
    const products = await this.repo.findProductsByIds(productIds)
    const byId = new Map(products.map((p) => [p.id, p]))
    return rows
      .map((r) => {
        const product = byId.get(r.productId)
        return {
          productId: r.productId,
          name: product?.name ?? "Producto",
          sku: product?.sku ?? null,
          quantity: r._sum.quantity ?? 0,
          stock: product?.stock ?? 0,
        }
      })
      .filter((r) => r.quantity > 0)
  }

  /** Resumen del inventario: totales, bajo stock, entradas/salidas. */
  overview(ctx: StoreServiceContext, options: InventoryOverviewOptions = {}) {
    return this.repo.overview(ctx.storeId, options.lowStockThreshold ?? LOW_STOCK_THRESHOLD, options.windowDays ?? 30)
  }
}
