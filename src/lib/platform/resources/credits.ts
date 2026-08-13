/**
 * Platform (FASE 8D) — recurso credits (créditos y pagos).
 * Writes idempotentes vía Idempotency-Key (registerPayment).
 */
import type { NextRequest } from "next/server"
import { CreditService } from "@/services/credit.service"
import { ApiError } from "@/lib/platform/errors"
import { parseLimit } from "@/lib/platform/public-api/pagination"
import { ok, failFromError } from "@/lib/platform/public-api/response"
import type { PublicApiContext } from "@/lib/platform/public-api/context"
import { parseJsonBody, safeId, serviceCtx } from "./helpers"

const creditService = new CreditService()

const CREDIT_STATUSES = ["all", "active", "completed", "cancelled", "overdue", "on_time", "upcoming"]

function normalizeLimit(value: string | null): number {
  return Math.min(Math.max(parseLimit(value), 1), 100)
}

export async function listCredits(ctx: PublicApiContext, request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const status = searchParams.get("status") ?? "all"
  if (!CREDIT_STATUSES.includes(status)) {
    throw new ApiError("INVALID_REQUEST", `status inválido. Permitidos: ${CREDIT_STATUSES.join(", ")}`, 422)
  }
  const search = (searchParams.get("search") ?? "").slice(0, 100)
  const limit = normalizeLimit(searchParams.get("limit"))

  const result = await creditService.list(serviceCtx(ctx), { status, search, limit })
  return ok(result.credits, { pagination: { limit }, requestId: ctx.requestId })
}

export async function getCredit(ctx: PublicApiContext, _request: NextRequest, params: Record<string, string>) {
  const orderId = safeId(params.orderId)
  const detail = await creditService.getDetail(serviceCtx(ctx), orderId)
  return ok(detail, { requestId: ctx.requestId })
}

export async function registerPayment(ctx: PublicApiContext, request: NextRequest, params: Record<string, string>) {
  const orderId = safeId(params.orderId)
  const body = await parseJsonBody<{
    amount?: unknown
    method?: unknown
    paidAt?: unknown
    reference?: unknown
    notes?: unknown
    paymentAccountId?: unknown
  }>(request)

  if (typeof body.amount !== "number" || !Number.isFinite(body.amount) || body.amount <= 0) {
    throw new ApiError("INVALID_REQUEST", "amount debe ser un número positivo", 422)
  }
  if (body.paidAt !== undefined && typeof body.paidAt !== "string") {
    throw new ApiError("INVALID_REQUEST", "paidAt debe ser una fecha ISO", 422)
  }

  try {
    const detail = await creditService.registerPayment(serviceCtx(ctx), {
      orderId,
      amount: body.amount,
      method: typeof body.method === "string" ? body.method : undefined,
      paidAt: typeof body.paidAt === "string" ? new Date(body.paidAt) : undefined,
      reference: typeof body.reference === "string" ? body.reference : undefined,
      notes: typeof body.notes === "string" ? body.notes : undefined,
      paymentAccountId: typeof body.paymentAccountId === "string" ? body.paymentAccountId : undefined,
    })
    return ok(detail, { requestId: ctx.requestId })
  } catch (error) {
    return failFromError(error, ctx.requestId)
  }
}
