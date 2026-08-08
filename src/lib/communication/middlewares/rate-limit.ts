/**
 * Communication Integration Layer (FASE 7C) — Middleware de rate limit.
 *
 * Limita la cantidad de mensajes de salida por ventana deslizante, por bucket
 * (por defecto por canal). Evita sobrecargar al proveedor y a los clientes.
 * Lanza `ServiceError` 429 cuando se alcanza el límite.
 */
import { serviceError } from "@/services/errors"
import type { ProviderOutboundInput } from "../provider-types"
import type { SendMiddleware } from "./middleware-types"

export interface RateLimitMiddlewareOptions {
  /** Máximo de mensajes por ventana (por defecto 60). */
  limit?: number
  /** Ventana en ms (por defecto 60_000). */
  windowMs?: number
  /** Define la clave del bucket (por defecto el canal). */
  bucketKey?: (input: ProviderOutboundInput) => string
}

export function rateLimitMiddleware(options: RateLimitMiddlewareOptions = {}): SendMiddleware {
  const limit = Math.max(1, options.limit ?? 60)
  const windowMs = Math.max(1, options.windowMs ?? 60_000)
  const bucketKey = options.bucketKey ?? ((input) => input.channel)
  const buckets = new Map<string, number[]>()

  const prunable = () => {
    const now = Date.now()
    for (const [key, hits] of buckets) {
      const kept = hits.filter((t) => now - t < windowMs)
      if (kept.length === 0) buckets.delete(key)
      else buckets.set(key, kept)
    }
  }

  return async (input, next) => {
    prunable()
    const key = bucketKey(input)
    const hits = buckets.get(key) ?? []
    if (hits.length >= limit) {
      throw serviceError("Límite de mensajes alcanzado, intenta en unos segundos", 429, "RATE_LIMITED")
    }
    hits.push(Date.now())
    buckets.set(key, hits)
    return next()
  }
}
