/**
 * Communication Integration Layer (FASE 7C) — Seguridad.
 *
 * Verificación de firmas de webhooks (HMAC SHA-256 con comparación timing-safe),
 * sanitización de configuración (nunca exponer secretos) y rotación de
 * credenciales simulada. Sin conexiones reales: el proveedor mock usa estas
 * utilidades para validar las peticiones entrantes.
 */
import { createHmac, timingSafeEqual, randomBytes } from "crypto"
import { serviceError } from "@/services/errors"

/** Claves que jamás deben salir en respuestas, logs o métricas. */
const SECRET_KEY_PATTERN = /(secret|token|key|password|apikey|authorization|signature)/i

/** Calcula la firma HMAC-SHA-256 (hex) de un payload. */
export function createSignature(secret: string, payload: string): string {
  return createHmac("sha256", secret).update(payload, "utf8").digest("hex")
}

/** Comparación timing-safe de dos hex strings. */
export function safeEqualHex(a: string | null | undefined, b: string): boolean {
  if (!a || !b) return false
  const bufA = Buffer.from(a, "hex")
  const bufB = Buffer.from(b, "hex")
  if (bufA.length !== bufB.length) return false
  return timingSafeEqual(bufA, bufB)
}

/**
 * Verifica la firma de un webhook. El encabezado esperado es `x-hub-signature-256`
 * con formato `sha256=<hex>` (estándar de GitHub/Meta) o `sha256=<hex>` simple.
 * Retorna true/false; nunca lanza por firma inválida.
 */
export function verifyWebhookSignature(secret: string, payload: string, signatureHeader: string | null | undefined): boolean {
  if (!secret || !payload || !signatureHeader) return false
  const expected = signatureHeader.startsWith("sha256=") ? signatureHeader.slice("sha256=".length) : signatureHeader
  const actual = createSignature(secret, payload)
  return safeEqualHex(actual, expected)
}

/**
 * Verifica un token Bearer de acceso (API key). Comparación timing-safe.
 */
export function verifyBearerToken(secret: string, authorizationHeader: string | null | undefined): boolean {
  if (!secret || !authorizationHeader) return false
  const token = authorizationHeader.startsWith("Bearer ") ? authorizationHeader.slice("Bearer ".length) : authorizationHeader
  const bufA = Buffer.from(token)
  const bufB = Buffer.from(secret)
  if (bufA.length !== bufB.length) return false
  return timingSafeEqual(bufA, bufB)
}

/**
 * Sanitiza una configuración de proveedor: elimina claves secretas y deja el
 * resto intacto. Pensado para respuestas, health y métricas.
 */
export function sanitizeProviderConfig(config: Record<string, unknown> | undefined): Record<string, unknown> {
  if (!config || typeof config !== "object") return {}
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(config)) {
    if (SECRET_KEY_PATTERN.test(key)) continue
    if (value && typeof value === "object" && !Array.isArray(value)) {
      result[key] = sanitizeProviderConfig(value as Record<string, unknown>)
    } else {
      result[key] = value
    }
  }
  return result
}

/**
 * Genera un secreto criptográfico aleatorio (por defecto 32 bytes hex).
 */
export function generateSecret(bytes = 32): string {
  return randomBytes(bytes).toString("hex")
}

/**
 * Simula la rotación de credenciales de un proveedor: dado un secret vigente y
 * uno de respaldo (para tolerancia en transición), rota de forma determinista.
 * Devuelve el par (vigente, respaldo) rotado y las fechas de uso.
 */
export interface RotatedCredentials {
  current: string
  previous: string | null
  rotatedAt: string
  verify: (payload: string, signatureHeader: string | null | undefined) => boolean
}

export function rotateCredentials(current: string, previous?: string | null): RotatedCredentials {
  const next = generateSecret()
  return {
    current: next,
    previous: current,
    rotatedAt: new Date().toISOString(),
    verify: (payload, signatureHeader) =>
      verifyWebhookSignature(next, payload, signatureHeader) ||
      verifyWebhookSignature(current, payload, signatureHeader) ||
      (previous ? verifyWebhookSignature(previous, payload, signatureHeader) : false),
  }
}

/** Valida un secreto de webhook presente; error si falta (para config). */
export function requireWebhookSecret(config: Record<string, unknown> | undefined): string {
  const secret = config?.webhookSecret
  if (typeof secret !== "string" || !secret.trim()) {
    throw serviceError("Configuración sin webhookSecret: imposible validar webhooks", 400, "MISSING_WEBHOOK_SECRET")
  }
  return secret
}
