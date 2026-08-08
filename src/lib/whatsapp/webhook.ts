/**
 * WhatsApp Cloud API (FASE 8A) — Utilidades de webhook.
 *
 * Helpers para procesar payloads de la Graph API de Meta en las rutas de
 * webhook: extracción del `phone_number_id` (resuelve el negocio/tienda) y
 * verificación del handshake GET de suscripción.
 */

/** Extrae el `phone_number_id` de un payload de webhook de WhatsApp. */
export function extractPhoneNumberId(body: unknown): string {
  if (!body || typeof body !== "object") return ""
  const root = body as { entry?: unknown }
  if (!Array.isArray(root.entry)) return ""
  for (const entry of root.entry) {
    const changes = (entry as { changes?: unknown }).changes
    if (!Array.isArray(changes)) continue
    for (const change of changes) {
      const value = (change as { value?: unknown }).value
      const metadata = (value as { metadata?: { phone_number_id?: unknown } } | null)?.metadata
      if (metadata && typeof metadata.phone_number_id === "string" && metadata.phone_number_id) {
        return metadata.phone_number_id
      }
    }
  }
  return ""
}

/** Resultado del handshake GET de suscripción de webhooks. */
export interface WhatsAppWebhookVerifyResult {
  valid: boolean
  challenge?: string
}

/**
 * Valida el handshake de suscripción de Meta:
 * `hub.mode=subscribe&hub.verify_token=<token>&hub.challenge=<challenge>`.
 * El challenge se devuelve SOLO si el verify token coincide.
 */
export function verifyWhatsAppWebhook(params: URLSearchParams, expectedToken: string): WhatsAppWebhookVerifyResult {
  if (params.get("hub.mode") !== "subscribe") return { valid: false }
  const token = params.get("hub.verify_token") ?? ""
  const challenge = params.get("hub.challenge") ?? ""
  if (!challenge) return { valid: false }
  if (!expectedToken || token !== expectedToken) return { valid: false }
  return { valid: true, challenge }
}
