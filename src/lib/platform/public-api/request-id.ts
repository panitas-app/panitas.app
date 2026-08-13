/**
 * Platform (FASE 8D) — request IDs.
 * Cada request público lleva un requestId único, aparece en logs/auditoría y
 * se devuelve al cliente (header X-Request-Id + cuerpo de error).
 */
import { randomUUID } from "node:crypto"

export const REQUEST_ID_HEADER = "x-request-id"

export function newRequestId(): string {
  return `req_${randomUUID()}`
}

export function getOrCreateRequestId(request: Request): string {
  const incoming = request.headers.get(REQUEST_ID_HEADER)
  if (incoming && /^[A-Za-z0-9_-]{8,64}$/.test(incoming)) return incoming
  return newRequestId()
}
