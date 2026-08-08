/**
 * Communication Integration Layer (FASE 8A) — Proveedor real de WhatsApp Cloud API.
 *
 * Conector real contra la Graph API de Meta (Meta WhatsApp Cloud API). Implementa
 * `CommunicationProvider` con:
 *
 *  - conexión/desconexión multi-tenant (config por conexión: accessToken, phoneNumberId),
 *  - envío de mensajes de texto y media,
 *  - descarga/subida de media,
 *  - marcas de leído (read receipts),
 *  - salud real (consulta al número de teléfono de la WABA),
 *  - webhooks con verificación de firma `x-hub-signature-256` (HMAC SHA-256, App Secret),
 *  - queue de mensajes entrantes para pull y simulación (tests/demo).
 *
 * Cuando no hay credenciales configuradas, la capa usa el proveedor mock
 * (config-gated); este conector se activa solo con una conexión válida en BD.
 */
import { serviceError } from "@/services/errors"
import {
  PROVIDER_CHANNEL_META,
  type ProviderAttachment,
  type ProviderChannelType,
  type ProviderConnectionResult,
  type ProviderHealth,
  type ProviderInboundEvent,
  type ProviderMeta,
  type ProviderOutboundInput,
  type ProviderSender,
  type ProviderSendResult,
  type ProviderStatus,
  type ProviderWebhookPayload,
} from "../provider-types"
import { normalizeInboundEvent } from "../middlewares/normalization"
import { sanitizeProviderConfig, verifyWebhookSignature } from "../security"
import { parseWebhookPayload } from "./webhook-parser"
import type { CommunicationProvider } from "../interfaces/communication-provider"

export interface WhatsAppProviderOptions {
  /** Versión de la Graph API (por defecto v22.0). */
  version?: string
  /** Base URL de la Graph API. */
  baseUrl?: string
  /** App Secret de la Meta App (verificación de firmas de webhook). */
  appSecret?: string
  /** Verify token global (handshake de webhooks). */
  verifyToken?: string
  /** Si true (por defecto), el webhook exige firma válida. */
  requireSignature?: boolean
  /** Timeout de red (ms) por llamada a la API. */
  timeoutMs?: number
}

export interface WhatsAppConnectionConfig {
  accessToken: string
  phoneNumberId: string
  wabaId?: string
  verifyToken?: string
  appSecret?: string
  [key: string]: unknown
}

const DEFAULT_VERSION = "v22.0"
const DEFAULT_BASE_URL = "https://graph.facebook.com"
const DEFAULT_TIMEOUT_MS = 15_000

/** Normaliza un número de teléfono a formato E.164 sin `+` (solo dígitos). */
export function normalizeWhatsAppPhone(phone: string): string {
  const digits = (phone ?? "").replace(/[^\d]/g, "")
  return digits.length > 15 ? digits.slice(0, 15) : digits
}

