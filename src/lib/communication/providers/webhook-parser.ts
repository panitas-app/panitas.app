/**
 * Communication Integration Layer (FASE 7C) — Parser de webhooks.
 *
 * Convierte payloads de webhooks de mensajería al modelo unificado. Soporta
 * dos formatos comunes:
 *
 *  - **Genérico** (válido para los providers mock):
 *    `{ conversationId, text, sender?, externalMessageId?, attachments? }`
 *    o `{ messages: [...] }`.
 *  - **Meta Messenger format** (WhatsApp/Instagram/Messenger):
 *    `{ entry: [{ messaging: [{ sender, recipient, timestamp, message: { mid, text, attachments } }] }] }`.
 */
import type {
  ProviderAttachment,
  ProviderInboundEvent,
  ProviderSender,
  ProviderWebhookPayload,
} from "../provider-types"
import { normalizeInboundEvent } from "../middlewares/normalization"

function toAttachments(raw: unknown): ProviderAttachment[] {
  if (!Array.isArray(raw)) return []
  const result: ProviderAttachment[] = []
  for (const item of raw) {
    if (typeof item !== "object" || item === null) continue
    const a = item as Record<string, unknown>
    const url = typeof a.url === "string" ? a.url : ""
    if (!url) continue
    result.push({
      type: typeof a.type === "string" ? a.type : "file",
      url,
      name: typeof a.name === "string" ? a.name : undefined,
      size: typeof a.size === "number" ? a.size : undefined,
      mediaId: typeof a.media_id === "string" ? a.media_id : undefined,
    })
  }
  return result
}

function senderOf(raw: unknown): ProviderSender | undefined {
  const value = typeof raw === "string" ? raw : (raw as { sender?: unknown } | null)?.sender
  if (value === "agent" || value === "system") return value
  return "customer"
}

function fromGeneric(payload: ProviderWebhookPayload): ProviderInboundEvent[] {
  const body = typeof payload.body === "string" ? safeParse(payload.body) : payload.body
  if (!body || typeof body !== "object") return []
  const record = body as Record<string, unknown>

  const list = Array.isArray(record.messages)
    ? (record.messages as Record<string, unknown>[])
    : Array.isArray(record.entries)
      ? (record.entries as Record<string, unknown>[])
      : [record]

  const events: ProviderInboundEvent[] = []
  for (const item of list) {
    const conversationId = typeof item.conversationId === "string" ? item.conversationId : ""
    if (!conversationId) continue
    events.push(
      normalizeInboundEvent({
        providerId: payload.providerId,
        channel: payload.channel,
        conversationId,
        sender: senderOf(item.sender),
        recipient: typeof item.recipient === "string" ? item.recipient : `cid:${conversationId}`,
        text: typeof item.text === "string" ? item.text : "",
        attachments: toAttachments(item.attachments),
        externalMessageId: typeof item.externalMessageId === "string" ? item.externalMessageId : undefined,
        metadata: { webhook: "generic" },
      }),
    )
  }
  return events
}

function fromMetaMessaging(payload: ProviderWebhookPayload): ProviderInboundEvent[] {
  const body = typeof payload.body === "string" ? safeParse(payload.body) : payload.body
  if (!body || typeof body !== "object") return []
  const root = body as { entry?: unknown }
  if (!Array.isArray(root.entry)) return []

  const events: ProviderInboundEvent[] = []
  for (const entry of root.entry) {
    const entryObj = entry as { id?: string; messaging?: unknown }
    if (!Array.isArray(entryObj.messaging)) continue
    for (const m of entryObj.messaging) {
      const messaging = m as {
        sender?: { id?: string }
        recipient?: { id?: string }
        timestamp?: number | string
        message?: { mid?: string; text?: string; attachments?: unknown }
      }
      const conversationId = messaging.sender?.id ?? entryObj.id ?? ""
      if (!conversationId) continue
      events.push(
        normalizeInboundEvent({
          providerId: payload.providerId,
          channel: payload.channel,
          conversationId,
          sender: "customer",
          recipient: messaging.recipient?.id ?? "",
          text: messaging.message?.text ?? "",
          attachments: toAttachments(messaging.message?.attachments),
          externalMessageId: messaging.message?.mid,
          metadata: { webhook: "meta", timestamp: messaging.timestamp },
        }),
      )
    }
  }
  return events
}

function safeParse(raw: string): unknown {
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

/** Parsea un payload de webhook al modelo unificado (detecta el formato). */
export function parseWebhookPayload(payload: ProviderWebhookPayload): ProviderInboundEvent[] {
  const meta = fromMetaMessaging(payload)
  if (meta.length > 0) return meta
  return fromGeneric(payload)
}
