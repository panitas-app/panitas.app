/**
 * Communication Integration Layer (FASE 7C) — Middleware de reintentos.
 *
 * Reintenta el envío con backoff exponencial cuando el proveedor falla (red,
 * 5xx, timeout). Acumula el número de reintentos en el resultado final y notifica
 * cada intento fallido vía callback para que el manager emita `provider.retry`.
 */
import { serviceError } from "@/services/errors"
import type { ProviderSendResult } from "../provider-types"
import type { SendMiddleware } from "./middleware-types"

export interface RetryMiddlewareOptions {
  /** Intentos totales incluyendo el primero (por defecto 3). */
  attempts?: number
  /** Retardo base en ms (por defecto 100). */
  baseDelayMs?: number
  /** Retardo máximo en ms (por defecto 2000). */
  maxDelayMs?: number
  /** Decide si un error amerita reintento. Por defecto: errores >= 500 o de red. */
  shouldRetry?: (error: unknown) => boolean
  /** Hook por cada reintento que se va a ejecutar. */
  onRetry?: (attempt: number, error: unknown) => void | Promise<void>
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

const DEFAULT_SHOULD_RETRY = (error: unknown): boolean => {
  if (error instanceof Error && error.name === "AbortError") return false
  if (typeof error === "object" && error !== null && "status" in error) {
    const status = (error as { status?: unknown }).status
    if (typeof status === "number") return status >= 500
  }
  return true
}

export function retryMiddleware(options: RetryMiddlewareOptions = {}): SendMiddleware {
  const attempts = Math.max(1, options.attempts ?? 3)
  const baseDelayMs = Math.max(0, options.baseDelayMs ?? 100)
  const maxDelayMs = Math.max(baseDelayMs, options.maxDelayMs ?? 2000)
  const shouldRetry = options.shouldRetry ?? DEFAULT_SHOULD_RETRY
  const onRetry = options.onRetry

  return async (input, next) => {
    let lastError: unknown
    let retries = 0
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      try {
        const result: ProviderSendResult = await next()
        return { ...result, retries: retries + (result.retries ?? 0) }
      } catch (error: unknown) {
        lastError = error
        const isLast = attempt >= attempts - 1
        if (isLast || !shouldRetry(error)) throw error
        retries += 1
        await onRetry?.(retries, error)
        const backoff = Math.min(maxDelayMs, baseDelayMs * 2 ** (attempt + 1))
        await delay(backoff)
      }
    }
    throw lastError
  }
}

/** True si el error es de proveedor no conectado (para `shouldRetry` custom). */
export function isProviderOffline(error: unknown): boolean {
  if (typeof error === "object" && error !== null && "status" in error) {
    return (error as { status?: unknown }).status === 502
  }
  return false
}

/** Error lanzado cuando se agotan los reintentos de un proveedor. */
export function retryExhaustedError(providerId: string, attempts: number, cause: unknown): unknown {
  return serviceError(
    `El proveedor ${providerId} falló tras ${attempts} intentos`,
    502,
    "PROVIDER_RETRY_EXHAUSTED",
    cause,
  )
}
