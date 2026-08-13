/**
 * Platform (FASE 8D) — rate limiting de la Public API.
 * Por tenant y por API key, sobre la infraestructura existente (rate-limit.ts).
 */
import { rateLimit } from "@/lib/rate-limit"

export interface RateLimitResult {
  success: boolean
  remaining: number
  resetIn: number
  headers?: Record<string, string>
}

/** Límites por defecto (por key y por tienda, ventana de 1 minuto). */
export const PUBLIC_API_DEFAULTS = {
  requestsPerKeyPerMinute: 120,
  requestsPerStorePerMinute: 600,
}

function toHeaders(key: string, result: Pick<RateLimitResult, "success" | "remaining" | "resetIn">): Record<string, string> {
  return {
    "X-RateLimit-Limit": String(result.remaining + (result.success ? 1 : 0)),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(Math.ceil(result.resetIn / 1000)),
    "Retry-After": String(Math.ceil(result.resetIn / 1000)),
    "X-RateLimit-Scope": key,
  }
}

export async function checkPublicApiRateLimit(
  request: Request,
  context: { storeId: string; apiKeyId: string }
): Promise<RateLimitResult | null> {
  const [byKey, byStore] = await Promise.all([
    rateLimit(`public-api:key:${context.apiKeyId}`, PUBLIC_API_DEFAULTS.requestsPerKeyPerMinute, 60_000),
    rateLimit(`public-api:store:${context.storeId}`, PUBLIC_API_DEFAULTS.requestsPerStorePerMinute, 60_000),
  ])

  if (!byKey.success) return { ...byKey, headers: toHeaders("key", byKey) }
  if (!byStore.success) return { ...byStore, headers: toHeaders("store", byStore) }

  // Expone los límites de la key (el más restrictivo de los dos).
  return { ...byKey, headers: toHeaders("key", byKey) }
}
