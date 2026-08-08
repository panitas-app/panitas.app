/**
 * Communication Integration Layer (FASE 7C) — Gestor de proveedores.
 *
 * Orquesta proveedores: conecta/desconecta canales, enruta envíos por canal
 * a través de la cadena de middlewares (validación → rate limit → reintentos →
 * logging), procesa webhooks/pull, mide salud y métricas y publica los eventos
 * del dominio `communication`.
 */
import { serviceError } from "@/services/errors"
import { fireDomainEvent } from "@/lib/events"
import {
  COMMUNICATION_EVENT_DOMAIN,
  PROVIDER_CHANNEL_META,
  type CommunicationEventName,
  type CommunicationEventRecord,
  type ProviderChannelType,
  type ProviderConnectionResult,
  type ProviderHealth,
  type ProviderInboundEvent,
  type ProviderMetrics,
  type ProviderOutboundInput,
  type ProviderRuntimeView,
  type ProviderSender,
  type ProviderSendResult,
  type ProviderWebhookPayload,
} from "./provider-types"
import type { CommunicationProvider } from "./interfaces/communication-provider"
import { ProviderRegistry } from "./provider-registry"
import { ProviderHealthMonitor } from "./provider-health"
import {
  composeSendMiddlewares,
  defaultLog,
  validateOutboundMiddleware,
  rateLimitMiddleware,
  retryMiddleware,
  loggingMiddleware,
  noopLog,
  type LogFn,
  type RateLimitMiddlewareOptions,
  type RetryMiddlewareOptions,
  type SendMiddleware,
} from "./middlewares"

export interface ProviderManagerOptions {
  /** Tenant al que pertenecen los proveedores gestionados. */
  tenantId: string
  registry?: ProviderRegistry
  health?: ProviderHealthMonitor
  /** Hook desacoplado por cada evento del dominio communication. */
  onEvent?: (record: CommunicationEventRecord) => void
  /** Publica también en el bus de eventos global (por defecto true). */
  fireEvents?: boolean
  /** Middlewares extra que se ejecutan después de validación y rate limit. */
  middlewares?: SendMiddleware[]
  retry?: RetryMiddlewareOptions | false
  rateLimit?: RateLimitMiddlewareOptions | false
  logging?: boolean | LogFn
}

interface ConnectionState {
  provider: CommunicationProvider
  connectedAt: string | null
}

interface MetricsState {
  channel: ProviderChannelType
  sent: number
  received: number
  errors: number
  retries: number
  latencySum: number
  latencyCount: number
  responseSum: number
  responseCount: number
  since: string
}

export class ProviderManager {
  private readonly tenantId: string
  private readonly registry: ProviderRegistry
  private readonly healthMonitor: ProviderHealthMonitor
  private readonly onEvent?: (record: CommunicationEventRecord) => void
  private readonly fireEvents: boolean
  private readonly extraMiddlewares: SendMiddleware[]
  private readonly retryOptions: RetryMiddlewareOptions | false
  private readonly rateLimitOptions: RateLimitMiddlewareOptions | false
  private readonly log: LogFn

  private readonly connections = new Map<string, ConnectionState>()
  private readonly channelProviders = new Map<ProviderChannelType, string>()
  private readonly metricsState = new Map<string, MetricsState>()
  private readonly chains = new Map<string, (input: ProviderOutboundInput) => Promise<ProviderSendResult>>()

  constructor(options: ProviderManagerOptions) {
    this.tenantId = options.tenantId
    this.registry = options.registry ?? new ProviderRegistry()
    this.healthMonitor = options.health ?? new ProviderHealthMonitor()
    this.onEvent = options.onEvent
    this.fireEvents = options.fireEvents ?? true
    this.extraMiddlewares = options.middlewares ?? []
    this.retryOptions = options.retry ?? { attempts: 3, baseDelayMs: 5, maxDelayMs: 25 }
    this.rateLimitOptions = options.rateLimit ?? false
    this.log = typeof options.logging === "function" ? options.logging : options.logging === true ? defaultLog : noopLog
  }

  // ── Conexión ─────────────────────────────────────────────────────────────

  async connect(provider: CommunicationProvider, config: Record<string, unknown> = {}): Promise<ProviderConnectionResult> {
    if (!this.registry.has(provider.meta.id)) this.registry.register(provider)
    const existing = this.connections.get(provider.meta.id)
    if (existing) {
      return {
        providerId: provider.meta.id,
        channel: provider.meta.channel,
        status: "connected",
        connectedAt: existing.connectedAt ?? new Date().toISOString(),
      }
    }
    try {
      const result = await provider.connect(config)
      this.connections.set(provider.meta.id, { provider, connectedAt: result.connectedAt })
      this.channelProviders.set(provider.meta.channel, provider.meta.id)
      await this.healthMonitor.refresh(provider)
      this.emit("channel.connected", provider.meta.id, provider.meta.channel)
      return result
    } catch (error: unknown) {
      this.emit("provider.error", provider.meta.id, provider.meta.channel, errorMessage(error))
      throw error
    }
  }

