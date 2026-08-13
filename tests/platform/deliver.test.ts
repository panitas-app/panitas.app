import { describe, expect, it } from "vitest"
import { backoffForAttempt, buildPayloadJson, isRetryable, MAX_DELIVERY_ATTEMPTS, RETRY_BACKOFF_MS } from "@/lib/platform/webhooks/deliver"
import { makeSubscription } from "./helpers"

describe("Entrega de webhooks (FASE 8D)", () => {
  it("isRetryable: 5xx y 429 se reintentan, 4xx no", () => {
    expect(isRetryable(500, null)).toBe(true)
    expect(isRetryable(503, null)).toBe(true)
    expect(isRetryable(429, null)).toBe(true)
    expect(isRetryable(400, null)).toBe(false)
    expect(isRetryable(404, null)).toBe(false)
    expect(isRetryable(null, "network error")).toBe(true)
    expect(isRetryable(null, null)).toBe(false)
  })

  it("backoffForAttempt sigue la secuencia sin exceder el máximo", () => {
    expect(backoffForAttempt(1)).toBe(RETRY_BACKOFF_MS[1])
    expect(backoffForAttempt(4)).toBe(RETRY_BACKOFF_MS[4])
    // Intentos más allá del array usan el último backoff (sin loops infinitos).
    expect(backoffForAttempt(99)).toBe(RETRY_BACKOFF_MS[RETRY_BACKOFF_MS.length - 1])
  })

  it("máximo de intentos está acotado", () => {
    expect(MAX_DELIVERY_ATTEMPTS).toBe(5)
  })

  it("buildPayloadJson incluye eventId, type, tenantId y timestamp", () => {
    const json = buildPayloadJson(makeSubscription(), {
      eventId: "evt_1",
      type: "order.created",
      tenantId: "store-1",
      occurredAt: "2026-01-01T00:00:00.000Z",
      data: { total: 100 },
    })
    const payload = JSON.parse(json)
    expect(payload.eventId).toBe("evt_1")
    expect(payload.type).toBe("order.created")
    expect(payload.tenantId).toBe("store-1")
    expect(payload.occurredAt).toBe("2026-01-01T00:00:00.000Z")
    expect(payload.data).toEqual({ total: 100 })
    expect(typeof payload.timestamp).toBe("number")
  })
})
