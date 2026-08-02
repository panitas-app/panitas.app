import { Prisma } from "@prisma/client"
import { PLAN_LIMITS, resolvePlanLimitKey } from "@/lib/constants"
import { createAuditEntry } from "@/lib/audit"
import { eventService } from "@/events/event.service"
import {
  safeStr,
  requireStr,
  safeFloat,
  safeInt,
  safeBool,
  safeImages,
  safeStringArray,
  LIMITS,
} from "@/lib/validate"
import { ProductRepository } from "@/repositories/product.repository"
import { serviceError } from "@/services/errors"
import type { StoreServiceContext } from "@/services/context"

export function generateSku(name: string): string {
  const prefix = name
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9]/g, "")
    .substring(0, 4)
  const random = Math.floor(1000 + Math.random() * 9000)
  return prefix ? `${prefix}-${random}` : `PROD-${random}`
}

export type ProductListOptions = {
  q?: string
  category?: string
  skip?: number
  take?: number
}

export class ProductService {
  constructor(private readonly repo = new ProductRepository()) {}

  list(ctx: StoreServiceContext, options: ProductListOptions) {
    return this.repo.list({ storeId: ctx.storeId, ...options })
  }

  async getById(ctx: StoreServiceContext, id: string) {
    const product = await this.repo.findByIdWithCategory(id)
    if (!product) throw serviceError("Not found", 404)
    if (product.storeId !== ctx.storeId) throw serviceError("Unauthorized", 403)
    return product
  }

  async create(ctx: StoreServiceContext, body: Record<string, unknown>) {
    const storePlan = resolvePlanLimitKey(ctx.plan || "free")
    const limit = PLAN_LIMITS[storePlan]?.products ?? 30

    if (limit !== -1) {
      const existingCount = await this.repo.countByStore(ctx.storeId)
      if (existingCount >= limit) {
        throw serviceError(
          `Has alcanzado el límite de ${limit} productos para tu plan actual (${storePlan.toUpperCase()}). Por favor, actualiza tu plan en Configuración.`,
          403
        )
      }
    }

    const name = requireStr(body.name, LIMITS.MAX_NAME, 1)
    if (!name) throw serviceError("Nombre inválido o demasiado largo", 400)

    const price = safeFloat(body.price, LIMITS.MAX_PRICE, 0)
    if (price === null) throw serviceError("Precio inválido", 400)

    const description = body.description !== undefined ? safeStr(body.description, LIMITS.MAX_DESCRIPTION) : null
    if (body.description !== undefined && description === null) throw serviceError("Descripción inválida", 400)

    const costPrice = body.costPrice !== undefined ? safeFloat(body.costPrice, LIMITS.MAX_PRICE) : null
    if (body.costPrice !== undefined && costPrice === null) throw serviceError("Costo inválido", 400)

    const stock = body.stock !== undefined ? safeInt(body.stock, LIMITS.MAX_STOCK) : 0
    if (body.stock !== undefined && stock === null) throw serviceError("Stock inválido", 400)

    const images = body.images !== undefined ? safeImages(body.images) : []
    if (body.images !== undefined && images === null) throw serviceError("Imágenes inválidas", 400)

    const skuInput = typeof body.sku === "string" ? body.sku.trim().toUpperCase().slice(0, 32) : ""
    const finalSku = skuInput || generateSku(name)

    const barcode = typeof body.barcode === "string" ? body.barcode.trim().slice(0, 32) : null

    const isWholesale = safeBool(body.isWholesale)
    const wholesaleLabel =
      isWholesale && typeof body.wholesaleLabel === "string" ? body.wholesaleLabel.slice(0, 100) : null
    const wholesalePrice =
      isWholesale && body.wholesalePrice !== undefined ? safeFloat(body.wholesalePrice, LIMITS.MAX_PRICE) : null
    const wholesaleScales =
      isWholesale && body.wholesaleScales !== undefined
        ? (() => {
            const raw = body.wholesaleScales
            if (typeof raw === "string") {
              try {
                return JSON.parse(raw)
              } catch {
                return null
              }
            }
            if (!Array.isArray(raw) || raw.length > LIMITS.MAX_WHOLESCALE) return null
            for (const item of raw) {
              if (typeof item !== "object" || item === null) return null
              if (typeof item.quantity !== "number" || typeof item.price !== "number") return null
              if (item.quantity < 0 || item.price < 0) return null
            }
            return raw
          })()
        : null
    if (isWholesale && body.wholesaleScales !== undefined && wholesaleScales === null) {
      throw serviceError("Escalas mayoristas inválidas", 400)
    }

    const hasSizes = safeBool(body.hasSizes)
    const sizes =
      hasSizes && body.sizes !== undefined
        ? (() => {
            if (typeof body.sizes === "string") {
              try {
                return JSON.parse(body.sizes)
              } catch {
                return null
              }
            }
            if (!Array.isArray(body.sizes) || body.sizes.length > LIMITS.MAX_SIZES) return null
            for (const item of body.sizes) {
              if (typeof item !== "object" || item === null) return null
              if (typeof item.size !== "string" || !item.size.trim()) return null
              if (item.stock !== null && typeof item.stock !== "number") return null
            }
            return body.sizes
          })()
        : null
    if (hasSizes && body.sizes !== undefined && sizes === null) {
      throw serviceError("Talles inválidos", 400)
    }

    const unidadBase = safeStr(body.unidadBase, 50) || "Unidad"

    const productType = body.productType === "digital" ? "digital" : "physical"
    let digitalProductData: Prisma.DigitalProductUncheckedCreateWithoutProductInput | undefined
    if (productType === "digital" && body.digitalProduct) {
      const dp = body.digitalProduct as Record<string, unknown>
      if (typeof dp.fileUrl !== "string" || !dp.fileUrl.trim()) {
        throw serviceError("La URL del archivo digital es requerida", 400)
      }
      digitalProductData = {
        fileUrl: dp.fileUrl.slice(0, 2048),
        fileType: typeof dp.fileType === "string" ? dp.fileType.slice(0, 20) : null,
        downloadLimit: typeof dp.downloadLimit === "number" ? Math.max(0, dp.downloadLimit) : 5,
        expirationDays: typeof dp.expirationDays === "number" ? Math.max(0, dp.expirationDays) : 30,
        instructions: typeof dp.instructions === "string" ? dp.instructions.slice(0, 2000) : null,
        purchaseMessage: typeof dp.purchaseMessage === "string" ? dp.purchaseMessage.slice(0, 2000) : null,
      }
    }

    const product = await this.repo.create({
      name,
      description: description || null,
      price: price!,
      costPrice,
      sku: finalSku,
      barcode,
      stock: productType === "digital" ? 999999 : stock ?? 0,
      unidadBase,
      productType,
      images: JSON.stringify(images || []),
      isActive: body.isActive !== false,
      categoryId: typeof body.categoryId === "string" ? body.categoryId.slice(0, 64) : null,
      isWholesale: productType === "physical" ? isWholesale : false,
      wholesaleLabel: productType === "physical" ? wholesaleLabel : null,
      wholesalePrice: productType === "physical" ? wholesalePrice : null,
      wholesaleScales: productType === "physical" && wholesaleScales ? JSON.stringify(wholesaleScales) : null,
      hasSizes: productType === "physical" ? hasSizes : false,
      sizes: productType === "physical" && sizes ? JSON.stringify(sizes) : null,
      storeId: ctx.storeId,
      ...(digitalProductData ? { digitalProduct: { create: digitalProductData } } : {}),
    })

    const productWithCategory = await this.repo.findByIdWithCategory(product.id)

    await createAuditEntry({
      action: "product.created",
      entity: "Product",
      entityId: product.id,
      storeId: ctx.storeId,
      userId: ctx.userId,
    })

    eventService.emit("product.created", {
      productId: product.id,
      storeId: ctx.storeId,
      name: productWithCategory?.name ?? name,
      sku: productWithCategory?.sku ?? finalSku,
    })

    return productWithCategory
  }