  async disconnect(providerId: string): Promise<void> {
    const conn = this.connections.get(providerId)
    if (!conn) return
    await conn.provider.disconnect()
    this.connections.delete(providerId)
    if (this.channelProviders.get(conn.provider.meta.channel) === providerId) {
      this.channelProviders.delete(conn.provider.meta.channel)
    }
    await this.healthMonitor.refresh(conn.provider)
    this.emit("channel.disconnected", providerId, conn.provider.meta.channel)
  }

  isConnected(providerId: string): boolean {
    return this.connections.has(providerId)
  }

  // ── Envío ────────────────────────────────────────────────────────────────

  async sendMessage(input: ProviderOutboundInput): Promise<ProviderSendResult> {
    const provider = this.providerFor(input.channel)
    try {
      const chain = this.buildChain(provider)
      const result = await chain(input)
      this.track(provider.meta.id, provider.meta.channel, { sent: 1, latencyMs: result.latencyMs })
      this.emit("message.sent", provider.meta.id, provider.meta.channel, input.conversationId, result.externalMessageId)
      return result
    } catch (error: unknown) {
      this.track(provider.meta.id, provider.meta.channel, { errors: 1 })
      this.emit("provider.error", provider.meta.id, provider.meta.channel, input.conversationId, undefined, errorMessage(error))
      throw error
    }
  }

  // ── Entrada (webhook / pull / simulación) ────────────────────────────────

  async handleWebhook(providerId: string, payload: ProviderWebhookPayload): Promise<ProviderInboundEvent[]> {
    const provider = this.registry.get(providerId)
    const startedAt = Date.now()
    const events = await provider.webhook(payload)
    this.track(providerId, provider.meta.channel, { received: events.length, responseMs: Date.now() - startedAt })
    for (const event of events) {
      this.emit("message.received", providerId, provider.meta.channel, event.conversationId, event.message.id)
    }
    return events
  }

  async pullMessages(providerId: string, limit?: number): Promise<ProviderInboundEvent[]> {
    const provider = this.registry.get(providerId)
    if (!provider.receiveMessages) return []
    const startedAt = Date.now()
    const events = await provider.receiveMessages(limit)
    this.track(providerId, provider.meta.channel, { received: events.length, responseMs: Date.now() - startedAt })
    for (const event of events) {
      this.emit("message.received", providerId, provider.meta.channel, event.conversationId, event.message.id)
    }
    return events
  }

  async simulateIncoming(
    providerId: string,
    input: { conversationId: string; text: string; sender?: ProviderSender },
  ): Promise<ProviderInboundEvent> {
    const provider = this.registry.get(providerId)
    if (!provider.simulateIncoming) {
      throw serviceError("El proveedor no soporta simulación de mensajes entrantes", 400, "SIMULATION_NOT_SUPPORTED")
    }
    const event = await provider.simulateIncoming(input)
    this.track(providerId, provider.meta.channel, { received: 1 })
    this.emit("message.received", providerId, provider.meta.channel, event.conversationId, event.message.id)
    return event
  }

  // ── Acciones sobre el proveedor ──────────────────────────────────────────

  async markAsRead(providerId: string, conversationId: string, messageId: string): Promise<void> {
    const provider = this.registry.get(providerId)
    await provider.markAsRead(conversationId, messageId)
  }

  async typing(providerId: string, conversationId: string, typing: boolean): Promise<void> {
    const provider = this.registry.get(providerId)
    await provider.typing(conversationId, typing)
  }

  async downloadMedia(providerId: string, mediaId: string) {
    const provider = this.registry.get(providerId)
    return provider.downloadMedia(mediaId)
  }

  async uploadMedia(providerId: string, attachment: Parameters<CommunicationProvider["uploadMedia"]>[0]) {
    const provider = this.registry.get(providerId)
    return provider.uploadMedia(attachment)
  }

  // ── Salud y métricas ─────────────────────────────────────────────────────

  async health(providerId?: string): Promise<ProviderHealth[]> {
    if (providerId) {
      const conn = this.connections.get(providerId)
      if (conn) await this.healthMonitor.refresh(conn.provider)
      const single = this.healthMonitor.get(providerId)
      return single ? [single] : []
    }
    for (const conn of this.connections.values()) {
      await this.healthMonitor.refresh(conn.provider)
    }
    return this.healthMonitor.list()
  }

