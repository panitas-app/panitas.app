/**
 * Platform (FASE 8D) — recurso orders.
 * GET: scoped por storeId. POST: OrderService.create (idempotente vía Idempotency-Key).
 */
import type { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { OrderService } from "@/services/order.service"
import { ApiError } from "@/lib/platform/errors"
import { paginate, parseLimit, parseSort } from "@/lib/platform/public-api/pagination"
import { ok, created, failFromError } from "@/lib/platform/public-api/response"
import type { PublicApiContext } from "@/lib/platform/public-api/context"
import { parseJsonBody, safeId, serviceCtx } from "./helpers"

const orderService = new OrderService()

const ORDER_SORT_WHITELIST = ["createdAt", "updatedAt", "total", "status"] as const

const ORDER_STATUSES = ["pending", "confirmed", "preparing", "shipped", "delivered", "cancelled"]
const PAYMENT_STATUSES = ["pending", "paid", "failed", "refunded"]

const ORDER_SELECT = {
  id: true,
  orderNumber: true,
  status: true,
  paymentStatus: true,
  subtotal: true,
  discount: true,
  shippingCost: true,
  total: true,
  currency: true,
  customerName: true,
  customerPhone: true,
  customerEmail: true,
  customerId: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
} as const

export async function listOrders(ctx: PublicApiContext, request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const limit = parseLimit(searchParams.get("limit"))
  const sort = parseSort(searchParams.get("sort"), ORDER_SORT_WHITELIST)
  const status = searchParams.get("status")
  const paymentStatus = searchParams.get("paymentStatus")
  const search = (searchParams.get("search") ?? "").slice(0, 100)

  if (status && !ORDER_STATUSES.includes(status)) {
    throw new ApiError("INVALID_REQUEST", `status inválido. Permitidos: ${ORDER_STATUSES.join(", ")}`, 422)
  }
  if (paymentStatus && !PAYMENT_STATUSES.includes(paymentStatus)) {
    throw new ApiError("INVALID_REQUEST", `paymentStatus inválido. Permitidos: ${PAYMENT_STATUSES.join(", ")}`, 422)
  }

  const { items, pagination } = await paginate({ limit, cursor: searchParams.get("cursor") }, ({ skip, take }) => {
    return prisma.order.findMany({
      where: {
        storeId: ctx.storeId,
        ...(status ? { status } : {}),
        ...(paymentStatus ? { paymentStatus } : {}),
        ...(search
          ? {
              OR: [
                { orderNumber: { contains: search, mode: "insensitive" } },
                { customerName: { contains: search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      select: ORDER_SELECT,
      orderBy: sort ? { [sort.field]: sort.direction } : { createdAt: "desc" },
      skip,
      take,
    })
  })

  return ok(items, { pagination, requestId: ctx.requestId })
}

export async function getOrder(ctx: PublicApiContext, _request: NextRequest, params: Record<string, string>) {
  const id = safeId(params.id)
  const order = await prisma.order.findFirst({
    where: { id, storeId: ctx.storeId },
    include: {
      items: {
        select: { id: true, productId: true, productName: true, quantity: true, price: true, subtotal: true },
      },
    },
  })
  if (!order) throw new ApiError("RESOURCE_NOT_FOUND", "Pedido no encontrado", 404)
  return ok(order, { requestId: ctx.requestId })
}

export async function createOrder(ctx: PublicApiContext, request: NextRequest) {
  const body = await parseJsonBody(request)
  try {
    const order = await orderService.create(serviceCtx(ctx), body)
    return created(order, { requestId: ctx.requestId })
  } catch (error) {
    return failFromError(error, ctx.requestId)
  }
}
