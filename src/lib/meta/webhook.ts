/**
 * Instagram + Messenger (FASE 8B) — Utilidades de webhook.
 *
 * Helpers para procesar payloads de la Graph API de Meta en las rutas de
 * webhook: extracción del id de cuenta (`entry[].id`, page id de Messenger o ig
 * id de Instagram) que resuelve el negocio/tienda, y verificación del handshake
 * GET de suscripción.
 */

/** Extrae el id de cuenta (`entry[].id`) de un payload de webhook de Meta messaging. */
export function extractMetaPageId(body: unknown): string {
  if (!body || typeof body !== "object") return ""
  const root = body as { entry?: unknown }
  if (!Array.isArray(root.entry)) return ""
  for (const entry of root.entry) {
    const id = (entry as { id?: unknown })?.id
    if (typeof id === "string" && id) return id
  }
  return ""
}

/** Resultado del handshake GET de suscripción de webhooks. */
export interface MetaWebhookVerifyResult {
  valid: boolean
  challenge?: string
}

/**
 * Valida el handshake de suscripción de Meta:
 * `hub.mode=subscribe&hub.verify_token=<token>&hub.challenge=<challenge>`.
 * El challenge se devuelve SOLO si el verify token coincide.
 */
export function verifyMetaWebhook(params: URLSearchParams, expectedToken: string): MetaWebhookVerifyResult {
  if (params.get("hub.mode") !== "subscribe") return { valid: false }
  const token = params.get("hub.verify_token") ?? ""
  const challenge = params.get("hub.challenge") ?? ""
  if (!challenge) return { valid: false }
  if (!expectedToken || token !== expectedToken) return { valid: false }
  return { valid: true, challenge }
}
