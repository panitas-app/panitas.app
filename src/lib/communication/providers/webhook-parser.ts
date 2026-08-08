/**
 * Communication Integration Layer (FASE 7C) — Parser de webhooks.
 *
 * Convierte payloads de webhooks de mensajería al modelo unificado. Soporta
 * tres formatos comunes:
 *
 *  - **Genérico** (válido para los providers mock):
 *    `{ conversationId, text, sender?, externalMessageId?, attachments? }`
 *    o `{ messages: [...] }`.
 *  - **Meta Messenger format** (Instagram/Messenger):
 *    `{ entry: [{ messaging: [{ sender, recipient, timestamp, message: { mid, text, attachments } }] }] }`.
 *  - **WhatsApp Cloud API** (FASE 8A):
 *    `{ object: "whatsapp_business_account", entry: [{ id, changes: [{ field: "messages",
 *      value: { metadata, contacts, messages[], statuses[] } }] }] }`.
 */
import type {
  ProviderAttachment,
  ProviderInboundEvent,
  ProviderSender,
  ProviderStatusUpdate,
  ProviderWebhookPayload,
} from "../provider-types"
import { normalizeInboundEvent } from "../middlewares/normalization"

function toAttachments(raw: unknown): ProviderAttachment[] {
  if (!Array.isArray(raw)) return []
  const result: ProviderAttachment[] = []
  for (const item of raw) {
    if (typeof item !== "object" || item === null) continue
    const a = item as Record<string, unknown>
    const payload =
      a.payload && typeof a.payload === "object" ? (a.payload as Record<string, unknown>) : undefined
    const url =
      (typeof a.url === "string" ? a.url : "") ||
      (typeof payload?.url === "string" ? (payload.url as string) : "")
    if (!url) continue
    result.push({
      type: typeof a.type === "string" ? a.type : "file",
      url,
      name: typeof a.name === "string" ? a.name : undefined,
      size:
        typeof a.size === "number"
          ? a.size
          : typeof payload?.size === "number"
            ? (payload.size as number)
            : undefined,
      mediaId: typeof a.media_id === "string" ? a.media_id : (typeof a.id === "string" ? a.id : undefined),
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

interface MetaMessaging {
  sender?: { id?: string }
  recipient?: { id?: string }
  timestamp?: number | string
  message?: { mid?: string; text?: string; attachments?: unknown; is_echo?: boolean }
  delivery?: { mids?: unknown; message_ids?: unknown; watermark?: number | string }
  read?: { watermark?: number | string }
}

/** Timestamps de Meta messaging vienen en milisegundos (a diferencia de WhatsApp en segundos). */
function metaTimestampIso(value: number | string | undefined): string {
  const num = Number(value)
  if (Number.isFinite(num) && num > 0) return new Date(num).toISOString()
  return new Date().toISOString()
}

function metaDeliveredMids(delivery: NonNullable<MetaMessaging["delivery"]>): string[] {
  const mids = Array.isArray(delivery.mids)
    ? delivery.mids
    : Array.isArray(delivery.message_ids)
      ? delivery.message_ids
      : []
  return mids.filter((mid): mid is string => typeof mid === "string" && mid.length > 0)
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
      const messaging = m as MetaMessaging
      const conversationId = messaging.sender?.id ?? entryObj.id ?? ""
      if (!conversationId) continue

      const message = messaging.message
      if (message && message.is_echo === true) continue
      if (message && (message.mid || message.text || message.attachments)) {
        events.push(
          normalizeInboundEvent({
            providerId: payload.providerId,
            channel: payload.channel,
            conversationId,
            sender: "customer",
            recipient: messaging.recipient?.id ?? "",
            text: message.text ?? "",
            attachments: toAttachments(message.attachments),
            externalMessageId: message.mid,
            metadata: {
              webhook: "meta",
              channel: payload.channel,
              timestamp: messaging.timestamp,
            },
          }),
        )
      }

      if (messaging.delivery) {
        for (const mid of metaDeliveredMids(messaging.delivery)) {
          events.push(
            normalizeInboundEvent({
              providerId: payload.providerId,
              channel: payload.channel,
              conversationId,
              recipient: messaging.recipient?.id ?? "",
              text: "",
              metadata: { webhook: "meta", channel: payload.channel, status: true, delivery: true },
              statusUpdate: {
                type: "delivered",
                externalMessageId: mid,
                timestamp: metaTimestampIso(messaging.delivery.watermark),
              },
            }),
          )
        }
      }

      if (messaging.read) {
        const watermark = messaging.read.watermark
        const watermarkKey =
          typeof watermark === "string" || typeof watermark === "number" ? String(watermark) : ""
        events.push(
          normalizeInboundEvent({
            providerId: payload.providerId,
            channel: payload.channel,
            conversationId,
            recipient: messaging.recipient?.id ?? "",
            text: "",
            metadata: { webhook: "meta", channel: payload.channel, status: true, readWatermark: watermarkKey },
            statusUpdate: {
              type: "read",
              externalMessageId: watermarkKey,
              timestamp: metaTimestampIso(watermark),
            },
          }),
        )
      }
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

// ─── WhatsApp Cloud API (FASE 8A) ───────────────────────────────────────────

interface WaValue {
  metadata?: { phone_number_id?: string; display_phone_number?: string }
  contacts?: Array<{ profile?: { name?: string }; wa_id?: string }>
  messages?: Array<{
    id?: string
    from?: string
    timestamp?: string | number
    type?: string
    text?: { body?: string }
    caption?: string
    context?: { id?: string }
    image?: Record<string, unknown>
    audio?: Record<string, unknown>
    document?: Record<string, unknown>
    video?: Record<string, unknown>
    sticker?: Record<string, unknown>
  }>
  statuses?: Array<{
    id?: string
    status?: string
    timestamp?: string | number
    errors?: Array<{ code?: number; title?: string; message?: string }>
  }>
}

type WaMessage = NonNullable<WaValue["messages"]>[number]
type WaStatus = NonNullable<WaValue["statuses"]>[number]

function mediaOf(m: WaMessage): Record<string, unknown> | null {
  for (const key of ["image", "audio", "document", "video", "sticker"] as const) {
    const media = m[key]
    if (media && typeof media === "object") return media
  }
  return null
}

function waAttachments(m: WaMessage): ProviderAttachment[] {
  const media = mediaOf(m)
  if (!media) return []
  return [
    {
      type: m.type ?? "file",
      url: "",
      name: (media.filename as string | undefined) ?? (m.caption as string | undefined),
      size: typeof media.file_size === "number" ? (media.file_size as number) : undefined,
      mediaId: media.id as string | undefined,
    },
  ]
}

function waTimestamp(ts: string | number | undefined): string {
  const value = Number(ts)
  if (!Number.isFinite(value) || value <= 0) return new Date().toISOString()
  return new Date(value * 1000).toISOString()
}

/** Convierte `value.messages[]` y `value.statuses[]` al modelo unificado. */
export function parseWhatsAppCloudValue(value: WaValue, payload: ProviderWebhookPayload): ProviderInboundEvent[] {
  const events: ProviderInboundEvent[] = []
  const phoneNumberId = value.metadata?.phone_number_id ?? ""
  const profileName = value.contacts?.[0]?.profile?.name

  for (const msg of value.messages ?? []) {
    const from = msg.from ?? ""
    if (!from) continue
    const text = msg.type === "text" ? (msg.text?.body ?? "") : (msg.caption ?? "")
    const attachments = waAttachments(msg)
    events.push(
      normalizeInboundEvent({
        providerId: payload.providerId,
        channel: payload.channel,
        conversationId: from,
        sender: "customer",
        recipient: phoneNumberId,
        text,
        attachments,
        externalMessageId: msg.id,
        metadata: {
          webhook: "whatsapp",
          phoneNumberId,
          displayPhoneNumber: value.metadata?.display_phone_number,
          waId: from,
          profileName: profileName ?? null,
          messageType: msg.type,
          replyTo: msg.context?.id ?? null,
          timestamp: waTimestamp(msg.timestamp),
        },
      }),
    )
  }

  for (const status of value.statuses ?? []) {
    const externalMessageId = status.id
    if (!externalMessageId) continue
    const type =
      status.status === "read" || status.status === "delivered" || status.status === "failed"
        ? (status.status as ProviderStatusUpdate["type"])
        : null
    if (!type) continue
    const statusUpdate: ProviderStatusUpdate = {
      type,
      externalMessageId,
      timestamp: waTimestamp(status.timestamp),
      error: status.errors?.[0]?.message ?? undefined,
    }
    events.push(
      normalizeInboundEvent({
        providerId: payload.providerId,
        channel: payload.channel,
        conversationId: "",
        recipient: phoneNumberId,
        text: "",
        metadata: { webhook: "whatsapp", status: true, phoneNumberId },
        statusUpdate,
      }),
    )
  }

  return events
}

function fromWhatsAppCloud(payload: ProviderWebhookPayload): ProviderInboundEvent[] {
  const body = typeof payload.body === "string" ? safeParse(payload.body) : payload.body
  if (!body || typeof body !== "object") return []
  const root = body as { object?: string; entry?: unknown }
  if (root.object !== "whatsapp_business_account" || !Array.isArray(root.entry)) return []

  const events: ProviderInboundEvent[] = []
  for (const entry of root.entry) {
    const entryObj = entry as { id?: string; changes?: unknown }
    if (!Array.isArray(entryObj.changes)) continue
    for (const change of entryObj.changes) {
      const changeObj = change as { field?: string; value?: WaValue }
      if (changeObj.field !== "messages" || !changeObj.value || typeof changeObj.value !== "object") continue
      events.push(...parseWhatsAppCloudValue(changeObj.value, payload))
    }
  }
  return events
}

/** Parsea un payload de webhook al modelo unificado (detecta el formato). */
export function parseWebhookPayload(payload: ProviderWebhookPayload): ProviderInboundEvent[] {
  const whatsapp = fromWhatsAppCloud(payload)
  if (whatsapp.length > 0) return whatsapp
  const meta = fromMetaMessaging(payload)
  if (meta.length > 0) return meta
  return fromGeneric(payload)
}
