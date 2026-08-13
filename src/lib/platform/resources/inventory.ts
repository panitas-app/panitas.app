/**
 * Platform (FASE 8D) — recurso inventory.
 * GET: niveles de stock. PATCH: aplicar movimiento (InventoryService.applyMovement).
 */
import type { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { InventoryService } from "@/services/inventory.service"
import { ApiError } from "@/lib/platform/errors"
import { paginate, parseLimit, parseSort } from "@/lib/platform/public-api/pagination"
import { ok, failFromError } from "@/lib/platform/public-api/response"
import type { PublicApiContext } from "@/lib/platform/public-api/context"
import { parseBooleanParam, parseFloatParam, parseJsonBody, safeId, serviceCtx } from "./helpers"

const inventoryService = new InventoryService()
const DEFAULT_LOW_STOCK_THRESHOLD = 5

const INVENTORY_SORT_WHITELIST = ["createdAt", "name", "stock"] as const

const INVENTORY_SELECT = {
  id: true,
  name: true,
  sku: true,
  barcode: true,
  stock: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const

export async function listInventory(ctx: PublicApiContext, request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const limit = parseLimit(searchParams.get("limit"))
  const sort = parseSort(searchParams.get("sort"), INVENTORY_SORT_WHITELIST)
  const isActive = parseBooleanParam(searchParams.get("isActive"))
  const lowStock = parseBooleanParam(searchParams.get("lowStock"))
  const threshold = parseFloatParam(searchParams.get("threshold"), DEFAULT_LOW_STOCK_THRESHOLD, 1_000_000)

  const { items, pagination } = await paginate({ limit, cursor: searchParams.get("cursor") }, ({ skip, take }) => {
    return prisma.product.findMany({
      where: {
        storeId: ctx.storeId,
        ...(isActive !== undefined ? { isActive } : {}),
        ...(lowStock !== undefined ? { stock: lowStock ? { lte: threshold } : { gt: threshold } } : {}),
      },
      select: INVENTORY_SELECT,
      orderBy: sort ? { [sort.field]: sort.direction } : { stock: "asc" },
      skip,
      take,
    })
  })

  return ok(items, { pagination, requestId: ctx.requestId })
}

export async function getInventoryItem(ctx: PublicApiContext, _request: NextRequest, params: Record<string, string>) {
  const id = safeId(params.id)
  const item = await prisma.product.findFirst({
    where: { id, storeId: ctx.storeId },
    select: { ...INVENTORY_SELECT, categoryId: true, description: true },
  })
  if (!item) throw new ApiError("RESOURCE_NOT_FOUND", "Producto no encontrado", 404)
  return ok(item, { requestId: ctx.requestId })
}

export async function adjustInventory(ctx: PublicApiContext, request: NextRequest, params: Record<string, string>) {
  const productId = safeId(params.id)
  const body = await parseJsonBody<{ type?: unknown; quantity?: unknown; concept?: unknown; reference?: unknown }>(request)

  const type = typeof body.type === "string" ? body.type : ""
  if (!["increase", "decrease", "adjustment"].includes(type)) {
    throw new ApiError("INVALID_REQUEST", "type debe ser increase, decrease o adjustment", 422)
  }
  if (typeof body.quantity !== "number" || !Number.isFinite(body.quantity) || body.quantity <= 0) {
    throw new ApiError("INVALID_REQUEST", "quantity debe ser un número positivo", 422)
  }

  try {
    const movement = await inventoryService.applyMovement(serviceCtx(ctx), {
      type,
      productId,
      quantity: body.quantity,
      concept: typeof body.concept === "string" ? body.concept : undefined,
      reference: typeof body.reference === "string" ? body.reference : undefined,
    })
    return ok({ movementId: movement.id, productId }, { requestId: ctx.requestId })
  } catch (error) {
    return failFromError(error, ctx.requestId)
  }
}
