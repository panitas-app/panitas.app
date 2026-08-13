/**
 * Platform (FASE 8D) — wrapper de rutas de la Public API.
 *
 * Pipeline por request:
 *   1. requestId (header X-Request-Id o nuevo)
 *   2. Autenticación con API Key (Bearer) → tenant derivado de la key
 *   3. Feature gating (public_api + feature del recurso si aplica)
 *   4. Rate limiting (por key y por tienda) → 429 + headers
 *   5. Autorización de permiso (resource:action)
 *   6. Idempotencia (si el handler lo declara y el cliente envía la key)
 *   7. Handler → respuesta consistente { data, meta } | { error }
 *   8. Auditoría (fire-and-forget)
 */
import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { ApiError } from "@/lib/platform/errors"
import type { PublicApiPermission, PublicApiResource } from "@/lib/platform/permissions"
import { RESOURCE_FEATURE_MAP } from "@/lib/platform/permissions"
import { hasFeature } from "@/lib/features"
import { createAuditEntry } from "@/lib/audit"
import { ApiKeyService } from "@/lib/platform/api-key/service"
import { authenticateApiRequest } from "./authenticate"
import { hasPublicPermission, type PublicApiContext } from "./context"
import { getOrCreateRequestId, REQUEST_ID_HEADER } from "./request-id"
import { checkPublicApiRateLimit } from "./rate-limit"
import { failFromError, fail, ok, created } from "./response"
import { readIdempotencyKey, findIdempotency, storeIdempotency, IDEMPOTENCY_REPLAY_HEADER } from "./idempotency"
import { prisma } from "@/lib/prisma"

export const apiKeyService = new ApiKeyService()

type RouteParams = { params?: Promise<Record<string, string>> }
export type PublicApiHandler = (
  ctx: PublicApiContext,
  req: NextRequest,
  params: Record<string, string>
) => Promise<NextResponse>

export interface PublicRouteOptions {
  /** Recurso para feature gating adicional (p.ej. attention → attention_center). */
  resource?: PublicApiResource
  /** Activa idempotencia (POST) cuando el cliente envía Idempotency-Key. */
  idempotent?: boolean
  /** Código HTTP de éxito para operaciones de creación. */
  createdStatus?: boolean
}

export function publicRoute(
  permission: PublicApiPermission,
  handler: PublicApiHandler,
  options: PublicRouteOptions = {}
) {
  return async function route(request: NextRequest, routeContext: RouteParams = {}): Promise<NextResponse> {
    const requestId = getOrCreateRequestId(request)
    const startedAt = Date.now()
    const method = request.method
    const path = new URL(request.url).pathname

    try {
      const ctx = await authenticateApiRequest(request, apiKeyService)

      // Feature gating por recurso (respeta features de negocio existentes).
      if (options.resource) {
        const feature = RESOURCE_FEATURE_MAP[options.resource]
        if (feature && !hasFeature({ plan: ctx.store.plan, planType: ctx.store.planType }, feature)) {
          throw new ApiError("FEATURE_NOT_ENABLED", `Tu plan no incluye el recurso ${options.resource}`, 403)
        }
      }

      // Rate limiting por key y por tienda.
      const rate = await checkPublicApiRateLimit(request, { storeId: ctx.storeId, apiKeyId: ctx.apiKeyId })
      if (rate && !rate.success) {
        await audit({ ctx, method, path, status: 429, latencyMs: Date.now() - startedAt })
        return fail("RATE_LIMITED", "Límite de solicitudes superado. Intenta más tarde.", 429, ctx.requestId, rate.headers)
      }

      // Autorización de permiso.
      if (!hasPublicPermission(ctx, permission)) {
        await audit({ ctx, method, path, status: 403, latencyMs: Date.now() - startedAt })
        throw new ApiError("INSUFFICIENT_PERMISSION", `Permiso requerido: ${permission}`, 403)
      }

      // Idempotencia para escrituras.
      let idempotencyKey: string | undefined
      if (options.idempotent && request.method === "POST") {
        idempotencyKey = readIdempotencyKey(request) ?? undefined
        if (idempotencyKey) {
          const stored = await findIdempotency(prisma, ctx.storeId, idempotencyKey)
          if (stored) {
            await audit({ ctx, method, path, status: stored.statusCode, latencyMs: Date.now() - startedAt })
            const response = NextResponse.json(JSON.parse(stored.responseBody), {
              status: stored.statusCode,
              headers: { [IDEMPOTENCY_REPLAY_HEADER]: "true", [REQUEST_ID_HEADER]: requestId },
            })
            return response
          }
        }
      }

      const params = routeContext.params ? await routeContext.params : {}
      const result = await handler(ctx, request, params)

      // Persiste la respuesta idempotente (solo respuestas 2xx/409/422).
      if (idempotencyKey && result.status >= 200 && result.status < 500) {
        const bodyText = await result.clone().text()
        await storeIdempotency(prisma, {
          storeId: ctx.storeId,
          apiKeyId: ctx.apiKeyId,
          key: idempotencyKey,
          method,
          path,
          statusCode: result.status,
          responseBody: bodyText,
        })
      }

      await audit({ ctx, method, path, status: result.status, latencyMs: Date.now() - startedAt })
      return result
    } catch (error) {
      await audit({ ctx: null, method, path, status: error instanceof ApiError ? error.status : 500, latencyMs: Date.now() - startedAt, error })
      const response = failFromError(error, requestId)
      return response
    }
  }
}

interface AuditInput {
  ctx: Pick<PublicApiContext, "storeId" | "apiKeyId" | "requestId"> | null
  method: string
  path: string
  status: number
  latencyMs: number
  error?: unknown
}

function audit(input: AuditInput): void {
  if (!input.ctx) return
  void createAuditEntry({
    action: "public_api.request",
    entity: "PublicApi",
    entityId: input.ctx.apiKeyId,
    storeId: input.ctx.storeId,
    metadata: {
      requestId: input.ctx.requestId,
      method: input.method,
      path: input.path,
      status: input.status,
      latencyMs: input.latencyMs,
      error: input.error instanceof Error ? input.error.message : undefined,
    },
  }).catch(() => {})
}

export { ok, created }
