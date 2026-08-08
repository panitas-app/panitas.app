/**
 * WhatsApp Cloud API (FASE 8A) — Fachada de comunicación por negocio.
 *
 * Construye el `CommunicationService` de la capa base con el proveedor REAL de
 * WhatsApp cuando el negocio tiene una conexión activa (`ChannelConnection`
 * en estado connected), o con el proveedor mock en caso contrario (config-gated).
 *
 * Se cachea por tienda (TTL) para no re-conectar ni consultar la API en cada
 * request; `invalidateCommunicationService` se llama al conectar/desconectar.
 */
import {
  CommunicationService,
  MockProviderFactory,
  ProviderRegistry,
  WhatsAppProvider,
  type CommunicationProvider,
  type WhatsAppConnectionConfig,
} from "@/lib/communication"
import { ChannelConnectionService } from "./connection-service"
import { readWhatsAppAppConfig } from "./config"

const TTL_MS = 60_000
const cache = new Map<string, { service: CommunicationService; at: number }>()

/** Devuelve (y cachea) el servicio de comunicación de una tienda. */
export async function getCommunicationService(storeId: string): Promise<CommunicationService> {
  const hit = cache.get(storeId)
  if (hit && Date.now() - hit.at < TTL_MS) return hit.service
  const service = await buildCommunicationService(storeId)
  cache.set(storeId, { service, at: Date.now() })
  return service
}

/** Invalida el cache de una tienda (conectar/desconectar/revocar). */
export function invalidateCommunicationService(storeId: string): void {
  cache.delete(storeId)
}

/** Limpia todo el cache (tests / recarga). */
export function clearCommunicationServiceCache(): void {
  cache.clear()
}

async function buildCommunicationService(storeId: string): Promise<CommunicationService> {
  const connections = new ChannelConnectionService()
  const conn = await connections.get({ storeId })
  const registry = new ProviderRegistry()
  const realProviders: Partial<Record<"whatsapp", CommunicationProvider>> = {}
  let connectedConfig: WhatsAppConnectionConfig | null = null

  if (conn && conn.status === "connected") {
    const config = connections.parseConfig(conn)
    if (config.accessToken && config.phoneNumberId) {
      const provider = new WhatsAppProvider(readWhatsAppAppConfig())
      await provider.connect(config)
      realProviders.whatsapp = provider
      connectedConfig = config
    }
  }

  const factory = new MockProviderFactory({ realProviders })
  const service = new CommunicationService({ storeId, registry, factory })

  if (connectedConfig && realProviders.whatsapp) {
    try {
      await service.connect("whatsapp", connectedConfig)
    } catch {
      // El estado canónico vive en la BD; un fallo aquí no bloquea el servicio.
    }
  }
  return service
}
