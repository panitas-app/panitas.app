/**
 * Platform (FASE 8D) — permisos de la Public API.
 *
 * READ vs WRITE separados por recurso. Los permisos se otorgan a nivel de
 * API Key (array `permissions` en el modelo ApiKey) y se validan en cada
 * request contra la acción del endpoint.
 */
export type PublicApiScope = "read" | "write"

export type PublicApiPermission = `${PublicApiResource}:${PublicApiScope}`

export type PublicApiResource =
  | "products"
  | "customers"
  | "orders"
  | "inventory"
  | "credits"
  | "suppliers"
  | "conversations"
  | "events"
  | "attention"

export const PUBLIC_API_RESOURCES: PublicApiResource[] = [
  "products",
  "customers",
  "orders",
  "inventory",
  "credits",
  "suppliers",
  "conversations",
  "events",
  "attention",
]

/** Todas las permisos válidos de la Public API v1. */
export const PUBLIC_API_PERMISSIONS: PublicApiPermission[] = [
  "products:read",
  "products:write",
  "customers:read",
  "customers:write",
  "orders:read",
  "orders:write",
  "inventory:read",
  "inventory:write",
  "credits:read",
  "credits:write",
  "suppliers:read",
  "suppliers:write",
  "conversations:read",
  "events:read",
  "attention:read",
  "attention:write",
]

const PERMISSION_SET = new Set<string>(PUBLIC_API_PERMISSIONS)

export function isPublicApiPermission(value: string): value is PublicApiPermission {
  return PERMISSION_SET.has(value)
}

/** Filtra un array arbitrario a permisos válidos (para validación de entrada). */
export function normalizePermissions(raw: unknown): PublicApiPermission[] {
  if (!Array.isArray(raw)) return []
  const seen = new Set<string>()
  const result: PublicApiPermission[] = []
  for (const item of raw) {
    if (typeof item === "string" && isPublicApiPermission(item) && !seen.has(item)) {
      seen.add(item)
      result.push(item)
    }
  }
  return result
}

/**
 * Recurso del que depende cada recurso de la Public API.
 * Se usa para el feature gating por recurso (respetar features de negocio).
 */
export const RESOURCE_FEATURE_MAP: Partial<Record<PublicApiResource, string>> = {
  conversations: "unified_chat",
  attention: "attention_center",
}
