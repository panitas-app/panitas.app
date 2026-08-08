/**
 * Communication Integration Layer (FASE 7C) — Monitor de salud.
 *
 * Consulta el estado de cada proveedor (conexión, latencia, última
 * sincronización) y lo agrega para la UI. `refresh` consulta al proveedor en
 * vivo; `get/list` devuelven el último estado conocido sin llamar a la red.
 */
import type { ProviderHealth } from "./provider-types"
import type { CommunicationProvider } from "./interfaces/communication-provider"

export interface ProviderHealthMonitorOptions {
  /** Máx. tiempo de espera simulado por chequeo (ms). */
  timeoutMs?: number
}

export class ProviderHealthMonitor {
  private readonly states = new Map<string, ProviderHealth>()

  /** Consulta la salud en vivo del proveedor y la guarda. */
  async refresh(provider: CommunicationProvider): Promise<ProviderHealth> {
    const health = await provider.health()
    this.states.set(provider.meta.id, health)
    return health
  }

  get(providerId: string): ProviderHealth | null {
    return this.states.get(providerId) ?? null
  }

  list(): ProviderHealth[] {
    return [...this.states.values()]
  }

  isConnected(providerId: string): boolean {
    return this.states.get(providerId)?.connected ?? false
  }

  /** Resumen agregado: conectados/total y proveedores degradados. */
  summary(): { connected: number; total: number; degraded: string[] } {
    const all = this.list()
    return {
      connected: all.filter((h) => h.connected).length,
      total: all.length,
      degraded: all.filter((h) => h.status === "error" || !h.connected).map((h) => h.providerId),
    }
  }

  clear(): void {
    this.states.clear()
  }
}
