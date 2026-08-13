/**
 * Platform (FASE 8D) — autenticación de la Public API.
 *
 * La tenant SIEMPRE se deriva de la API Key (Bearer). Nunca se confía en IDs
 * enviados por el cliente para determinar el tenant.
 */
import type { NextRequest } from "next/server"
import { ApiError } from "@/lib/platform/errors"
import { ApiKeyService } from "@/lib/platform/api-key/service"
import { hasFeature } from "@/lib/features"
import { normalizePermissions, type PublicApiPermission } from "@/lib/platform/permissions"
import { getOrCreateRequestId } from "./request-id"
import type { PublicApiContext } from "./context"

const BEARER_RE = /^Bearer\s+(\S+)$/i

export function extractBearerToken(request: NextRequest): string | null {
  const header = request.headers.get("authorization")
  if (!header) return null
  const match = BEARER_RE.exec(header)
  return match ? match[1] : null
}

/**
 * Autentica la request y construye el contexto público.
 * Valida: API key → estado → expiración → plan (feature public_api).
 */
export async function authenticateApiRequest(
  request: NextRequest,
  apiKeys: ApiKeyService
): Promise<PublicApiContext> {
  const requestId = getOrCreateRequestId(request)
  const secret = extractBearerToken(request)
  if (!secret) {
    throw new ApiError("INVALID_API_KEY", "Autenticación requerida: Authorization: Bearer <API Key>", 401)
  }

  const { key, store } = await apiKeys.validate(secret)

  // Feature gating: la Public API pertenece al plan que la incluye.
  const planRef = { plan: store.plan, planType: store.planType }
  if (!hasFeature(planRef, "public_api")) {
    throw new ApiError("PLAN_REQUIRED", "Tu plan no incluye la API pública de Panitas", 403)
  }

  const context: PublicApiContext = {
    store,
    storeId: store.id,
    apiKeyId: key.id,
    keyName: key.name,
    permissions: parseKeyPermissions(key.permissions),
    requestId,
  }

  apiKeys.touch(key.id)

  return context
}

function parseKeyPermissions(raw: string): PublicApiPermission[] {
  try {
    return normalizePermissions(JSON.parse(raw))
  } catch {
    return []
  }
}
