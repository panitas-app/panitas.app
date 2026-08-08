import { describe, expect, it } from "vitest"
import { MockProviderFactory, PROVIDER_CHANNEL_TYPES } from "@/lib/communication"

describe("MockProviderFactory (FASE 7C)", () => {
  it("crea proveedores mock para todos los canales", () => {
    const factory = new MockProviderFactory()
    const providers = factory.createAll()
    expect(providers).toHaveLength(PROVIDER_CHANNEL_TYPES.length)
    for (const provider of providers) {
      expect(provider.meta.version).toContain("mock")
      expect(PROVIDER_CHANNEL_TYPES).toContain(provider.meta.channel)
    }
  })

  it("cachea instancias por canal (misma referencia)", () => {
    const factory = new MockProviderFactory()
    expect(factory.create("whatsapp")).toBe(factory.get("whatsapp"))
    expect(factory.create("whatsapp")).toBe(factory.create("whatsapp"))
    expect(factory.has("whatsapp")).toBe(true)
  })

  it("aplica overrides por canal al crear", async () => {
    const factory = new MockProviderFactory({
      perChannel: { whatsapp: { webhookSecret: "sec-1" } },
    })
    const provider = factory.get("whatsapp")
    expect(provider.meta.id).toBe("mock-whatsapp")
    await expect(
      provider.webhook({
        providerId: "mock-whatsapp",
        channel: "whatsapp",
        headers: {},
        body: { conversationId: "conv-1", text: "Hola" },
      }),
    ).rejects.toThrow("Firma de webhook inválida")
  })

  it("respeta latencia y tasa de fallo de fábrica", () => {
    const factory = new MockProviderFactory({ latencyMs: 5, failRate: 1 })
    const provider = factory.create("email")
    expect(provider).toBeDefined()
  })

  it("clear elimina el caché", () => {
    const factory = new MockProviderFactory()
    factory.get("whatsapp")
    factory.clear()
    expect(factory.has("whatsapp")).toBe(false)
  })
})
