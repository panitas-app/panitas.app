/**
 * Platform (FASE 8D) — errores consistentes de la Public API.
 *
 * Formato público:
 *   { "error": { "code": "INVALID_API_KEY", "message": "...", "requestId": "..." } }
 *
 * Los mensajes públicos NUNCA exponen stack traces, SQL, ORM, secrets o
 * estructura interna de la base de datos.
 */
export type ApiErrorCode =
  | "INVALID_API_KEY"
  | "API_KEY_EXPIRED"
  | "API_KEY_REVOKED"
  | "INSUFFICIENT_PERMISSION"
  | "RESOURCE_NOT_FOUND"
  | "RATE_LIMITED"
  | "INVALID_REQUEST"
  | "DUPLICATE_REQUEST"
  | "PLAN_REQUIRED"
  | "FEATURE_NOT_ENABLED"
  | "WEBHOOK_DELIVERY_FAILED"
  | "WEBHOOK_INVALID_ENDPOINT"
  | "INTERNAL_ERROR"
  | "NOT_FOUND"

export class ApiError extends Error {
  constructor(
    public readonly code: ApiErrorCode,
    message: string,
    public readonly status: number = 400,
    public readonly details?: unknown
  ) {
    super(message)
    this.name = "ApiError"
  }
}

export function apiError(code: ApiErrorCode, message: string, status = 400, details?: unknown): ApiError {
  return new ApiError(code, message, status, details)
}

/** Mapea códigos HTTP de errores de servicio internos a códigos públicos. */
export function httpStatusToApiErrorCode(status: number): ApiErrorCode {
  switch (status) {
    case 401:
      return "INVALID_API_KEY"
    case 403:
      return "INSUFFICIENT_PERMISSION"
    case 404:
      return "RESOURCE_NOT_FOUND"
    case 409:
      return "DUPLICATE_REQUEST"
    case 422:
      return "INVALID_REQUEST"
    case 429:
      return "RATE_LIMITED"
    default:
      return "INVALID_REQUEST"
  }
}
