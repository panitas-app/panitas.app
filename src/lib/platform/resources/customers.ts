/**
 * Platform (FASE 8D) — recurso customers.
 */
import type { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { CustomerService } from "@/services/customer.service"
import { ApiError } from "@/lib/platform/errors"
import { paginate, parseLimit, parseSort } from "@/lib/platform/public-api/pagination"
import { ok, created, failFromError } from "@/lib/platform/public-api/response"
import type { PublicApiContext } from "@/lib/platform/public-api/context"
import { parseJsonBody, parseBooleanParam, safeId, serviceCtx } from "./helpers"

const customerService = new CustomerService()

const CUSTOMER_SORT_WHITELIST = ["createdAt", "updatedAt", "name", "totalSpent"] as const

const CUSTOMER_SELECT = {
  id: true,
  name: true,
  phone: true,
  email: true,
  documentId: true,
  address: true,
  city: true,
  state: true,
  isActive: true,
  totalSpent: true,
  totalOrders: true,
  lastPurchaseAt: true,
  createdAt: true,
  updatedAt: true,
} as const

export async function listCustomers(ctx: PublicApiContext, request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const limit = parseLimit(searchParams.get("limit"))
  const sort = parseSort(searchParams.get("sort"), CUSTOMER_SORT_WHITELIST)
  const search = (searchParams.get("search") ?? "").slice(0, 100)
  const isActive = parseBooleanParam(searchParams.get("isActive"))

  const { items, pagination } = await paginate({ limit, cursor: searchParams.get("cursor") }, ({ skip, take }) => {
    return prisma.customer.findMany({
      where: {
        storeId: ctx.storeId,
        ...(isActive !== undefined ? { isActive } : {}),
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: "insensitive" } },
                { phone: { contains: search } },
                { email: { contains: search, mode: "insensitive" } },
                { documentId: { contains: search } },
              ],
            }
          : {}),
      },
      select: CUSTOMER_SELECT,
      orderBy: sort ? { [sort.field]: sort.direction } : { createdAt: "desc" },
      skip,
      take,
    })
  })

  return ok(items, { pagination, requestId: ctx.requestId })
}

export async function getCustomer(ctx: PublicApiContext, _request: NextRequest, params: Record<string, string>) {
  const id = safeId(params.id)
  const customer = await prisma.customer.findFirst({
    where: { id, storeId: ctx.storeId },
    select: CUSTOMER_SELECT,
  })
  if (!customer) throw new ApiError("RESOURCE_NOT_FOUND", "Cliente no encontrado", 404)
  return ok(customer, { requestId: ctx.requestId })
}

export async function createCustomer(ctx: PublicApiContext, request: NextRequest) {
  const body = await parseJsonBody<{
    phone?: unknown
    name?: unknown
    documentId?: unknown
    email?: unknown
    address?: unknown
    city?: unknown
    state?: unknown
  }>(request)

  const phone = typeof body.phone === "string" ? body.phone.trim() : ""
  if (!phone) throw new ApiError("INVALID_REQUEST", "El teléfono es obligatorio", 422)

  try {
    const customer = await customerService.findOrCreateByPhone(serviceCtx(ctx), {
      phone,
      name: typeof body.name === "string" ? body.name : null,
      documentId: typeof body.documentId === "string" ? body.documentId : null,
      email: typeof body.email === "string" ? body.email : null,
      address: typeof body.address === "string" ? body.address : null,
      city: typeof body.city === "string" ? body.city : null,
      state: typeof body.state === "string" ? body.state : null,
    })
    return created(customer, { requestId: ctx.requestId })
  } catch (error) {
    return failFromError(error, ctx.requestId)
  }
}
