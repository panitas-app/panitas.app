import { describe, expect, it } from "vitest"
import {
  createSignature,
  generateSecret,
  requireWebhookSecret,
  rotateCredentials,
  safeEqualHex,
  sanitizeProviderConfig,
  verifyBearerToken,
  verifyWebhookSignature,
} from "@/lib/communication"
import { isServiceError } from "@/services/errors"

describe("seguridad de la capa de comunicación (FASE 7C)", () => {
  it("calcula y verifica firmas HMAC de webhook", () => {
    const secret = "s3cret"
    const payload = JSON.stringify({ conversationId: "conv-1", text: "Hola" })
    const sig = `sha256=${createSignature(secret, payload)}`
    expect(verifyWebhookSignature(secret, payload, sig)).toBe(true)
    expect(verifyWebhookSignature(secret, payload, sig.slice("sha256=".length))).toBe(true)
    expect(verifyWebhookSignature(secret, payload, "sha256=deadbeef")).toBe(false)
    expect(verifyWebhookSignature(secret, payload, undefined)).toBe(false)
    expect(verifyWebhookSignature(secret, payload, "")).toBe(false)
    expect(verifyWebhookSignature("", payload, sig)).toBe(false)
  })

  it("compara firmas de forma timing-safe", () => {
    expect(safeEqualHex("aabb", "aabb")).toBe(true)
    expect(safeEqualHex("aabb", "aacc")).toBe(false)
    expect(safeEqualHex("aabb", null)).toBe(false)
    expect(safeEqualHex("aabb", "")).toBe(false)
    expect(safeEqualHex("aabbcc", "aabb")).toBe(false)
  })

  it("verifica tokens Bearer de acceso", () => {
    expect(verifyBearerToken("tok-1", "Bearer tok-1")).toBe(true)
    expect(verifyBearerToken("tok-1", "tok-1")).toBe(true)
    expect(verifyBearerToken("tok-1", "Bearer tok-2")).toBe(false)
    expect(verifyBearerToken("tok-1", undefined)).toBe(false)
    expect(verifyBearerToken("tok-1", "Bearer ")).toBe(false)
  })

  it("sanitiza la configuración: nunca expone secretos", () => {
    const clean = sanitizeProviderConfig({
      apiKey: "sk-123",
      webhookSecret: "sec",
      token: "t",
      password: "p",
      displayName: "WhatsApp",
      credentials: { accessToken: "at", clientId: "cid" },
    })
    expect(clean).toEqual({ displayName: "WhatsApp", credentials: { clientId: "cid" } })
    expect(JSON.stringify(clean)).not.toContain("sk-123")
    expect(JSON.stringify(clean)).not.toContain("accessToken")
  })

  it("rota credenciales y tolera el secreto previo durante la transición", () => {
    const current = "current-secret"
    const rotated = rotateCredentials(current)
    expect(rotated.current).not.toBe(current)
    expect(rotated.previous).toBe(current)
    expect(rotated.rotatedAt).toEqual(expect.any(String))

    const payload = JSON.stringify({ conversationId: "conv-1" })
    const sigPrev = `sha256=${createSignature(current, payload)}`
    const sigNew = `sha256=${createSignature(rotated.current, payload)}`
    expect(rotated.verify(payload, sigPrev)).toBe(true)
    expect(rotated.verify(payload, sigNew)).toBe(true)
  })

  it("genera secretos criptográficos de la longitud pedida", () => {
    const secret = generateSecret(16)
    expect(secret).toHaveLength(32)
    expect(generateSecret()).toHaveLength(64)
  })

  it("exige webhookSecret en la configuración para validar webhooks", () => {
    expect(() => requireWebhookSecret({})).toThrow()
    expect(() => requireWebhookSecret({ webhookSecret: " " })).toSatisfy((fn) => {
      try {
        fn()
        return false
      } catch (e) {
        return isServiceError(e) && (e as { status: number }).status === 400
      }
    })
    expect(requireWebhookSecret({ webhookSecret: "s3cret" })).toBe("s3cret")
  })
})
