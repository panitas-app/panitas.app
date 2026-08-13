/**
 * Platform (FASE 8D) — idempotencia para operaciones de escritura sensibles.
 *
 * El cliente envía `Idempotency-Key`. Si el mismo request (misma key + tienda)
 * se repite dentro de la ventana, se devuelve la respuesta almacenada sin
 * volver a ejecutar la operación (evita pedidos/pagos duplicados).
 */
import type { PrismaClient } from "@prisma/client"
import type { NextRequest } from "next/server"
import { ApiError } from "@/lib/platform/errors"

export const IDEMPOTENCY_HEADER = "idempotency-key"
export const IDEMPOTENCY_REPLAY_HEADER = "x-idempotent-replay"
export const IDEMPOTENCY_WINDOW_MS = 24 * 60 * 60 * 1000 // 24 horas

const KEY_RE = /^[A-Za-z0-9_-]{8,128}$/

export interface StoredIdempotency {
  key: string
  statusCode: number
  responseBody: string
}

export function readIdempotencyKey(request: NextRequest): string | null {
  const raw = request.headers.get(IDEMPOTENCY_HEADER)
  if (raw == null || raw === "") return null
  if (!KEY_RE.test(raw)) {
    throw new ApiError("INVALID_REQUEST", "Idempotency-Key inválida (8-128 chars alfanuméricos)", 422)
  }
  return raw
}

export async function findIdempotency(
  db: PrismaClient,
  storeId: string,
  key: string
): Promise<StoredIdempotency | null> {
  const row = await db.apiIdempotency.findUnique({
    where: { storeId_key: { storeId, key } },
  })
  if (!row) return null
  if (row.createdAt.getTime() + IDEMPOTENCY_WINDOW_MS < Date.now()) {
    await db.apiIdempotency.delete({ where: { id: row.id } }).catch(() => {})
    return null
  }
  return { key: row.key, statusCode: row.statusCode, responseBody: row.responseBody }
}

export async function storeIdempotency(
  db: PrismaClient,
  input: { storeId: string; apiKeyId?: string; key: string; method: string; path: string; statusCode: number; responseBody: string }
): Promise<void> {
  await db.apiIdempotency
    .upsert({
      where: { storeId_key: { storeId: input.storeId, key: input.key } },
      create: {
        storeId: input.storeId,
        apiKeyId: input.apiKeyId ?? null,
        key: input.key,
        method: input.method,
        path: input.path,
        statusCode: input.statusCode,
        responseBody: input.responseBody,
        expiresAt: new Date(Date.now() + IDEMPOTENCY_WINDOW_MS),
      },
      update: {},
    })
    .catch((error) => {
      console.error("[platform] idempotency store falló:", String(error))
    })
}
