/**
 * Platform (FASE 8D) — recurso suppliers.
 */
import type { NextRequest } from "next/server"
import { SupplierService } from "@/services/supplier.service"
import { ApiError } from "@/lib/platform/errors"
import { parseLimit } from "@/lib/platform/public-api/pagination"
import { ok, created, failFromError } from "@/lib/platform/public-api/response"
import type { PublicApiContext } from "@/lib/platform/public-api/context"
import { parseJsonBody, safeId, serviceCtx } from "./helpers"

const supplierService = new SupplierService()

export async function listSuppliers(ctx: PublicApiContext, request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const status = searchParams.get("status") ?? undefined
  const search = (searchParams.get("search") ?? "").slice(0, 100)
  const limit = Math.min(Math.max(parseLimit(searchParams.get("limit")), 1), 100)

  const result = await supplierService.list(serviceCtx(ctx), { status, search, limit })
  return ok(result.suppliers, { pagination: { limit }, requestId: ctx.requestId })
}

export async function getSupplier(ctx: PublicApiContext, _request: NextRequest, params: Record<string, string>) {
  const id = safeId(params.id)
  const supplier = await supplierService.getDetail(serviceCtx(ctx), id)
  return ok(supplier, { requestId: ctx.requestId })
}

export async function createSupplier(ctx: PublicApiContext, request: NextRequest) {
  const body = await parseJsonBody(request)
  try {
    const supplier = await supplierService.create(serviceCtx(ctx), body as never)
    return created(supplier, { requestId: ctx.requestId })
  } catch (error) {
    return failFromError(error, ctx.requestId)
  }
}

export async function updateSupplier(ctx: PublicApiContext, request: NextRequest, params: Record<string, string>) {
  const id = safeId(params.id)
  const body = await parseJsonBody(request)
  try {
    const supplier = await supplierService.update(serviceCtx(ctx), id, body as never)
    return ok(supplier, { requestId: ctx.requestId })
  } catch (error) {
    return failFromError(error, ctx.requestId)
  }
}

export async function recordPurchase(ctx: PublicApiContext, request: NextRequest, params: Record<string, string>) {
  const supplierId = safeId(params.id)
  const body = await parseJsonBody<{
    description?: unknown
    amount?: unknown
    number?: unknown
    date?: unknown
    dueDate?: unknown
    paymentMethod?: unknown
    documentRef?: unknown
    notes?: unknown
  }>(request)
  if (typeof body.description !== "string" || !body.description.trim()) {
    throw new ApiError("INVALID_REQUEST", "description es obligatoria", 422)
  }
  if (typeof body.amount !== "number" || !Number.isFinite(body.amount) || body.amount <= 0) {
    throw new ApiError("INVALID_REQUEST", "amount debe ser un número positivo", 422)
  }
  try {
    const purchase = await supplierService.recordPurchase(serviceCtx(ctx), {
      supplierId,
      description: body.description.trim(),
      amount: body.amount,
      number: typeof body.number === "string" ? body.number : undefined,
      date: typeof body.date === "string" ? new Date(body.date) : undefined,
      dueDate: typeof body.dueDate === "string" ? new Date(body.dueDate) : undefined,
      paymentMethod: typeof body.paymentMethod === "string" ? body.paymentMethod : undefined,
      documentRef: typeof body.documentRef === "string" ? body.documentRef : undefined,
      notes: typeof body.notes === "string" ? body.notes : undefined,
    })
    return created(purchase, { requestId: ctx.requestId })
  } catch (error) {
    return failFromError(error, ctx.requestId)
  }
}

export async function registerSupplierPayment(
  ctx: PublicApiContext,
  request: NextRequest,
  params: Record<string, string>
) {
  const supplierId = safeId(params.id)
  const body = await parseJsonBody<{
    amount?: unknown
    date?: unknown
    paymentMethod?: unknown
    reference?: unknown
    notes?: unknown
  }>(request)
  if (typeof body.amount !== "number" || !Number.isFinite(body.amount) || body.amount <= 0) {
    throw new ApiError("INVALID_REQUEST", "amount debe ser un número positivo", 422)
  }
  try {
    const result = await supplierService.registerPayment(serviceCtx(ctx), {
      supplierId,
      amount: body.amount,
      date: typeof body.date === "string" ? new Date(body.date) : undefined,
      paymentMethod: typeof body.paymentMethod === "string" ? body.paymentMethod : undefined,
      reference: typeof body.reference === "string" ? body.reference : undefined,
      notes: typeof body.notes === "string" ? body.notes : undefined,
    })
    return ok(result, { requestId: ctx.requestId })
  } catch (error) {
    return failFromError(error, ctx.requestId)
  }
}
