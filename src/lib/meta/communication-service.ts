/**
 * Instagram + Messenger (FASE 8B) — Fachada de comunicación por negocio.
 *
 * Construye el `CommunicationService` de la capa base con el proveedor REAL de
 * Meta cuando el negocio tiene una conexión activa (`ChannelConnection` en
 * estado connected para instagram o messenger), o con el proveedor mock en caso
 * contrario (config-gated).
 *
 * Se cachea por tienda+canal (TTL) para no re-conectar ni consultar la API en
 * cada request; `invalidateMetaCommunicationService` se llama al
 * conectar/desconectar/revocar.
 */
import {
  CommunicationService,
  InstagramProvider,
  MessengerProvider,
  MockProviderFactory,
  ProviderRegistry,
  type CommunicationProvider,
  type MetaMessagingConfig,
} from "@/lib/communication"
import { MetaConnectionService } from "./connection-service"
import { readMetaAppConfig, type MetaChannel } from "./config"

const TTL_MS = 60_000
const cache = new Map<string, { service: CommunicationService; at: number }>()

function cacheKey(storeId: string, channel: MetaChannel): string {
  return `${storeId}:${channel}`
}

/** Devuelve (y cachea) el servicio de comunicación de una tienda para un canal. */
export async function getMetaCommunicationService(
  storeId: string,
  channel: MetaChannel,
): Promise<CommunicationService> {
  const key = cacheKey(storeId, channel)
  const hit = cache.get(key)
  if (hit && Date.now() - hit.at < TTL_MS) return hit.service
  const service = await buildMetaCommunicationService(storeId, channel)
  cache.set(key, { service, at: Date.now() })
  return service
}

/** Invalida el cache de una tienda+canal (conectar/desconectar/revocar). */
export function invalidateMetaCommunicationService(storeId: string, channel?: MetaChannel): void {
  if (channel) {
    cache.delete(cacheKey(storeId, channel))
    return
  }
  for (const key of cache.keys()) {
    if (key.startsWith(`${storeId}:`)) cache.delete(key)
  }
}

/** Limpia todo el cache (tests / recarga). */
export function clearMetaCommunicationServiceCache(): void {
  cache.clear()
}

function buildProvider(channel: MetaChannel): CommunicationProvider {
  const appConfig = readMetaAppConfig()
  return channel === "instagram"
    ? new InstagramProvider(appConfig)
    : new MessengerProvider(appConfig)
}

async function buildMetaCommunicationService(storeId: string, channel: MetaChannel): Promise<CommunicationService> {
  const connections = new MetaConnectionService()
  const conn = await connections.get({ storeId }, channel)
  const registry = new ProviderRegistry()
  const realProviders: Partial<Record<MetaChannel, CommunicationProvider>> = {}
  let connectedConfig: MetaMessagingConfig | null = null

  if (conn && conn.status === "connected") {
    const config = connections.parseConfig(conn)
    if (config.accessToken && config.accountId) {
      const provider = buildProvider(channel)
      await provider.connect(config)
      realProviders[channel] = provider
      connectedConfig = config
    }
  }

  const factory = new MockProviderFactory({ realProviders })
  const service = new CommunicationService({ storeId, registry, factory })

  if (connectedConfig && realProviders[channel]) {
    try {
      await service.connect(channel, connectedConfig)
    } catch {
      // El estado canónico vive en la BD; un fallo aquí no bloquea el servicio.
    }
  }
  return service
}
