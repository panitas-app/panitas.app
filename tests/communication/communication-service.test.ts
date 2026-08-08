import { describe, expect, it } from "vitest"
import { CommunicationService, createSignature, type CommunicationEventRecord } from "@/lib/communication"
import { isServiceError } from "@/services/errors"

describe("CommunicationService (FASE 7C)", () => {
  it("conecta un canal, envía y aísla el tenant en los eventos", async () => {
    const events: CommunicationEventRecord[] = []
    const service = new CommunicationService({ storeId: "store-1", onEvent: (r) => events.push(r) })

    const result = await service.connect("whatsapp", { apiKey: "sk-1" })
    expect(result).toMatchObject({ providerId: "mock-whatsapp", channel: "whatsapp", status: "connected" })
    expect(service.isConnected("whatsapp")).toBe(true)

    const sent = await service.sendMessage({
      channel: "whatsapp",
      conversationId: "conv-1",
      recipient: "+593991234567",
      text: "Hola",
    })
    expect(sent.status).toBe("sent")

    const connected = events.find((e) => e.type === "channel.connected")
    expect(connected).toMatchObject({ tenantId: "store-1", providerId: "mock-whatsapp" })
    expect(events.some((e) => e.type === "message.sent")).toBe(true)
  })

  it("desconecta un canal", async () => {
    const service = new CommunicationService({ storeId: "store-1" })
    await service.connect("instagram")
    expect(service.isConnected("instagram")).toBe(true)
    await service.disconnect("instagram")
    expect(service.isConnected("instagram")).toBe(false)
  })

  it("procesa webhooks firmados y recupera mensajes por pull", async () => {
    const secret = "s3cret"
    const service = new CommunicationService({
      storeId: "store-1",
      providerOptions: { perChannel: { whatsapp: { webhookSecret: secret } } },
    })

    const body = { conversationId: "conv-1", text: "¿Cuánto cuesta la camisa?" }
    const raw = JSON.stringify(body)
    const events = await service.handleWebhook("whatsapp", {
      headers: { "x-hub-signature-256": `sha256=${createSignature(secret, raw)}` },
      body,
    })
    expect(events).toHaveLength(1)
    expect(events[0].message.text).toBe("¿Cuánto cuesta la camisa?")

    const drainedWebhook = await service.pullMessages("whatsapp")
    expect(drainedWebhook).toHaveLength(1)
    expect(drainedWebhook[0].conversationId).toBe("conv-1")

    await service.simulateIncoming("whatsapp", { conversationId: "conv-2", text: "Hola" })
    const pulled = await service.pullMessages("whatsapp")
    expect(pulled).toHaveLength(1)
    expect(pulled[0].conversationId).toBe("conv-2")
  })

  it("rechaza firmas inválidas en el servicio", async () => {
    const service = new CommunicationService({
      storeId: "store-1",
      providerOptions: { perChannel: { whatsapp: { webhookSecret: "s3cret" } } },
    })
    await expect(
      service.handleWebhook("whatsapp", {
        headers: { "x-hub-signature-256": "sha256=bad" },
        body: { conversationId: "conv-1", text: "Hola" },
      }),
    ).rejects.toSatisfy((e) => isServiceError(e) && (e as { status: number }).status === 401)
  })

  it("acumula métricas de envíos y recibidos", async () => {
    const service = new CommunicationService({ storeId: "store-1" })
    await service.connect("whatsapp")
    await service.sendMessage({ channel: "whatsapp", conversationId: "c1", recipient: "+593", text: "1" })
    await service.sendMessage({ channel: "whatsapp", conversationId: "c1", recipient: "+593", text: "2" })
    await service.simulateIncoming("whatsapp", { conversationId: "c1", text: "ok" })

    const all = service.metrics()
    expect(all).toHaveLength(1)
    expect(all[0]).toMatchObject({ sent: 2, received: 1, errors: 0 })
  })

  it("reporta salud y runtime de los canales", async () => {
    const service = new CommunicationService({ storeId: "store-1" })
    await service.connect("whatsapp")
    await service.connect("email")

    const health = await service.health()
    expect(health.filter((h) => h.connected)).toHaveLength(2)
    expect(service.healthSummary().connected).toBe(2)

    const list = service.list()
    expect(list).toHaveLength(2)
    expect(service.providerIdFor("whatsapp")).toBe("mock-whatsapp")
  })

  it("markAsRead, typing y media delegan al proveedor", async () => {
    const service = new CommunicationService({ storeId: "store-1" })
    await service.connect("messenger")
    await expect(service.markAsRead("messenger", "c1", "m1")).resolves.toBeUndefined()
    await expect(service.typing("messenger", "c1", true)).resolves.toBeUndefined()
    const downloaded = await service.downloadMedia("messenger", "media-1")
    expect(downloaded.mediaId).toBe("media-1")
    const uploaded = await service.uploadMedia("messenger", { type: "image", url: "mock://x" })
    expect(uploaded.mediaId).toBeTruthy()
  })

  it("aplica retry a nivel de servicio", async () => {
    const events: CommunicationEventRecord[] = []
    const service = new CommunicationService({
      storeId: "store-1",
      retry: { attempts: 3, baseDelayMs: 0, maxDelayMs: 0 },
      providerOptions: { perChannel: { whatsapp: { failRate: 1 } } },
      onEvent: (r) => events.push(r),
    })
    await service.connect("whatsapp")
    await expect(
      service.sendMessage({ channel: "whatsapp", conversationId: "c1", recipient: "+593", text: "Hola" }),
    ).rejects.toSatisfy((e) => isServiceError(e))
    expect(events.filter((e) => e.type === "provider.retry").length).toBeGreaterThanOrEqual(1)
  })

  it("cada tienda mantiene sus propios proveedores", async () => {
    const a = new CommunicationService({ storeId: "store-1" })
    const b = new CommunicationService({ storeId: "store-2" })
    await a.connect("whatsapp")
    expect(a.isConnected("whatsapp")).toBe(true)
    expect(b.isConnected("whatsapp")).toBe(false)
  })
})
