/**
 * Communication Integration Layer (FASE 7C) — Fábrica de proveedores.
 *
 * Crea proveedores mock por canal (sin conexiones reales) y los cachea por id
 * dentro de la tienda. Cuando lleguen conectores reales, este módulo será el
 * punto único de sustitución (el resto de la capa no cambia).
 */
import {
  PROVIDER_CHANNEL_META,
  PROVIDER_CHANNEL_TYPES,
  type ProviderChannelType,
} from "./provider-types"
import { MockCommunicationProvider, type MockProviderOptions } from "./providers/mock-provider"
import type { CommunicationProvider } from "./interfaces/communication-provider"

export interface ProviderFactoryOptions {
  /** Latencia simulada para todos los proveedores creados. */
  latencyMs?: number
  /** Tasa de fallo simulada (0..1) para todos. */
  failRate?: number
  /** Exige conexión antes de enviar. */
  requireConnected?: boolean
  /** Sobrescribe opciones por canal. */
  perChannel?: Partial<Record<ProviderChannelType, Partial<MockProviderOptions>>>
  /** Proveedores reales por canal que sustituyen al mock (p. ej. WhatsApp Cloud API). */
  realProviders?: Partial<Record<ProviderChannelType, CommunicationProvider>>
}

export class MockProviderFactory {
  private readonly cache = new Map<string, CommunicationProvider>()
  private readonly defaults: Omit<MockProviderOptions, "channel">
  private readonly perChannel: Partial<Record<ProviderChannelType, Partial<MockProviderOptions>>>
  private readonly realProviders: Partial<Record<ProviderChannelType, CommunicationProvider>>

  constructor(options: ProviderFactoryOptions = {}) {
    this.defaults = {
      latencyMs: options.latencyMs,
      failRate: options.failRate,
      requireConnected: options.requireConnected,
    }
    this.perChannel = options.perChannel ?? {}
    this.realProviders = options.realProviders ?? {}
  }

  /** Crea (y cachea) el proveedor del canal (real si está registrado, si no mock). */
  create(channel: ProviderChannelType, overrides: Partial<MockProviderOptions> = {}): CommunicationProvider {
    const real = this.realProviders[channel]
    if (real) {
      this.cache.set(real.meta.id, real)
      return real
    }
    const id = PROVIDER_CHANNEL_META[channel].defaultProviderId
    const existing = this.cache.get(id)
    if (existing) return existing

    const provider = new MockCommunicationProvider({
      channel,
      ...this.defaults,
      ...this.perChannel[channel],
      ...overrides,
    })
    this.cache.set(id, provider)
    return provider
  }

  /** Crea los cinco canales por defecto. */
  createAll(): CommunicationProvider[] {
    return PROVIDER_CHANNEL_TYPES.map((channel) => this.create(channel))
  }

  get(channel: ProviderChannelType): CommunicationProvider {
    return this.create(channel)
  }

  has(channel: ProviderChannelType): boolean {
    return this.cache.has(PROVIDER_CHANNEL_META[channel].defaultProviderId)
  }

  clear(): void {
    this.cache.clear()
  }
}
