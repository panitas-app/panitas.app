import { describe, expect, it } from "vitest"
import { MockCommunicationProvider, ProviderRegistry } from "@/lib/communication"
import { isServiceError } from "@/services/errors"

describe("ProviderRegistry (FASE 7C)", () => {
  function whatsapp() {
    return new MockCommunicationProvider({ channel: "whatsapp" })
  }

  it("registra y consulta proveedores por id", () => {
    const registry = new ProviderRegistry()
    const provider = whatsapp()
    registry.register(provider)
    expect(registry.has(provider.meta.id)).toBe(true)
    expect(registry.get(provider.meta.id)).toBe(provider)
    expect(registry.tryGet("nope")).toBeNull()
    expect(registry.list()).toEqual([provider.meta])
    expect(registry.size()).toBe(1)
  })

  it("rechaza duplicados (409)", () => {
    const registry = new ProviderRegistry()
    registry.register(whatsapp())
    expect(() => registry.register(whatsapp())).toThrow()
    expect(() => registry.register(whatsapp())).toSatisfy((fn) => {
      try {
        fn()
        return false
      } catch (e) {
        return isServiceError(e) && (e as { status: number }).status === 409
      }
    })
  })

  it("lanza 404 al consultar un proveedor desconocido", () => {
    const registry = new ProviderRegistry()
    expect(() => registry.get("missing")).toSatisfy((fn) => {
      try {
        fn()
        return false
      } catch (e) {
        return isServiceError(e) && (e as { status: number }).status === 404
      }
    })
  })

  it("registra varios y permite remover", () => {
    const registry = new ProviderRegistry()
    registry.registerMany([whatsapp(), new MockCommunicationProvider({ channel: "email" })])
    expect(registry.size()).toBe(2)
    registry.remove("mock-whatsapp")
    expect(registry.has("mock-whatsapp")).toBe(false)
    registry.clear()
    expect(registry.size()).toBe(0)
  })
})