  healthSummary() {
    return this.healthMonitor.summary()
  }

  metrics(providerId?: string): ProviderMetrics[] {
    if (providerId) {
      const m = this.metricsState.get(providerId)
      return m ? [toMetrics(providerId, m)] : []
    }
    return [...this.metricsState.entries()].map(([id, m]) => toMetrics(id, m))
  }

  list(): ProviderRuntimeView[] {
    return this.registry.list().map((meta) => {
      const conn = this.connections.get(meta.id)
      const health = this.healthMonitor.get(meta.id)
      return {
        providerId: meta.id,
        channel: meta.channel,
        name: meta.name,
        status: conn ? (health?.status ?? "connected") : "disconnected",
        connected: Boolean(conn),
        connectedAt: conn?.connectedAt ?? null,
        health: health ?? null,
      }
    })
  }

  clear(): void {
    this.connections.clear()
    this.channelProviders.clear()
    this.metricsState.clear()
    this.chains.clear()
    this.healthMonitor.clear()
  }

  // ── Privados ─────────────────────────────────────────────────────────────

  private providerFor(channel: ProviderChannelType): CommunicationProvider {
    const id = this.channelProviders.get(channel) ?? PROVIDER_CHANNEL_META[channel].defaultProviderId
    return this.registry.get(id)
  }

  private buildChain(provider: CommunicationProvider): (input: ProviderOutboundInput) => Promise<ProviderSendResult> {
    const existing = this.chains.get(provider.meta.id)
    if (existing) return existing

    const middlewares: SendMiddleware[] = [
      validateOutboundMiddleware,
      ...(this.rateLimitOptions ? [rateLimitMiddleware(this.rateLimitOptions)] : []),
      ...(this.retryOptions
        ? [
            retryMiddleware({
              ...this.retryOptions,
              onRetry: (attempt, error) => {
                this.track(provider.meta.id, provider.meta.channel, { retries: 1 })
                this.emit("provider.retry", provider.meta.id, provider.meta.channel, undefined, undefined, errorMessage(error), attempt)
              },
            }),
          ]
        : []),
      ...(this.extraMiddlewares ?? []),
      loggingMiddleware(this.log),
    ]

    const chain = composeSendMiddlewares(middlewares, (input) => provider.sendMessage(input))
    this.chains.set(provider.meta.id, chain)
    return chain
  }

  private track(
    providerId: string,
    channel: ProviderChannelType,
    delta: { sent?: number; received?: number; errors?: number; retries?: number; latencyMs?: number; responseMs?: number },
  ): void {
    const state = this.metricsState.get(providerId) ?? {
      channel,
      sent: 0,
      received: 0,
      errors: 0,
      retries: 0,
      latencySum: 0,
      latencyCount: 0,
      responseSum: 0,
      responseCount: 0,
      since: new Date().toISOString(),
    }
    state.sent += delta.sent ?? 0
    state.received += delta.received ?? 0
    state.errors += delta.errors ?? 0
    state.retries += delta.retries ?? 0
    if (delta.latencyMs !== undefined) {
      state.latencySum += delta.latencyMs
      state.latencyCount += 1
    }
    if (delta.responseMs !== undefined && delta.responseMs >= 0) {
      state.responseSum += delta.responseMs
      state.responseCount += 1
    }
    this.metricsState.set(providerId, state)
  }

  private emit(
    type: CommunicationEventName,
    providerId: string,
    channel: ProviderChannelType,
    conversationId?: string,
    messageId?: string,
    error?: string,
    attempts?: number,
  ): void {
    const record: CommunicationEventRecord = {
      tenantId: this.tenantId,
      type,
      providerId,
      channel,
      occurredAt: new Date().toISOString(),
      conversationId,
      messageId,
      error,
      attempts,
    }
    this.onEvent?.(record)
    if (this.fireEvents) {
      fireDomainEvent({
        type,
        data: {
          domain: COMMUNICATION_EVENT_DOMAIN,
          providerId,
          channel,
          conversationId,
          messageId,
          error,
          attempts,
        },
        aggregateId: providerId,
        aggregateType: "provider",
        tenantId: this.tenantId,
        source: "communication.provider-manager",
      })
    }
  }
}

function toMetrics(providerId: string, state: MetricsState): ProviderMetrics {
  return {
    providerId,
    channel: state.channel,
    sent: state.sent,
    received: state.received,
    errors: state.errors,
    retries: state.retries,
    avgLatencyMs: state.latencyCount > 0 ? Math.round(state.latencySum / state.latencyCount) : 0,
    avgResponseMs: state.responseCount > 0 ? Math.round(state.responseSum / state.responseCount) : 0,
    since: state.since,
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
