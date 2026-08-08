/**
 * Communication Integration Layer (FASE 8B) — Proveedor base de Meta Messaging.
 *
 * Base compartida para los conectores reales de Instagram y Messenger (Graph
 * API de Meta). Ambos comparten el mismo formato de webhook (`entry[].messaging`),
 * los mismos endpoints de envío (`/messages`), los receipts de lectura
 * (`sender_action: mark_seen`) y los indicadores de escritura (typing_on/off).
 *
 * Cada subclase solo define su canal; el resto (HTTP con timeout, mapeo de
 * errores 429/4xx/5xx, verificación de firma `x-hub-signature-256`, health,
 * envío de texto y media por URL, cola de entrantes y simulación) vive aquí.
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

export interface MetaMessagingProviderOptions {
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

export interface MetaMessagingConfig {
  /** Token de acceso del canal (page access token de Messenger o IG). */
  accessToken: string
  /** Id de la cuenta: page id (Messenger) o ig id (Instagram). */
  accountId: string
  appSecret?: string
  verifyToken?: string
  username?: string
  [key: string]: unknown
}

const DEFAULT_VERSION = "v22.0"
const DEFAULT_BASE_URL = "https://graph.facebook.com"
const DEFAULT_TIMEOUT_MS = 15_000

function nowIso(): string {
  return new Date().toISOString()
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

export abstract class MetaMessagingProvider implements CommunicationProvider {
  readonly meta: ProviderMeta
  readonly baseUrl: string
  readonly version: string
  private readonly options: MetaMessagingProviderOptions
  private status: ProviderStatus = "disconnected"
  private connectedAt: string | null = null
  private config: MetaMessagingConfig | null = null
  private pendingInbound: ProviderInboundEvent[] = []
  private lastSyncAt: string | null = null

  constructor(channel: "instagram" | "messenger", options: MetaMessagingProviderOptions = {}) {
    this.options = options
    this.version = options.version ?? DEFAULT_VERSION
    this.baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, "")
    const channelMeta = PROVIDER_CHANNEL_META[channel]
    this.meta = {
      id: channel,
      name: channelMeta.name,
      channel,
      version: `${this.version} (Meta ${channelMeta.name})`,
    }
  }

  get channel(): ProviderChannelType {
    return this.meta.channel
  }

  get configValue(): MetaMessagingConfig | null {
    return this.config
  }

  get isConnected(): boolean {
    return this.status === "connected"
  }

  get queuedInbound(): number {
    return this.pendingInbound.length
  }

  private get errorDomain(): "INSTAGRAM" | "MESSENGER" {
    return this.meta.channel === "instagram" ? "INSTAGRAM" : "MESSENGER"
  }

  private get channelLabel(): string {
    return this.meta.channel === "instagram" ? "Instagram" : "Messenger"
  }

  private requireConfig(): MetaMessagingConfig {
    if (!this.config) {
      throw serviceError(`${this.channelLabel} no está conectado`, 502, `${this.errorDomain}_NOT_CONNECTED`)
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
        throw serviceError(
          `Tiempo de espera agotado en la API de ${this.channelLabel}`,
          504,
          `${this.errorDomain}_TIMEOUT`,
        )
      }
      throw serviceError(
        `No se pudo contactar la API de ${this.channelLabel}: ${errorMessage(error)}`,
        502,
        `${this.errorDomain}_NETWORK`,
      )
    } finally {
      clearTimeout(timeout)
    }
  }

  /** Mapea errores HTTP de la Graph API a `serviceError` con código de dominio. */
  private toProviderError(status: number, body: string, context: string): Error {
    const prefix = this.errorDomain
    const label = this.channelLabel
    let message = `${label} API ${context} (HTTP ${status})`
    let code = `${prefix}_API_ERROR`
    try {
      const parsed = JSON.parse(body) as { error?: { message?: string; code?: number } }
      if (parsed.error?.message) message = parsed.error.message
      if (parsed.error?.code) code = `${prefix}_${parsed.error.code}`
    } catch {
      // body no-JSON: se mantiene el mensaje genérico
    }
    if (status === 401) return serviceError(`Credenciales de ${label} inválidas o expiradas`, 401, `${prefix}_UNAUTHORIZED`)
    if (status === 403) return serviceError(`Permiso denegado por ${label}`, 403, `${prefix}_FORBIDDEN`)
    if (status === 404) return serviceError(`Recurso de ${label} no encontrado (verifica el account id)`, 404, `${prefix}_NOT_FOUND`)
    if (status === 429) return serviceError(`Límite de mensajes de ${label} alcanzado (rate limit)`, 429, `${prefix}_RATE_LIMITED`)
    if (status >= 500) return serviceError(message, 502, code)
    return serviceError(message, status, code)
  }

  // ── Endpoints específicos del canal ───────────────────────────────────────

  /** Path de envío de la cuenta conectada. */
  private sendPath(config: MetaMessagingConfig): string {
    return this.meta.channel === "instagram" ? `${config.accountId}/messages` : "me/messages"
  }

  /** Path de salud de la cuenta conectada. */
  private healthPath(config: MetaMessagingConfig): string {
    return this.meta.channel === "instagram"
      ? `${config.accountId}?fields=id,name,username,profile_picture_url`
      : "me?fields=id,name"
  }

  // ── Conexión ─────────────────────────────────────────────────────────────

  async connect(config: Record<string, unknown> = {}): Promise<ProviderConnectionResult> {
    const accessToken = typeof config.accessToken === "string" ? config.accessToken.trim() : ""
    const accountId = typeof config.accountId === "string" ? config.accountId.trim() : ""
    if (!accessToken || !accountId) {
      throw serviceError(
        `Faltan credenciales de ${this.channelLabel} (accessToken y accountId son obligatorios)`,
        400,
        `${this.errorDomain}_INVALID_CONFIG`,
      )
    }
    this.config = {
      accessToken,
      accountId,
      appSecret: typeof config.appSecret === "string" ? config.appSecret : this.options.appSecret,
      verifyToken: typeof config.verifyToken === "string" ? config.verifyToken : undefined,
      username: typeof config.username === "string" ? config.username : undefined,
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
      throw serviceError(`Falta el destinatario del mensaje`, 400, `${this.errorDomain}_MISSING_RECIPIENT`)
    }
    const startedAt = Date.now()

    const payload = this.buildOutboundPayload(input.text, input.attachments ?? [], input.recipient)
    const { status, body } = await this.request(this.sendPath(config), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.accessToken}`,
      },
      body: JSON.stringify(payload),
    })
    if (status < 200 || status >= 300) {
      throw this.toProviderError(status, body, `envío (to=${input.recipient})`)
    }
    let externalMessageId = `mid.${Date.now().toString(36)}`
    try {
      const parsed = JSON.parse(body) as { message_id?: string }
      if (parsed.message_id) externalMessageId = parsed.message_id
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
    recipient: string,
  ): Record<string, unknown> {
    const base: Record<string, unknown> = { recipient: { id: recipient } }
    if (this.meta.channel === "messenger") base.messaging_type = "RESPONSE"

    const attachment = attachments[0]
    if (attachment && attachment.url) {
      base.message = {
        attachment: {
          type: this.mediaTypeKey(attachment.type),
          payload: { url: attachment.url },
        },
      }
      return base
    }
    base.message = { text: (text ?? "").slice(0, 2000) }
    return base
  }

  private mediaTypeKey(type: string): string {
    const t = (type ?? "file").toLowerCase()
    if (["image", "audio", "video", "file"].includes(t)) return t
    return "file"
  }

  // ── Media ─────────────────────────────────────────────────────────────────

  async downloadMedia(mediaId: string): Promise<ProviderAttachment> {
    if (!mediaId) throw serviceError(`Falta el id del media`, 400, `${this.errorDomain}_MISSING_MEDIA_ID`)
    // Meta messaging entrega los adjuntos con su URL dentro del webhook; no
    // existe un endpoint de descarga por id. La ruta de media usa la URL
    // almacenada con el mensaje y cae al placeholder amigable si falta.
    return { type: "file", url: "", mediaId }
  }

  async uploadMedia(attachment: ProviderAttachment): Promise<ProviderAttachment> {
    if (!attachment.url) {
      throw serviceError(`Para adjuntar media se requiere una URL accesible`, 400, `${this.errorDomain}_MEDIA_URL_REQUIRED`)
    }
    return { ...attachment, mediaId: attachment.mediaId ?? attachment.url }
  }

  // ── Acciones ──────────────────────────────────────────────────────────────

  async markAsRead(conversationId: string, messageId: string): Promise<void> {
    void messageId
    const config = this.requireConfig()
    if (!conversationId) return
    const { status, body } = await this.request(this.sendPath(config), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.accessToken}`,
      },
      body: JSON.stringify({ recipient: { id: conversationId }, sender_action: "mark_seen" }),
    })
    if (status < 200 || status >= 300) {
      throw this.toProviderError(status, body, `marcado como leído`)
    }
  }

  async typing(conversationId: string, typing: boolean): Promise<void> {
    const config = this.requireConfig()
    if (!conversationId) return
    const { status, body } = await this.request(this.sendPath(config), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.accessToken}`,
      },
      body: JSON.stringify({
        recipient: { id: conversationId },
        sender_action: typing ? "typing_on" : "typing_off",
      }),
    })
    if (status < 200 || status >= 300) {
      throw this.toProviderError(status, body, `indicador de escritura`)
    }
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
      const { status, body } = await this.request(this.healthPath(this.config), {
        headers: { Authorization: `Bearer ${this.config.accessToken}` },
      })
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
      const parsed = JSON.parse(body) as { name?: string }
      if (typeof parsed.name === "string" && parsed.name) {
        this.config.username = parsed.name
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
          `Falta el App Secret de ${this.channelLabel}: imposible verificar la firma del webhook`,
          500,
          `${this.errorDomain}_MISSING_APP_SECRET`,
        )
      }
      if (!verifyWebhookSignature(appSecret, rawBody, signature)) {
        throw serviceError(`Firma de webhook de ${this.channelLabel} inválida`, 401, `${this.errorDomain}_INVALID_SIGNATURE`)
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
      recipient: this.config?.accountId ?? "",
      text: input.text,
      metadata: { webhook: "meta", simulated: true, channel: this.meta.channel },
    })
    this.pendingInbound.push(event)
    return event
  }

  /** Útil para tests: fuerza el estado interno sin red. */
  setConnectedForTest(config?: Partial<MetaMessagingConfig>): void {
    this.config = {
      accessToken: config?.accessToken ?? "test-access-token",
      accountId: config?.accountId ?? "test-account-id",
      appSecret: config?.appSecret ?? this.options.appSecret,
      verifyToken: config?.verifyToken ?? this.options.verifyToken,
      username: config?.username,
    }
    this.status = "connected"
    this.connectedAt = nowIso()
  }
}
