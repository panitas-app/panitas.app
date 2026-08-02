/**
 * Jerarquía de errores de proveedor (FASE 3A).
 * Permite al AI Provider Manager decidir qué errores reintentar y normalizar los fallos
 * sin que el resto del sistema conozca detalles de un proveedor concreto.
 */

export type ProviderErrorKind = "http" | "timeout" | "network" | "invalid_response" | "missing_key"

export interface ProviderErrorOptions {
  status?: number
  provider?: string
  body?: string
  cause?: unknown
}

export class ProviderError extends Error {
  readonly kind: ProviderErrorKind
  readonly status?: number
  readonly provider?: string
  readonly body?: string

  constructor(kind: ProviderErrorKind, message: string, options: ProviderErrorOptions = {}) {
    super(message)
    this.name = "ProviderError"
    this.kind = kind
    this.status = options.status
    this.provider = options.provider
    this.body = options.body
    if (options.cause !== undefined) this.cause = options.cause
  }
}

export class ProviderHttpError extends ProviderError {
  constructor(status: number, message: string, options: Omit<ProviderErrorOptions, "status"> = {}) {
    super("http", message, { ...options, status })
    this.name = "ProviderHttpError"
  }
}

export class ProviderTimeoutError extends ProviderError {
  constructor(message = "El proveedor no respondió a tiempo", options: ProviderErrorOptions = {}) {
    super("timeout", message, options)
    this.name = "ProviderTimeoutError"
  }
}

export class ProviderNetworkError extends ProviderError {
  constructor(message: string, options: ProviderErrorOptions = {}) {
    super("network", message, options)
    this.name = "ProviderNetworkError"
  }
}

export class ProviderInvalidResponseError extends ProviderError {
  constructor(message = "El proveedor devolvió una respuesta inválida", options: ProviderErrorOptions = {}) {
    super("invalid_response", message, options)
    this.name = "ProviderInvalidResponseError"
  }
}

export class ProviderMissingKeyError extends ProviderError {
  constructor(message = "No hay API key configurada para el proveedor", options: ProviderErrorOptions = {}) {
    super("missing_key", message, options)
    this.name = "ProviderMissingKeyError"
  }
}

/** Errores reintentables: timeout, red y HTTP 429 / 5xx. */
export function isRetryable(error: unknown): boolean {
  if (!(error instanceof ProviderError)) return false
  if (error.kind === "timeout" || error.kind === "network") return true
  if (error.kind === "http") return error.status === 429 || (error.status ?? 0) >= 500
  return false
}

/** Mensaje legible de un error de proveedor (sin exponer internos). */
export function providerErrorMessage(error: unknown): string {
  if (error instanceof ProviderError) return error.message
  if (error instanceof Error) return error.message
  return "Error desconocido del proveedor de IA"
}
