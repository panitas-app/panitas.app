/**
 * Platform (FASE 8D) — firma HMAC de webhooks.
 *
 * Formato del header:
 *   X-Panitas-Signature: t=<timestamp>,v1=<hmac sha256 hex>
 *
 * El payload firmado es: `<timestamp>.<cuerpo JSON>`.
 * El receptor puede verificar que el webhook proviene de Panitas y que no fue
 * alterado comparando el HMAC con el secreto de su suscripción.
 */
import { createHmac, timingSafeEqual } from "node:crypto"
import { ApiError } from "@/lib/platform/errors"

export const SIGNATURE_HEADER = "x-panitas-signature"
export const EVENT_ID_HEADER = "x-panitas-event-id"
export const DELIVERY_ID_HEADER = "x-panitas-delivery-id"
export const TOLERANCE_MS = 5 * 60 * 1000 // 5 min anti-replay

export function signPayload(payload: string, secret: string, timestamp: number): string {
  const hmac = createHmac("sha256", secret).update(`${timestamp}.${payload}`).digest("hex")
  return `t=${timestamp},v1=${hmac}`
}

export function verifySignature(headerValue: string, payload: string, secret: string): { valid: boolean; reason?: string } {
  const parts = headerValue.split(",")
  const entries = new Map<string, string>()
  for (const part of parts) {
    const eq = part.indexOf("=")
    if (eq > 0) entries.set(part.slice(0, eq), part.slice(eq + 1))
  }
  const timestamp = Number(entries.get("t"))
  const signature = entries.get("v1")
  if (!Number.isFinite(timestamp) || !signature) {
    return { valid: false, reason: "bad_header" }
  }

  const now = Date.now()
  if (now - timestamp > TOLERANCE_MS || timestamp - now > TOLERANCE_MS) {
    return { valid: false, reason: "expired_timestamp" }
  }

  const expected = createHmac("sha256", secret).update(`${timestamp}.${payload}`).digest("hex")
  const a = Buffer.from(signature, "utf8")
  const b = Buffer.from(expected, "utf8")
  const valid = a.length === b.length && timingSafeEqual(a, b)
  return valid ? { valid: true } : { valid: false, reason: "bad_signature" }
}

export function requireValidSignature(headerValue: string | null, payload: string, secret: string): void {
  if (!headerValue) throw new ApiError("WEBHOOK_DELIVERY_FAILED", "Firma ausente", 400)
  const result = verifySignature(headerValue, payload, secret)
  if (!result.valid) throw new ApiError("WEBHOOK_DELIVERY_FAILED", `Firma de webhook inválida (${result.reason})`, 400)
}
