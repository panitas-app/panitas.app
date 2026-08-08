/**
 * Communication Integration Layer (FASE 7C) — Registro de proveedores.
 *
 * Almacena las instancias de `CommunicationProvider` disponibles por id.
 * El Inbox y la capa superior dependen solo de esta colección: registran,
 * consultan y enumeran conectores sin conocer su implementación.
 */
import { serviceError } from "@/services/errors"
import type { ProviderMeta } from "./provider-types"
import type { CommunicationProvider } from "./interfaces/communication-provider"

export class ProviderRegistry {
  private readonly providers = new Map<string, CommunicationProvider>()

  register(provider: CommunicationProvider): void {
    const id = provider.meta.id
    if (this.providers.has(id)) {
      throw serviceError(`El proveedor ya está registrado: ${id}`, 409, "PROVIDER_ALREADY_REGISTERED")
    }
    this.providers.set(id, provider)
  }

  registerMany(providers: CommunicationProvider[]): void {
    for (const provider of providers) this.register(provider)
  }

  get(id: string): CommunicationProvider {
    const provider = this.providers.get(id)
    if (!provider) {
      throw serviceError(`Proveedor no registrado: ${id}`, 404, "PROVIDER_NOT_FOUND")
    }
    return provider
  }

  tryGet(id: string): CommunicationProvider | null {
    return this.providers.get(id) ?? null
  }

  has(id: string): boolean {
    return this.providers.has(id)
  }

  remove(id: string): void {
    this.providers.delete(id)
  }

  list(): ProviderMeta[] {
    return [...this.providers.values()].map((p) => p.meta)
  }

  size(): number {
    return this.providers.size
  }

  clear(): void {
    this.providers.clear()
  }
}