function nowIso(): string {
  return new Date().toISOString()
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/** Mapea errores HTTP de la Graph API a `serviceError` con código de dominio. */
function toProviderError(status: number, body: string, context: string): Error {
  let message = `WhatsApp API ${context} (HTTP ${status})`
  let code = "WHATSAPP_API_ERROR"
  try {
    const parsed = JSON.parse(body) as { error?: { message?: string; code?: number } }
    if (parsed.error?.message) message = parsed.error.message
    if (parsed.error?.code) code = `WHATSAPP_${parsed.error.code}`
  } catch {
    // body no-JSON: se mantiene el mensaje genérico
  }
  if (status === 401) return serviceError("Credenciales de WhatsApp inválidas o expiradas", 401, "WHATSAPP_UNAUTHORIZED")
  if (status === 403) return serviceError("Permiso denegado por WhatsApp", 403, "WHATSAPP_FORBIDDEN")
  if (status === 404) return serviceError("Recurso de WhatsApp no encontrado (verifica el phone_number_id)", 404, "WHATSAPP_NOT_FOUND")
  if (status === 429) return serviceError("Límite de mensajes de WhatsApp alcanzado (rate limit)", 429, "WHATSAPP_RATE_LIMITED")
  if (status >= 500) return serviceError(message, 502, code)
  return serviceError(message, status, code)
}

export class WhatsAppProvider implements CommunicationProvider {
  readonly meta: ProviderMeta
  readonly baseUrl: string
  readonly version: string
  private readonly options: WhatsAppProviderOptions
  private status: ProviderStatus = "disconnected"
  private connectedAt: string | null = null
  private config: WhatsAppConnectionConfig | null = null
  private pendingInbound: ProviderInboundEvent[] = []
  private lastSyncAt: string | null = null

  constructor(options: WhatsAppProviderOptions = {}) {
    this.options = options
    this.version = options.version ?? DEFAULT_VERSION
    this.baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, "")
    this.meta = {
      id: "whatsapp",
      name: PROVIDER_CHANNEL_META.whatsapp.name,
      channel: "whatsapp",
      version: `${this.version} (Meta WhatsApp Cloud API)`,
    }
  }

  get channel(): ProviderChannelType {
    return this.meta.channel
  }

  get configValue(): WhatsAppConnectionConfig | null {
    return this.config
  }

  get isConnected(): boolean {
    return this.status === "connected"
  }

  get queuedInbound(): number {
    return this.pendingInbound.length
  }

  private requireConfig(): WhatsAppConnectionConfig {
    if (!this.config) {
      throw serviceError("WhatsApp no está conectado", 502, "WHATSAPP_NOT_CONNECTED")
    }
    return this.config
  }

  private async request(path: string, init: RequestInit): Promise<{ status: number; body: string }> {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), this.options.timeoutMs ?? DEFAULT_TIMEOUT_MS)
    try {
      const response = await fetch(`${this.baseUrl}/${this.version}/${path}`, {
        ...init,
        signal: controller.signal,
      })
      const body = await response.text()
      return { status: response.status, body }
    } catch (error: unknown) {
      if (error instanceof Error && error.name === "AbortError") {
        throw serviceError("Tiempo de espera agotado en la API de WhatsApp", 504, "WHATSAPP_TIMEOUT")
      }
      throw serviceError(`No se pudo contactar la API de WhatsApp: ${errorMessage(error)}`, 502, "WHATSAPP_NETWORK")
    } finally {
      clearTimeout(timeout)
    }
  }

  // ── Conexión ─────────────────────────────────────────────────────────────

  async connect(config: Record<string, unknown> = {}): Promise<ProviderConnectionResult> {
    const accessToken = typeof config.accessToken === "string" ? config.accessToken.trim() : ""
    const phoneNumberId = typeof config.phoneNumberId === "string" ? config.phoneNumberId.trim() : ""
    if (!accessToken || !phoneNumberId) {
      throw serviceError(
        "Faltan credenciales de WhatsApp (accessToken y phoneNumberId son obligatorios)",
        400,
        "WHATSAPP_INVALID_CONFIG",
      )
    }
    this.config = {
      accessToken,
      phoneNumberId,
      wabaId: typeof config.wabaId === "string" ? config.wabaId : undefined,
      verifyToken: typeof config.verifyToken === "string" ? config.verifyToken : undefined,
      appSecret: typeof config.appSecret === "string" ? config.appSecret : this.options.appSecret,
    }
    this.status = "connected"
    this.connectedAt = nowIso()
    return {
      providerId: this.meta.id,
      channel: this.meta.channel,
      status: "connected",
      connectedAt: this.connectedAt,
      info: sanitizeProviderConfig(this.config),
    }
  }

  async disconnect(): Promise<void> {
    this.status = "disconnected"
    this.connectedAt = null
    this.config = null
  }

  // ── Envío ─────────────────────────────────────────────────────────────────

  async sendMessage(input: ProviderOutboundInput): Promise<ProviderSendResult> {
    const config = this.requireConfig()
    if (!input.recipient.trim()) {
      throw serviceError("Falta el destinatario del mensaje", 400, "WHATSAPP_MISSING_RECIPIENT")
    }
    const startedAt = Date.now()
    const to = normalizeWhatsAppPhone(input.recipient)
    if (!to) throw serviceError("Número de teléfono inválido", 400, "WHATSAPP_INVALID_PHONE")

    const payload = this.buildOutboundPayload(input.text, input.attachments ?? [], to)
    const { status, body } = await this.request(`${config.phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.accessToken}`,
      },
      body: JSON.stringify(payload),
    })
    if (status < 200 || status >= 300) {
      throw toProviderError(status, body, `envío (to=${to})`)
    }
    let externalMessageId = `wamid.${Date.now().toString(36)}`
    try {
      const parsed = JSON.parse(body) as { messages?: Array<{ id?: string }> }
      if (parsed.messages?.[0]?.id) externalMessageId = parsed.messages[0].id
    } catch {
      // se mantiene el id generado
    }
    return {
      providerId: this.meta.id,
      channel: this.meta.channel,
      externalMessageId,
      status: "sent",
      latencyMs: Date.now() - startedAt,
      retries: 0,
    }
  }

  private buildOutboundPayload(
    text: string,
    attachments: ProviderAttachment[],
    to: string,
  ): Record<string, unknown> {
    const base: Record<string, unknown> = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
    }
    const attachment = attachments[0]
    if (attachment && (attachment.mediaId || attachment.url)) {
      const mediaKey = this.mediaTypeKey(attachment.type)
      base.type = mediaKey
      const media = attachment.mediaId ? { id: attachment.mediaId } : { link: attachment.url }
      if (mediaKey === "document" && attachment.name) {
        base.document = { ...media, filename: attachment.name }
      } else {
        base[mediaKey] = media
      }
      return base
    }
    base.type = "text"
    base.text = { body: (text ?? "").slice(0, 4096), preview_url: false }
    return base
  }

  private mediaTypeKey(type: string): string {
    const t = (type ?? "file").toLowerCase()
    if (["image", "audio", "document", "video", "sticker"].includes(t)) return t
    return "document"
  }

  // ── Media ─────────────────────────────────────────────────────────────────

  async downloadMedia(mediaId: string): Promise<ProviderAttachment> {
    const config = this.requireConfig()
    if (!mediaId) throw serviceError("Falta el id del media", 400, "WHATSAPP_MISSING_MEDIA_ID")
    const { status, body } = await this.request(mediaId, {
      headers: { Authorization: `Bearer ${config.accessToken}` },
    })
    if (status < 200 || status >= 300) {
      throw toProviderError(status, body, `descarga de media (${mediaId})`)
    }
    const parsed = JSON.parse(body) as {
      url?: string
      mime_type?: string
      file_size?: number
      id?: string
      filename?: string
    }
    return {
      type: parsed.mime_type ?? "file",
      url: parsed.url ?? "",
      name: parsed.filename,
      size: parsed.file_size,
      mediaId: parsed.id ?? mediaId,
    }
  }

  async uploadMedia(attachment: ProviderAttachment): Promise<ProviderAttachment> {
    const config = this.requireConfig()
    if (!attachment.url) {
      throw serviceError("Para subir media se requiere una URL accesible", 400, "WHATSAPP_MEDIA_URL_REQUIRED")
    }
    const { status, body } = await this.request(`${config.phoneNumberId}/media`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.accessToken}`,
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        type: this.mediaTypeKey(attachment.type),
        link: attachment.url,
      }),
    })
    if (status < 200 || status >= 300) {
      throw toProviderError(status, body, `subida de media`)
    }
    let mediaId = attachment.mediaId ?? `media-${Date.now().toString(36)}`
    try {
      const parsed = JSON.parse(body) as { id?: string }
      if (parsed.id) mediaId = parsed.id
    } catch {
      // se mantiene el id generado
    }
    return { ...attachment, mediaId }
  }

  // ── Acciones ──────────────────────────────────────────────────────────────

  async markAsRead(conversationId: string, messageId: string): Promise<void> {
    void conversationId
    const config = this.requireConfig()
    if (!messageId) return
    const { status, body } = await this.request(`${config.phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.accessToken}`,
      },
      body: JSON.stringify({ messaging_product: "whatsapp", status: "read", message_id: messageId }),
    })
    if (status < 200 || status >= 300) {
      throw toProviderError(status, body, `marcado como leído`)
    }
  }

  async typing(): Promise<void> {
    // WhatsApp Cloud API no expone indicadores de escritura; no-op intencional.
  }

  // ── Salud ─────────────────────────────────────────────────────────────────

  async health(): Promise<ProviderHealth> {
    const startedAt = Date.now()
    if (!this.config) {
      return {
        providerId: this.meta.id,
        channel: this.meta.channel,
        status: this.status,
        connected: false,
        latencyMs: null,
        lastSyncAt: this.lastSyncAt,
        error: "Sin configuración de conexión",
        checkedAt: nowIso(),
      }
    }
    try {
      const { status, body } = await this.request(
        `${this.config.phoneNumberId}?fields=display_phone_number,verified_name,quality_rating,code_verification_status`,
        { headers: { Authorization: `Bearer ${this.config.accessToken}` } },
      )
      this.lastSyncAt = nowIso()
      if (status < 200 || status >= 300) {
        this.status = "error"
        return {
          providerId: this.meta.id,
          channel: this.meta.channel,
          status: "error",
          connected: false,
          latencyMs: Date.now() - startedAt,
          lastSyncAt: this.lastSyncAt,
          error: `API respondió HTTP ${status}`,
          checkedAt: nowIso(),
        }
      }
      this.status = "connected"
      return {
        providerId: this.meta.id,
        channel: this.meta.channel,
        status: "connected",
        connected: true,
        latencyMs: Date.now() - startedAt,
        lastSyncAt: this.lastSyncAt,
        checkedAt: nowIso(),
      }
    } catch (error: unknown) {
      this.lastSyncAt = nowIso()
      this.status = "error"
      return {
        providerId: this.meta.id,
        channel: this.meta.channel,
        status: "error",
        connected: false,
        latencyMs: Date.now() - startedAt,
        lastSyncAt: this.lastSyncAt,
        error: errorMessage(error),
        checkedAt: nowIso(),
      }
    }
  }

  // ── Webhook / entrada ─────────────────────────────────────────────────────

  async webhook(payload: ProviderWebhookPayload): Promise<ProviderInboundEvent[]> {
    const config = this.requireConfig()
    const signature =
      payload.headers["x-hub-signature-256"] ?? payload.headers["x-signature"] ?? null
    const rawBody = typeof payload.body === "string" ? payload.body : JSON.stringify(payload.body)
    const requireSignature = this.options.requireSignature ?? true
    if (requireSignature) {
      const appSecret = config.appSecret
      if (!appSecret) {
        throw serviceError(
          "Falta WHATSAPP_APP_SECRET: imposible verificar la firma del webhook",
          500,
          "WHATSAPP_MISSING_APP_SECRET",
        )
      }
      if (!verifyWebhookSignature(appSecret, rawBody, signature)) {
        throw serviceError("Firma de webhook de WhatsApp inválida", 401, "WHATSAPP_INVALID_SIGNATURE")
      }
    }
    const events = parseWebhookPayload({ ...payload, body: rawBody })
    this.lastSyncAt = nowIso()
    this.pendingInbound.push(...events)
    return events
  }

  async receiveMessages(limit?: number): Promise<ProviderInboundEvent[]> {
    const drained = limit ? this.pendingInbound.splice(0, limit) : this.pendingInbound.splice(0)
    this.lastSyncAt = nowIso()
    return drained
  }

  async simulateIncoming(input: {
    conversationId: string
    text: string
    sender?: ProviderSender
  }): Promise<ProviderInboundEvent> {
    const event = normalizeInboundEvent({
      providerId: this.meta.id,
      channel: this.meta.channel,
      conversationId: input.conversationId,
      sender: input.sender ?? "customer",
      recipient: this.config?.phoneNumberId ?? "",
      text: input.text,
      metadata: { webhook: "whatsapp", simulated: true },
    })
    this.pendingInbound.push(event)
    return event
  }

  /** Útil para tests: fuerza el estado interno sin red. */
  setConnectedForTest(config?: Partial<WhatsAppConnectionConfig>): void {
    this.config = {
      accessToken: config?.accessToken ?? "test-access-token",
      phoneNumberId: config?.phoneNumberId ?? "test-phone-id",
      appSecret: config?.appSecret ?? this.options.appSecret,
    }
    this.status = "connected"
    this.connectedAt = nowIso()
  }
}
