import { describe, expect, it } from "vitest"
import { signPayload, verifySignature, requireValidSignature, TOLERANCE_MS } from "@/lib/platform/webhooks/signature"
import { ApiError } from "@/lib/platform/errors"

const SECRET = "0123456789abcdef0123456789abcdef"
const PAYLOAD = JSON.stringify({ eventId: "evt_1", type: "order.created", data: { total: 100 } })

describe("Firma de webhooks (FASE 8D)", () => {
  it("signPayload produce formato t=,v1=", () => {
    const header = signPayload(PAYLOAD, SECRET, 1700000000000)
    expect(header).toMatch(/^t=\d+,v1=[0-9a-f]{64}$/)
  })

  it("verifica una firma válida", () => {
    const timestamp = Date.now()
    const header = signPayload(PAYLOAD, SECRET, timestamp)
    expect(verifySignature(header, PAYLOAD, SECRET)).toEqual({ valid: true })
  })

  it("rechaza payload alterado", () => {
    const header = signPayload(PAYLOAD, SECRET, Date.now())
    const tampered = PAYLOAD.replace("100", "999")
    expect(verifySignature(header, tampered, SECRET)).toEqual({ valid: false, reason: "bad_signature" })
  })

  it("rechaza firma con secreto incorrecto", () => {
    const header = signPayload(PAYLOAD, "wrong-secret-wrong-secret-wrong", Date.now())
    expect(verifySignature(header, PAYLOAD, SECRET)).toEqual({ valid: false, reason: "bad_signature" })
  })

  it("rechaza timestamps fuera de tolerancia (anti-replay)", () => {
    const old = signPayload(PAYLOAD, SECRET, Date.now() - TOLERANCE_MS - 1_000)
    expect(verifySignature(old, PAYLOAD, SECRET)).toEqual({ valid: false, reason: "expired_timestamp" })

    const future = signPayload(PAYLOAD, SECRET, Date.now() + TOLERANCE_MS + 1_000)
    expect(verifySignature(future, PAYLOAD, SECRET)).toEqual({ valid: false, reason: "expired_timestamp" })
  })

  it("acepta timestamps dentro de tolerancia", () => {
    const header = signPayload(PAYLOAD, SECRET, Date.now() - TOLERANCE_MS + 1_000)
    expect(verifySignature(header, PAYLOAD, SECRET).valid).toBe(true)
  })

  it("rechaza headers malformados", () => {
    expect(verifySignature("", PAYLOAD, SECRET)).toEqual({ valid: false, reason: "bad_header" })
    expect(verifySignature("v1=abc", PAYLOAD, SECRET)).toEqual({ valid: false, reason: "bad_header" })
    expect(verifySignature("t=abc,v1=abc", PAYLOAD, SECRET)).toEqual({ valid: false, reason: "bad_header" })
  })

  it("requireValidSignature lanza ApiError público sin secretos", () => {
    expect(() => requireValidSignature(null, PAYLOAD, SECRET)).toThrow(ApiError)
    expect(() => requireValidSignature("t=1,v1=x", PAYLOAD, SECRET)).toThrow(ApiError)

    try {
      requireValidSignature(null, PAYLOAD, SECRET)
    } catch (error) {
      const e = error as ApiError
      expect(e.code).toBe("WEBHOOK_DELIVERY_FAILED")
      expect(e.message).not.toContain(SECRET)
    }
  })
})
