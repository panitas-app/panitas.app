/**
 * Communication Integration Layer (FASE 7C) — Servicio de comunicación.
 *
 * Fachada única por tienda sobre la capa de comunicación: conecta canales,
 * envía mensajes, procesa webhooks, consulta salud y métricas. El Inbox y el
 * resto de la app dependen de esta fachada y de los tipos puros; nunca de un
 * proveedor concreto.
 */
import type {
  CommunicationEventRecord,
  ProviderAttachment,
  ProviderChannelType,
  ProviderConnectionResult,
  ProviderHealth,
  ProviderInboundEvent,
  ProviderMetrics,
  ProviderOutboundInput,
  ProviderRuntimeView,
  ProviderSender,
  ProviderSendResult,
  ProviderWebhookPayload,
} from "./provider-types"
import { ProviderManager } from "./provider-manager"
import { ProviderRegistry } from "./provider-registry"
import { ProviderHealthMonitor } from "./provider-health"
import { MockProviderFactory, type ProviderFactoryOptions } from "./provider-factory"
import type { RateLimitMiddlewareOptions, RetryMiddlewareOptions, LogFn, SendMiddleware } from "./middlewares"
import type { CommunicationProvider } from "./interfaces/communication-provider"

export interface CommunicationServiceOptions {
  storeId: string
  registry?: ProviderRegistry
  health?: ProviderHealthMonitor
  factory?: MockProviderFactory
  manager?: ProviderManager
  onEvent?: (record: CommunicationEventRecord) => void
  fireEvents?: boolean
  retry?: RetryMiddlewareOptions | false
  rateLimit?: RateLimitMiddlewareOptions | false
  logging?: boolean | LogFn
  middlewares?: SendMiddleware[]
  providerOptions?: ProviderFactoryOptions
}

export class CommunicationService {
  private readonly storeId: string
  private readonly registry: ProviderRegistry
  private readonly factory: MockProviderFactory
  private readonly manager: ProviderManager

  constructor(options: CommunicationServiceOptions) {
    this.storeId = options.storeId
    this.registry = options.registry ?? new ProviderRegistry()
    this.factory = options.factory ?? new MockProviderFactory(options.providerOptions)
    this.manager =
      options.manager ??
      new ProviderManager({
        tenantId: this.storeId,
        registry: this.registry,
        health: options.health,
        onEvent: options.onEvent,
        fireEvents: options.fireEvents,
        retry: options.retry,
        rateLimit: options.rateLimit,
        logging: options.logging,
        middlewares: options.middlewares,
      })
  }

  // ── Conexión ─────────────────────────────────────────────────────────────

  async connect(channel: ProviderChannelType, config: Record<string, unknown> = {}): Promise<ProviderConnectionResult> {
    const provider = this.factory.get(channel)
    return this.manager.connect(provider, config)
  }

  async disconnect(channel: ProviderChannelType): Promise<void> {
    const provider = this.factory.get(channel)
    if (!this.registry.has(provider.meta.id)) return
    await this.manager.disconnect(provider.meta.id)
  }

  isConnected(channel: ProviderChannelType): boolean {
    const provider = this.factory.get(channel)
    return this.manager.isConnected(provider.meta.id)
  }

  // ── Mensajes ─────────────────────────────────────────────────────────────

  async sendMessage(input: ProviderOutboundInput): Promise<ProviderSendResult> {
    return this.manager.sendMessage(input)
  }

  async markAsRead(channel: ProviderChannelType, conversationId: string, messageId: string): Promise<void> {
    const provider = this.ensureProvider(channel)
    await this.manager.markAsRead(provider.meta.id, conversationId, messageId)
  }

  async typing(channel: ProviderChannelType, conversationId: string, typing: boolean): Promise<void> {
    const provider = this.ensureProvider(channel)
    await this.manager.typing(provider.meta.id, conversationId, typing)
  }

  // ── Media ────────────────────────────────────────────────────────────────

  async downloadMedia(channel: ProviderChannelType, mediaId: string): Promise<ProviderAttachment> {
    const provider = this.ensureProvider(channel)
    return this.manager.downloadMedia(provider.meta.id, mediaId)
  }

  async uploadMedia(channel: ProviderChannelType, attachment: ProviderAttachment): Promise<ProviderAttachment> {
    const provider = this.ensureProvider(channel)
    return this.manager.uploadMedia(provider.meta.id, attachment)
  }

  // ── Entrada ──────────────────────────────────────────────────────────────

  async handleWebhook(channel: ProviderChannelType, payload: Omit<ProviderWebhookPayload, "channel" | "providerId">): Promise<ProviderInboundEvent[]> {
    const provider = this.ensureProvider(channel)
    return this.manager.handleWebhook(provider.meta.id, {
      ...payload,
      providerId: provider.meta.id,
      channel,
    })
  }

  async pullMessages(channel: ProviderChannelType, limit?: number): Promise<ProviderInboundEvent[]> {
    const provider = this.ensureProvider(channel)
    return this.manager.pullMessages(provider.meta.id, limit)
  }

  async simulateIncoming(channel: ProviderChannelType, input: { conversationId: string; text: string; sender?: ProviderSender }): Promise<ProviderInboundEvent> {
    const provider = this.ensureProvider(channel)
    return this.manager.simulateIncoming(provider.meta.id, input)
  }

  // ── Salud y métricas ─────────────────────────────────────────────────────

  async health(): Promise<ProviderHealth[]> {
    return this.manager.health()
  }

  healthSummary() {
    return this.manager.healthSummary()
  }

  metrics(): ProviderMetrics[] {
    return this.manager.metrics()
  }

  list(): ProviderRuntimeView[] {
    return this.manager.list()
  }

  providerIdFor(channel: ProviderChannelType): string {
    return this.ensureProvider(channel).meta.id
  }

  /** Obtiene (creando si hace falta) el proveedor del canal y lo registra. */
  private ensureProvider(channel: ProviderChannelType): CommunicationProvider {
    const provider = this.factory.get(channel)
    if (!this.registry.has(provider.meta.id)) this.registry.register(provider)
    return provider
  }
}
