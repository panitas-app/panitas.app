/**
 * Communication Integration Layer (FASE 7C) — Proveedor mock.
 *
 * Implementación de `CommunicationProvider` SIN conexiones reales: simula
 * conexión/desconexión, envío (con latencia y tasa de fallo configurables),
 * health, webhooks con verificación de firma HMAC y pull de mensajes. Se usa
 * como conector por defecto hasta que existan conectores reales, y como base
 * de los tests de la capa.
 */
import { serviceError } from "@/services/errors"
import {
  PROVIDER_CHANNEL_META,
  type ProviderAttachment,
  type ProviderChannelType,
  type ProviderConnectionResult,
  type ProviderHealth,
  type ProviderInboundEvent,
  type ProviderMessageStatus,
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

export interface MockProviderOptions {
  channel: ProviderChannelType
  id?: string
  name?: string
  version?: string
  /** Latencia simulada de envío en ms. */
  latencyMs?: number
  /** Probabilidad (0..1) de fallo simulado en envío. */
  failRate?: number
  /** Si true, el envío exige estar conectado (502 si no). */
  requireConnected?: boolean
  /** Secreto para verificar firmas de webhook. */
  webhookSecret?: string
}

function tick(ms: number): Promise<void> {
  return ms > 0 ? new Promise((resolve) => setTimeout(resolve, ms)) : Promise.resolve()
}

function nowIso(): string {
  return new Date().toISOString()
}

export class MockCommunicationProvider implements CommunicationProvider {
  readonly meta: ProviderMeta
  private status: ProviderStatus = "disconnected"
  private connectedAt: string | null = null
  private config: Record<string, unknown> = {}
  private pendingInbound: ProviderInboundEvent[] = []
  private lastSyncAt: string | null = null
  private readonly latencyMs: number
  private readonly failRate: number
  private readonly requireConnected: boolean
  private readonly webhookSecret: string | null
  private sendCounter = 0
  private mediaCounter = 0

  constructor(options: MockProviderOptions) {
    const meta = PROVIDER_CHANNEL_META[options.channel]
    this.meta = {
      id: options.id ?? meta.defaultProviderId,
      name: options.name ?? meta.name,
      channel: options.channel,
      version: options.version ?? "1.0.0-mock",
    }
    this.latencyMs = Math.max(0, options.latencyMs ?? 0)
    this.failRate = Math.min(1, Math.max(0, options.failRate ?? 0))
    this.requireConnected = options.requireConnected ?? false
    this.webhookSecret = options.webhookSecret ?? null
  }

  async connect(config: Record<string, unknown> = {}): Promise<ProviderConnectionResult> {
    this.config = config
    this.status = "connecting"
    await tick(this.latencyMs)
    this.status = "connected"
    this.connectedAt = nowIso()
    return {
      providerId: this.meta.id,
      channel: this.meta.channel,
      status: "connected",
      connectedAt: this.connectedAt,
      info: sanitizeProviderConfig(config),
    }
  }

  async disconnect(): Promise<void> {
    this.status = "disconnected"
    this.connectedAt = null
  }

  async sendMessage(input: ProviderOutboundInput): Promise<ProviderSendResult> {
    void input
    if (this.requireConnected && this.status !== "connected") {
      throw serviceError("El proveedor no está conectado", 502, "PROVIDER_NOT_CONNECTED")
    }
    const startedAt = Date.now()
    await tick(this.latencyMs)
    if (Math.random() < this.failRate) {
      throw serviceError("Fallo simulado del proveedor", 502, "PROVIDER_SIMULATED_FAILURE")
    }
    this.sendCounter += 1
    return {
      providerId: this.meta.id,
      channel: this.meta.channel,
      externalMessageId: `ext-${this.meta.id}-${this.sendCounter}`,
      status: "sent" as ProviderMessageStatus,
      latencyMs: Date.now() - startedAt,
      retries: 0,
    }
  }

  async health(): Promise<ProviderHealth> {
    await tick(Math.min(50, this.latencyMs))
    const connected = this.status === "connected"
    return {
      providerId: this.meta.id,
      channel: this.meta.channel,
      status: this.status,
      connected,
      latencyMs: connected ? this.latencyMs : null,
      lastSyncAt: this.lastSyncAt,
      checkedAt: nowIso(),
    }
  }

  async webhook(payload: ProviderWebhookPayload): Promise<ProviderInboundEvent[]> {
    if (this.webhookSecret) {
      const signature =
        payload.headers["x-hub-signature-256"] ?? payload.headers["x-signature"] ?? null
      const rawBody = typeof payload.body === "string" ? payload.body : JSON.stringify(payload.body)
      if (!verifyWebhookSignature(this.webhookSecret, rawBody, signature)) {
        throw serviceError("Firma de webhook inválida", 401, "INVALID_WEBHOOK_SIGNATURE")
      }
    }
    const events = parseWebhookPayload(payload)
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
      recipient: `cid:${input.conversationId}`,
      text: input.text,
      metadata: { simulated: true },
    })
    this.pendingInbound.push(event)
    return event
  }

  async markAsRead(conversationId: string, messageId: string): Promise<void> {
    void conversationId
    void messageId
    await tick(Math.min(20, this.latencyMs))
  }

  async typing(conversationId: string, typing: boolean): Promise<void> {
    void conversationId
    void typing
    await tick(Math.min(20, this.latencyMs))
  }

  async downloadMedia(mediaId: string): Promise<ProviderAttachment> {
    return { type: "file", url: `mock://media/${mediaId}`, mediaId }
  }

  async uploadMedia(attachment: ProviderAttachment): Promise<ProviderAttachment> {
    this.mediaCounter += 1
    return { ...attachment, mediaId: attachment.mediaId ?? `media-${this.mediaCounter}` }
  }

  // ── Helpers de estado (tests/demo) ───────────────────────────────────────

  get statusValue(): ProviderStatus {
    return this.status
  }

  get isConnected(): boolean {
    return this.status === "connected"
  }

  get queuedInbound(): number {
    return this.pendingInbound.length
  }
}
