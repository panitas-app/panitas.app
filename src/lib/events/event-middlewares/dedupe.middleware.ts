/**
 * Middleware: deduplicación (FASE 5H).
 *
 * Descarta eventos duplicados por `dedupeKey` dentro de un TTL. Útil para
 * publicaciones idempotentes o reintentos de integraciones (webhooks, colas).
 * Es opt-in: solo aplica a eventos que definen `dedupeKey`.
 */
import type { EventMiddleware } from "../event-types"

export interface DedupeMiddlewareOptions {
  /** Ventana de dedupe por defecto (por defecto 5000ms). */
  ttlMs?: number
  /** Límite de entradas en memoria (por defecto 1000). */
  maxEntries?: number
}

export function dedupeMiddleware(options: DedupeMiddlewareOptions = {}): EventMiddleware {
  const ttlMs = options.ttlMs ?? 5_000
  const maxEntries = options.maxEntries ?? 1_000
  const seen = new Map<string, number>()

  return async (ctx, next) => {
    const key = ctx.event.dedupeKey
    if (!key) {
      await next()
      return
    }

    if (seen.size > maxEntries) {
      prune()
    }

    const now = Date.now()
    const last = seen.get(key)
    if (last !== undefined && now - last < ttlMs) {
      return
    }
    seen.set(key, now)
    await next()
  }

  function prune(): void {
    const cutoff = Date.now() - ttlMs
    for (const [key, ts] of seen) {
      if (ts < cutoff) seen.delete(key)
    }
  }
}
