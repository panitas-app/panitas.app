/**
 * Platform (FASE 8D) — recurso attention (Centro de Atención, FASE 8C).
 * Listado y mutaciones mínimas del centro de atención.
 */
import type { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { attentionService } from "@/lib/attention/app"
import type { AttentionStatus } from "@/lib/attention/types"
import { ApiError } from "@/lib/platform/errors"
import { ok, failFromError } from "@/lib/platform/public-api/response"
import type { PublicApiContext } from "@/lib/platform/public-api/context"
import { parseJsonBody, safeId } from "./helpers"

const ATTENTION_STATUS_FILTERS = ["new", "acknowledged", "snoozed", "resolved", "dismissed", "open", "active"] as const

function parseStatus(value: string | null): AttentionStatus | "open" | "active" | undefined {
  if (!value) return undefined
  if (!ATTENTION_STATUS_FILTERS.includes(value as (typeof ATTENTION_STATUS_FILTERS)[number])) {
    throw new ApiError("INVALID_REQUEST", "status inválido", 422)
  }
  return value as AttentionStatus | "open" | "active"
}

export async function listAttention(ctx: PublicApiContext, request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const status = parseStatus(searchParams.get("status"))

  const items = await attentionService.list(ctx.storeId, {
    ...(status ? { status } : {}),
    limit: 200,
  })
  return ok(items, { requestId: ctx.requestId })
}

export async function getAttentionItem(ctx: PublicApiContext, _request: NextRequest, params: Record<string, string>) {
  const itemId = safeId(params.id)
  const item = await prisma.attentionItem.findFirst({
    where: { id: itemId, storeId: ctx.storeId },
    select: {
      id: true,
      type: true,
      priority: true,
      status: true,
      title: true,
      description: true,
      recommendation: true,
      entityType: true,
      entityId: true,
      createdAt: true,
      updatedAt: true,
      resolvedAt: true,
      snoozedUntil: true,
    },
  })
  if (!item) throw new ApiError("RESOURCE_NOT_FOUND", "Ítem de atención no encontrado", 404)
  return ok(item, { requestId: ctx.requestId })
}

export async function acknowledgeAttention(ctx: PublicApiContext, _request: NextRequest, params: Record<string, string>) {
  const itemId = safeId(params.id)
  try {
    const item = await attentionService.acknowledge(ctx.storeId, itemId, ctx.apiKeyId)
    if (!item) throw new ApiError("RESOURCE_NOT_FOUND", "Ítem de atención no encontrado", 404)
    return ok(item, { requestId: ctx.requestId })
  } catch (error) {
    return failFromError(error, ctx.requestId)
  }
}

export async function resolveAttention(ctx: PublicApiContext, _request: NextRequest, params: Record<string, string>) {
  const itemId = safeId(params.id)
  try {
    const item = await attentionService.resolve(ctx.storeId, itemId, ctx.apiKeyId)
    if (!item) throw new ApiError("RESOURCE_NOT_FOUND", "Ítem de atención no encontrado", 404)
    return ok(item, { requestId: ctx.requestId })
  } catch (error) {
    return failFromError(error, ctx.requestId)
  }
}

export async function dismissAttention(ctx: PublicApiContext, _request: NextRequest, params: Record<string, string>) {
  const itemId = safeId(params.id)
  try {
    const item = await attentionService.dismiss(ctx.storeId, itemId, ctx.apiKeyId)
    if (!item) throw new ApiError("RESOURCE_NOT_FOUND", "Ítem de atención no encontrado", 404)
    return ok(item, { requestId: ctx.requestId })
  } catch (error) {
    return failFromError(error, ctx.requestId)
  }
}

export async function snoozeAttention(ctx: PublicApiContext, request: NextRequest, params: Record<string, string>) {
  const itemId = safeId(params.id)
  const body = await parseJsonBody<{ until?: unknown }>(request)
  if (typeof body.until !== "string" || !Number.isFinite(Date.parse(body.until))) {
    throw new ApiError("INVALID_REQUEST", "until debe ser una fecha ISO futura", 422)
  }
  const until = new Date(body.until)
  if (until.getTime() <= Date.now()) {
    throw new ApiError("INVALID_REQUEST", "until debe ser una fecha futura", 422)
  }
  try {
    const item = await attentionService.snooze(ctx.storeId, itemId, until, ctx.apiKeyId)
    if (!item) throw new ApiError("RESOURCE_NOT_FOUND", "Ítem de atención no encontrado", 404)
    return ok(item, { requestId: ctx.requestId })
  } catch (error) {
    return failFromError(error, ctx.requestId)
  }
}
