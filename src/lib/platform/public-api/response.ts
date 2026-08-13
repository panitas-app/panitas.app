/**
 * Platform (FASE 8D) — respuestas consistentes de la Public API.
 *
 * Éxito:   { "data": ..., "meta": { "requestId", ... } }
 * Error:   { "error": { "code", "message", "requestId" } }
 */
import { NextResponse } from "next/server"
import { ApiError, httpStatusToApiErrorCode, type ApiErrorCode } from "@/lib/platform/errors"

export interface PublicApiMeta {
  requestId: string
  [key: string]: unknown
}

export function ok<T>(data: T, meta?: Record<string, unknown>): NextResponse {
  const response = NextResponse.json(
    { data, meta: { ...meta } satisfies Record<string, unknown> },
    { status: 200 }
  )
  return response
}

export function created<T>(data: T, meta?: Record<string, unknown>): NextResponse {
  return NextResponse.json({ data, meta: { ...meta } }, { status: 201 })
}

export function noContent(): NextResponse {
  return new NextResponse(null, { status: 204 })
}

export function fail(code: ApiErrorCode, message: string, status: number, requestId: string, headers?: HeadersInit): NextResponse {
  return NextResponse.json(
    { error: { code, message, requestId } },
    { status, headers }
  )
}

export function failFromError(error: unknown, requestId: string, headers?: HeadersInit): NextResponse {
  if (error instanceof ApiError) {
    return fail(error.code, error.message, error.status, requestId, headers)
  }
  // Errores de servicios internos (ServiceError) se mapean sin exponer detalles.
  const err = error as { status?: number; message?: string }
  const status = err?.status && err.status >= 400 && err.status < 600 ? err.status : 500
  const code: ApiErrorCode = status === 500 ? "INTERNAL_ERROR" : httpStatusToApiErrorCode(status)
  const message = status === 500 ? "Error interno de Panitas" : err?.message || "Solicitud inválida"
  return fail(code, message, status, requestId, headers)
}
