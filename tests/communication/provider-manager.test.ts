import { describe, expect, it } from "vitest"
import {
  MockCommunicationProvider,
  ProviderManager,
  createSignature,
  type CommunicationEventRecord,
} from "@/lib/communication"
import { isServiceError } from "@/services/errors"

function makeManager(options: { failRate?: number; onEvent?: (r: CommunicationEventRecord) => void } = {}) {
  const events: CommunicationEventRecord[] = []
  const manager = new ProviderManager({
    tenantId: "store-1",
    fireEvents: false,
    retry: { attempts: 3, baseDelayMs: 0, maxDelayMs: 0 },
    onEvent: (record) => {
      events.push(record)
      options.onEvent?.(record)
    },
  })
  const provider = new MockCommunicationProvider({ channel: "whatsapp", failRate: options.failRate ?? 0 })
  return { manager, provider, events }
}

function input() {
  return { channel: "whatsapp" as const, conversationId: "conv-1", recipient: "+593991234567", text: "Hola" }
}

describe("ProviderManager (FASE 7C)", () => {
  it("conecta, reporta salud y publica channel.connected", async () => {
    const { manager, provider, events } = makeManager()
    const result = await manager.connect(provider, { apiKey: "sk-1" })
    expect(result.status).toBe("connected")
    expect(manager.isConnected("mock-whatsapp")).toBe(true)
    expect(result.info).toEqual({})

    const [health] = await manager.health("mock-whatsapp")
    expect(health.connected).toBe(true)

    const list = manager.list()
    expect(list[0]).toMatchObject({ providerId: "mock-whatsapp", channel: "whatsapp", connected: true })
    expect(events.map((e) => e.type)).toContain("channel.connected")
  })

  it("desconecta y publica channel.disconnected", async () => {
    const { manager, provider, events } = makeManager()
    await manager.connect(provider)
    await manager.disconnect("mock-whatsapp")
    expect(manager.isConnected("mock-whatsapp")).toBe(false)
    expect(events.map((e) => e.type)).toContain("channel.disconnected")
  })

  it("envía mensajes por canal y acumula métricas", async () => {
    const { manager, provider, events } = makeManager()
    await manager.connect(provider)
    const result = await manager.sendMessage(input())
    expect(result).toMatchObject({ providerId: "mock-whatsapp", status: "sent", retries: 0 })
    expect(result.externalMessageId).toContain("mock-whatsapp")

    const [m] = manager.metrics("mock-whatsapp")
    expect(m).toMatchObject({ sent: 1, received: 0, errors: 0 })
    expect(events.map((e) => e.type)).toContain("message.sent")
  })

  it("reenruta por canal al proveedor registrado", async () => {
    const { manager } = makeManager()
    await manager.connect(new MockCommunicationProvider({ channel: "email" }))
    const result = await manager.sendMessage({
      channel: "email",
      conversationId: "conv-2",
      recipient: "cliente@correo.com",
      text: "Gracias por tu compra",
    })
    expect(result.providerId).toBe("mock-email")
  })

  it("lanza error y publica provider.error cuando el envío falla", async () => {
    const { manager, provider, events } = makeManager({ failRate: 1 })
    await manager.connect(provider)
    await expect(manager.sendMessage(input())).rejects.toSatisfy((e) => isServiceError(e))
    const [m] = manager.metrics("mock-whatsapp")
    expect(m.errors).toBeGreaterThanOrEqual(1)
    expect(events.map((e) => e.type)).toContain("provider.error")
  })

  it("reintenta envíos fallidos y publica provider.retry", async () => {
    const { manager, provider, events } = makeManager({ failRate: 1 })
    await manager.connect(provider)
    await expect(manager.sendMessage(input())).rejects.toSatisfy((e) => isServiceError(e))
    const retries = events.filter((e) => e.type === "provider.retry")
    expect(retries.length).toBeGreaterThanOrEqual(1)
    const [m] = manager.metrics("mock-whatsapp")
    expect(m.retries).toBe(retries.length)
  })

  it("procesa webhooks con firma válida y publica message.received", async () => {
    const { manager, events } = makeManager()
    const secret = "s3cret"
    const providerWithSecret = new MockCommunicationProvider({ channel: "whatsapp", webhookSecret: secret })
    await manager.connect(providerWithSecret)

    const body = { conversationId: "conv-1", text: "¿Tienen stock?" }
    const raw = JSON.stringify(body)
    const eventsIn = await manager.handleWebhook("mock-whatsapp", {
      providerId: "mock-whatsapp",
      channel: "whatsapp",
      headers: { "x-hub-signature-256": `sha256=${createSignature(secret, raw)}` },
      body,
    })
    expect(eventsIn).toHaveLength(1)
    expect(eventsIn[0].message.text).toBe("¿Tienen stock?")
    expect(events.map((e) => e.type)).toContain("message.received")

    const [m] = manager.metrics("mock-whatsapp")
    expect(m.received).toBe(1)
  })

  it("rechaza webhooks con firma inválida", async () => {
    const { manager } = makeManager()
    const provider = new MockCommunicationProvider({ channel: "whatsapp", webhookSecret: "s3cret" })
    await manager.connect(provider)
    await expect(
      manager.handleWebhook("mock-whatsapp", {
        providerId: "mock-whatsapp",
        channel: "whatsapp",
        headers: { "x-hub-signature-256": "sha256=deadbeef" },
        body: { conversationId: "conv-1", text: "Hola" },
      }),
    ).rejects.toSatisfy((e) => isServiceError(e) && (e as { status: number }).status === 401)
  })

  it("recupera mensajes por pull y simula entrantes", async () => {
    const { manager, provider, events } = makeManager()
    await manager.connect(provider)

    await manager.simulateIncoming("mock-whatsapp", { conversationId: "conv-1", text: "Hola" })
    await manager.simulateIncoming("mock-whatsapp", { conversationId: "conv-1", text: "¿Precio?" })
    const pulled = await manager.pullMessages("mock-whatsapp")
    expect(pulled).toHaveLength(2)
    expect(events.filter((e) => e.type === "message.received")).toHaveLength(4)
  })

  it("markAsRead y typing no rompen", async () => {
    const { manager, provider } = makeManager()
    await manager.connect(provider)
    await expect(manager.markAsRead("mock-whatsapp", "conv-1", "mid-1")).resolves.toBeUndefined()
    await expect(manager.typing("mock-whatsapp", "conv-1", true)).resolves.toBeUndefined()
  })

  it("valida el mensaje antes de tocar al proveedor", async () => {
    const { manager, provider } = makeManager()
    await manager.connect(provider)
    await expect(
      manager.sendMessage({ ...input(), recipient: "" }),
    ).rejects.toSatisfy((e) => isServiceError(e) && (e as { status: number }).status === 400)
  })

  it("aplica rate limit configurado", async () => {
    const events: CommunicationEventRecord[] = []
    const manager = new ProviderManager({
      tenantId: "store-1",
      fireEvents: false,
      retry: false,
      rateLimit: { limit: 2, windowMs: 5_000 },
      onEvent: (r) => events.push(r),
    })
    const provider = new MockCommunicationProvider({ channel: "whatsapp" })
    await manager.connect(provider)
    await manager.sendMessage(input())
    await manager.sendMessage(input())
    await expect(manager.sendMessage(input())).rejects.toSatisfy(
      (e) => isServiceError(e) && (e as { status: number }).status === 429,
    )
    expect(manager.metrics("mock-whatsapp")[0].sent).toBe(2)
  })

  it("envío correcto no requiere conexión cuando el proveedor no lo exige", async () => {
    const { manager, provider } = makeManager()
    await manager.connect(provider)
    await manager.disconnect("mock-whatsapp")
    const result = await manager.sendMessage(input())
    expect(result).toMatchObject({ status: "sent" })
  })

  it("la salud y las métricas se aíslan por proveedor", async () => {
    const { manager, provider } = makeManager()
    await manager.connect(provider)
    await manager.sendMessage(input())
    const all = manager.metrics()
    expect(all).toHaveLength(1)
    expect(manager.metrics("mock-email")).toHaveLength(0)
  })

  it("clear reinicia conexiones y métricas", async () => {
    const { manager, provider } = makeManager()
    await manager.connect(provider)
    await manager.sendMessage(input())
    manager.clear()
    expect(manager.metrics()).toHaveLength(0)
    expect(manager.isConnected("mock-whatsapp")).toBe(false)
  })
})
