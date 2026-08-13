/**
 * Platform (FASE 8D) — contexto de una request autenticada de la Public API.
 * El tenant SIEMPRE se deriva de la API Key, nunca de parámetros del cliente.
 */
import type { Store } from "@prisma/client"
import type { PublicApiPermission } from "@/lib/platform/permissions"

export interface PublicApiContext {
  store: Store
  storeId: string
  apiKeyId: string
  keyName: string
  permissions: PublicApiPermission[]
  requestId: string
  /** Idempotency-Key del request (si aplica). */
  idempotencyKey?: string
  /** True si la respuesta fue reutilizada de una operación idempotente previa. */
  idempotentReplay?: boolean
}

export function hasPublicPermission(ctx: PublicApiContext, permission: PublicApiPermission): boolean {
  return ctx.permissions.includes(permission)
}
