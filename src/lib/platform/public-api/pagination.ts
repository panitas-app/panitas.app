/**
 * Platform (FASE 8D) — paginación consistente de la Public API.
 *
 * Todas las colecciones públicas soportan:
 *   ?limit=...  (default 20, máx 100)
 *   ?cursor=... (opaco, base64 de la página; omitir = página 1)
 *
 * Meta de respuesta:
 *   { "pagination": { "limit", "hasMore", "nextCursor" } }
 */
import { ApiError } from "@/lib/platform/errors"

export interface PageResult<T> {
  items: T[]
  hasMore: boolean
}

export const DEFAULT_LIMIT = 20
export const MAX_LIMIT = 100

export function parseLimit(raw: string | null): number {
  if (raw == null || raw === "") return DEFAULT_LIMIT
  const n = Number(raw)
  if (!Number.isInteger(n) || n < 1) throw new ApiError("INVALID_REQUEST", "limit debe ser un entero positivo", 422)
  return Math.min(n, MAX_LIMIT)
}

export function parseCursor(raw: string | null): number {
  if (raw == null || raw === "") return 1
  try {
    const page = Number(Buffer.from(raw, "base64url").toString("utf8"))
    if (!Number.isInteger(page) || page < 1) throw new Error()
    return page
  } catch {
    throw new ApiError("INVALID_REQUEST", "cursor inválido", 422)
  }
}

export function encodeCursor(page: number): string {
  return Buffer.from(String(page), "utf8").toString("base64url")
}

/**
 * Aplica paginación a una función que recibe { skip, take }.
 * Pide take+1 para saber si hay más y devuelve nextCursor opaco.
 */
export async function paginate<T>(
  options: { limit: number; cursor?: string | null },
  query: (pageOptions: { skip: number; take: number }) => Promise<T[]>
): Promise<{ items: T[]; pagination: { limit: number; hasMore: boolean; nextCursor: string | null } }> {
  const page = parseCursor(options.cursor ?? null)
  const skip = (page - 1) * options.limit
  const take = options.limit + 1
  const rows = await query({ skip, take })
  const hasMore = rows.length > options.limit
  const items = hasMore ? rows.slice(0, options.limit) : rows
  return {
    items,
    pagination: {
      limit: options.limit,
      hasMore,
      nextCursor: hasMore ? encodeCursor(page + 1) : null,
    },
  }
}

/**
 * Sorting controlado: solo permite campos de una whitelist por recurso.
 * Formato: ?sort=createdAt (asc por defecto) o ?sort=-createdAt (desc).
 */
export function parseSort<T extends string>(
  raw: string | null,
  whitelist: readonly T[]
): { field: T; direction: "asc" | "desc" } | null {
  if (raw == null || raw === "") return null
  let direction: "asc" | "desc" = "asc"
  let field = raw
  if (field.startsWith("-")) {
    direction = "desc"
    field = field.slice(1)
  }
  if (!whitelist.includes(field as T)) {
    throw new ApiError("INVALID_REQUEST", `sort inválido. Permitidos: ${whitelist.join(", ")}`, 422)
  }
  return { field: field as T, direction }
}