  async update(ctx: StoreServiceContext, id: string, body: Record<string, unknown>) {
    const product = await this.repo.findById(id)
    if (!product) throw serviceError("Not found", 404)
    if (product.storeId !== ctx.storeId) throw serviceError("Unauthorized", 403)

    const data: Record<string, unknown> = {}

    if (body.name !== undefined) {
      const name = requireStr(body.name, LIMITS.MAX_NAME, 1)
      if (!name) throw serviceError("Nombre inválido", 400)
      data.name = name
    }

    if (body.description !== undefined) {
      const desc = safeStr(body.description, LIMITS.MAX_DESCRIPTION)
      if (desc === null) throw serviceError("Descripción inválida", 400)
      data.description = desc || null
    }

    if (body.price !== undefined) {
      const price = safeFloat(body.price, LIMITS.MAX_PRICE, 0)
      if (price === null) throw serviceError("Precio inválido", 400)
      data.price = price
    }

    if (body.costPrice !== undefined) {
      const cp = body.costPrice === null ? null : safeFloat(body.costPrice, LIMITS.MAX_PRICE)
      if (body.costPrice !== null && cp === null) throw serviceError("Costo inválido", 400)
      data.costPrice = cp
    }

    if (body.stock !== undefined) {
      const stock = safeInt(body.stock, LIMITS.MAX_STOCK)
      if (stock === null) throw serviceError("Stock inválido", 400)
      data.stock = stock
    }

    if (body.sku !== undefined) {
      if (typeof body.sku !== "string") throw serviceError("SKU inválido", 400)
      const sku = body.sku.trim().toUpperCase().slice(0, 32)
      data.sku = sku || generateSku((data.name as string) || product.name)
    }

    if (body.barcode !== undefined) {
      if (body.barcode !== null && typeof body.barcode !== "string") throw serviceError("Código de barras inválido", 400)
      data.barcode = body.barcode ? (body.barcode as string).trim().slice(0, 32) : null
    }

    if (body.images !== undefined) {
      const imgs = safeImages(body.images)
      if (imgs === null) throw serviceError("Imágenes inválidas", 400)
      data.images = JSON.stringify(imgs)
    }

    if (body.unidadBase !== undefined) {
      data.unidadBase = safeStr(body.unidadBase, 50) || "Unidad"
    }
    if (body.isActive !== undefined) data.isActive = safeBool(body.isActive)
    if (body.categoryId !== undefined) {
      data.categoryId = typeof body.categoryId === "string" ? (body.categoryId as string).slice(0, 64) : null
    }

    if (body.productType !== undefined) {
      data.productType = body.productType === "digital" ? "digital" : "physical"
      if (data.productType === "digital") {
        data.stock = 999999
        data.isWholesale = false
        data.hasSizes = false
        data.sizes = null
        data.wholesaleLabel = null
        data.wholesalePrice = null
        data.wholesaleScales = null
      }
    }

    if (body.digitalProduct !== undefined && data.productType === "digital") {
      const dp = body.digitalProduct as Record<string, unknown> | null
      if (dp === null) {
        await this.repo.deleteDigitalProduct(id)
      } else if (dp && typeof dp === "object") {
        if (typeof dp.fileUrl !== "string" || !dp.fileUrl.trim()) {
          throw serviceError("La URL del archivo digital es requerida", 400)
        }
        await this.repo.upsertDigitalProduct(id, {
          fileUrl: dp.fileUrl.slice(0, 2048),
          fileType: typeof dp.fileType === "string" ? (dp.fileType as string).slice(0, 20) : null,
          downloadLimit: typeof dp.downloadLimit === "number" ? Math.max(0, dp.downloadLimit) : 5,
          expirationDays: typeof dp.expirationDays === "number" ? Math.max(0, dp.expirationDays) : 30,
          instructions: typeof dp.instructions === "string" ? (dp.instructions as string).slice(0, 2000) : null,
          purchaseMessage: typeof dp.purchaseMessage === "string" ? (dp.purchaseMessage as string).slice(0, 2000) : null,
        })
      }
    }

    if (body.isWholesale !== undefined) data.isWholesale = safeBool(body.isWholesale)
    if (body.wholesaleLabel !== undefined) {
      data.wholesaleLabel = typeof body.wholesaleLabel === "string" ? (body.wholesaleLabel as string).slice(0, 100) : null
    }
    if (body.wholesalePrice !== undefined) {
      const wp = body.wholesalePrice === null ? null : safeFloat(body.wholesalePrice, LIMITS.MAX_PRICE)
      if (body.wholesalePrice !== null && wp === null) throw serviceError("Precio mayorista inválido", 400)
      data.wholesalePrice = wp
    }
    if (body.wholesaleScales !== undefined) {
      let scales: string[] | null = null
      if (body.wholesaleScales !== null) {
        let arr: unknown = body.wholesaleScales
        if (typeof arr === "string") {
          try {
            arr = JSON.parse(arr)
          } catch {
            throw serviceError("Escalas mayoristas inválidas", 400)
          }
        }
        scales = safeStringArray(arr, LIMITS.MAX_WHOLESCALE)
        if (scales === null) throw serviceError("Escalas mayoristas inválidas", 400)
      }
      data.wholesaleScales = scales ? JSON.stringify(scales) : null
    }
    if (body.hasSizes !== undefined) data.hasSizes = safeBool(body.hasSizes)
    if (body.sizes !== undefined) {
      let sizes: string[] | null = null
      if (body.sizes !== null) {
        let arr: unknown = body.sizes
        if (typeof arr === "string") {
          try {
            arr = JSON.parse(arr)
          } catch {
            throw serviceError("Talles inválidos", 400)
          }
        }
        sizes = safeStringArray(arr, LIMITS.MAX_SIZES)
        if (sizes === null) throw serviceError("Talles inválidos", 400)
      }
      data.sizes = sizes ? JSON.stringify(sizes) : null
    }

    // NOTE: update + include triggers interactive transactions in Neon HTTP — do them separately
    await this.repo.update(id, data)
    const updated = await this.repo.findByIdWithCategory(id)

    await createAuditEntry({
      action: "product.updated",
      entity: "Product",
      entityId: id,
      storeId: ctx.storeId,
      userId: ctx.userId,
    })

    eventService.emit("product.updated", {
      productId: id,
      storeId: ctx.storeId,
      name: updated?.name ?? product.name,
      sku: updated?.sku ?? product.sku ?? "",
    })

    return updated
  }

  async remove(ctx: StoreServiceContext, id: string) {
    const product = await this.repo.findById(id)
    if (!product) throw serviceError("Not found", 404)
    if (product.storeId !== ctx.storeId) throw serviceError("Unauthorized", 403)

    await this.repo.delete(id)

    await createAuditEntry({
      action: "product.deleted",
      entity: "Product",
      entityId: id,
      storeId: ctx.storeId,
      userId: ctx.userId,
    })

    return { success: true }
  }
}
