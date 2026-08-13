/**
 * Platform (FASE 8D) — recurso products.
 * Reads: consulta directa scoped por storeId. Writes: ProductService (reglas de negocio).
 */
import type { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { ProductService } from "@/services/product.service"
import { ApiError } from "@/lib/platform/errors"
import { paginate, parseLimit, parseSort } from "@/lib/platform/public-api/pagination"
import { ok, created, failFromError } from "@/lib/platform/public-api/response"
import type { PublicApiContext } from "@/lib/platform/public-api/context"
import { parseJsonBody, parseBooleanParam, safeId, serviceCtx } from "./helpers"

const productService = new ProductService()

const PRODUCT_SORT_WHITELIST = ["createdAt", "updatedAt", "name", "price", "stock"] as const

const PRODUCT_SELECT = {
  id: true,
  name: true,
  description: true,
  sku: true,
  barcode: true,
  price: true,
  costPrice: true,
  stock: true,
  isActive: true,
  featured: true,
  createdAt: true,
  updatedAt: true,
} as const

export async function listProducts(ctx: PublicApiContext, request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const limit = parseLimit(searchParams.get("limit"))
  const sort = parseSort(searchParams.get("sort"), PRODUCT_SORT_WHITELIST)
  const search = (searchParams.get("search") ?? "").slice(0, 100)
  const isActive = parseBooleanParam(searchParams.get("isActive"))
  const categoryId = searchParams.get("categoryId")

  const { items, pagination } = await paginate({ limit, cursor: searchParams.get("cursor") }, ({ skip, take }) => {
    return prisma.product.findMany({
      where: {
        storeId: ctx.storeId,
        ...(isActive !== undefined ? { isActive } : {}),
        ...(search ? { name: { contains: search, mode: "insensitive" } } : {}),
        ...(categoryId ? { categoryId: safeId(categoryId) } : {}),
      },
      select: PRODUCT_SELECT,
      orderBy: sort ? { [sort.field]: sort.direction } : { createdAt: "desc" },
      skip,
      take,
    })
  })

  return ok(items, { pagination, requestId: ctx.requestId })
}

export async function getProduct(ctx: PublicApiContext, _request: NextRequest, params: Record<string, string>) {
  const id = safeId(params.id)
  const product = await prisma.product.findFirst({
    where: { id, storeId: ctx.storeId },
    select: PRODUCT_SELECT,
  })
  if (!product) throw new ApiError("RESOURCE_NOT_FOUND", "Producto no encontrado", 404)
  return ok(product, { requestId: ctx.requestId })
}

export async function createProduct(ctx: PublicApiContext, request: NextRequest) {
  const body = await parseJsonBody(request)
  try {
    const product = await productService.create(serviceCtx(ctx), body)
    return created(product, { requestId: ctx.requestId })
  } catch (error) {
    return failFromError(error, ctx.requestId)
  }
}

export async function updateProduct(ctx: PublicApiContext, request: NextRequest, params: Record<string, string>) {
  const id = safeId(params.id)
  const body = await parseJsonBody(request)
  try {
    const product = await productService.update(serviceCtx(ctx), id, body)
    if (!product) throw new ApiError("RESOURCE_NOT_FOUND", "Producto no encontrado", 404)
    return ok(product, { requestId: ctx.requestId })
  } catch (error) {
    return failFromError(error, ctx.requestId)
  }
}
