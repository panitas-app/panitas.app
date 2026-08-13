/**
 * Platform (FASE 8D) — helpers comunes de recursos de la Public API.
 */
import type { NextRequest } from "next/server"
import type { StoreServiceContext } from "@/services/context"
import { ApiError } from "@/lib/platform/errors"
import type { PublicApiContext } from "@/lib/platform/public-api/context"

export function serviceCtx(ctx: PublicApiContext): StoreServiceContext {
  return {
    storeId: ctx.storeId,
    userId: ctx.apiKeyId,
    plan: ctx.store.plan,
    storeName: ctx.store.name,
    storeEmail: ctx.store.email,
  }
}

export async function parseJsonBody<T = Record<string, unknown>>(request: NextRequest): Promise<T> {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    throw new ApiError("INVALID_REQUEST", "Cuerpo JSON inválido", 400)
  }
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw new ApiError("INVALID_REQUEST", "Cuerpo inválido", 422)
  }
  return body as T
}

export function parseBooleanParam(value: string | null): boolean | undefined {
  if (value === "true" || value === "1") return true
  if (value === "false" || value === "0") return false
  return undefined
}

export function safeId(value: string | undefined): string {
  if (typeof value !== "string" || value.length === 0 || value.length > 64) {
    throw new ApiError("INVALID_REQUEST", "ID inválido", 422)
  }
  return value
}

export function parseFloatParam(value: string | null, fallback: number, max: number): number {
  if (value == null || value === "") return fallback
  const n = Number(value)
  if (!Number.isFinite(n) || n < 0 || n > max) {
    throw new ApiError("INVALID_REQUEST", `Parámetro numérico inválido (máx ${max})`, 422)
  }
  return n
}
