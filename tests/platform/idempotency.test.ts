import { describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"
import {
  IDEMPOTENCY_HEADER,
  IDEMPOTENCY_WINDOW_MS,
  readIdempotencyKey,
  findIdempotency,
  storeIdempotency,
} from "@/lib/platform/public-api/idempotency"
import { ApiError } from "@/lib/platform/errors"
import { makeFakeDb } from "./helpers"

function requestWith(key: string | null): NextRequest {
  const headers: Record<string, string> = {}
  if (key) headers[IDEMPOTENCY_HEADER] = key
  return new NextRequest("http://localhost/api/v1/orders", { headers }) as NextRequest
}

describe("Idempotencia pública (FASE 8D)", () => {
  it("readIdempotencyKey valida formato 8-128 alfanumérico", () => {
    expect(readIdempotencyKey(requestWith("clave-123"))).toBe("clave-123")
    expect(readIdempotencyKey(requestWith(null))).toBeNull()
    expect(readIdempotencyKey(requestWith(""))).toBeNull()
    expect(() => readIdempotencyKey(requestWith("A"))).toThrow(ApiError)
    expect(() => readIdempotencyKey(requestWith("corta"))).toThrow(ApiError)
    expect(() => readIdempotencyKey(requestWith("x".repeat(129)))).toThrow(ApiError)
    expect(() => readIdempotencyKey(requestWith("clave inválida!"))).toThrow(ApiError)
  })

  it("findIdempotency devuelve la respuesta almacenada", async () => {
    const db = makeFakeDb()
    const key = "pedido-123"
    await storeIdempotency(db as never, {
      storeId: "store-1",
      apiKeyId: "key-1",
      key,
      method: "POST",
      path: "/api/v1/orders",
      statusCode: 201,
      responseBody: JSON.stringify({ data: { id: "order-1" } }),
    })

    const stored = await findIdempotency(db as never, "store-1", key)
    expect(stored).not.toBeNull()
    expect(stored!.statusCode).toBe(201)
    expect(JSON.parse(stored!.responseBody).data.id).toBe("order-1")
  })

  it("idempotencia es aislada por tenant (misma key, otra tienda → no existe)", async () => {
    const db = makeFakeDb()
    await storeIdempotency(db as never, {
      storeId: "store-1",
      key: "pedido-123",
      method: "POST",
      path: "/api/v1/orders",
      statusCode: 201,
      responseBody: "{}",
    })
    await expect(findIdempotency(db as never, "store-2", "pedido-123")).resolves.toBeNull()
  })

  it("expira pasada la ventana de 24h", async () => {
    vi.useFakeTimers()
    try {
      const db = makeFakeDb()
      const key = "pedido-123"
      await storeIdempotency(db as never, {
        storeId: "store-1",
        key,
        method: "POST",
        path: "/api/v1/orders",
        statusCode: 201,
        responseBody: "{}",
      })
      await vi.advanceTimersByTimeAsync(IDEMPOTENCY_WINDOW_MS + 1_000)
      await expect(findIdempotency(db as never, "store-1", key)).resolves.toBeNull()
    } finally {
      vi.useRealTimers()
    }
  })
})
