/**
 * Instagram + Messenger (FASE 8B) — Tests unitarios.
 *
 * Cubre: helpers de webhook (handshake GET + extracción de account id), parser
 * del formato Meta messaging (texto, media, echo, delivery/read), proveedores
 * Instagram/Messenger (payload de envío, firma, mapeo de errores HTTP, health),
 * DTO de conexión sin secrets, ingesta (dedup + estados + read por watermark),
 * resolución de media, envío saliente y gating de las features Panitas Plus.
 */
import { afterEach, describe, expect, it, vi } from "vitest"
import {
  createSignature,
  InstagramProvider,
  MessengerProvider,
  parseWebhookPayload,
  verifyWebhookSignature,
  type ProviderInboundEvent,
} from "@/lib/communication"
import { extractMetaPageId, verifyMetaWebhook } from "@/lib/meta"
import { MetaConnectionService } from "@/lib/meta/connection-service"
import { MetaIngestionService } from "@/lib/meta/ingestion-service"
import { sendMetaAgentMessage } from "@/lib/meta/send-service"
import { externalRefPrefix, defaultCustomerName } from "@/lib/meta/config"
import { resolveMetaAttachmentUrl } from "@/lib/meta/media"
import { hasFeature } from "@/lib/features"
import { isServiceError } from "@/services/errors"
import type { PrismaClient } from "@prisma/client"

const META_MESSAGING_BODY = {
  object: "instagram",
  entry: [
    {
      id: "17841405812345678",
      time: 1600000000,
      messaging: [
        {
          sender: { id: "instagram-client-1" },
          recipient: { id: "17841405812345678" },
          timestamp: 1600000000000,
          message: {
            mid: "MID_ABC123",
            text: "Hola, ¿tienen la torta de chocolate?",
          },
        },
      ],
    },
  ],
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

function mockFetch(impl: (url: string, init?: RequestInit) => Promise<Response>) {
  vi.stubGlobal("fetch", vi.fn(impl))
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } })
}

describe("webhook helpers (FASE 8B)", () => {
  it("verifica el handshake GET y devuelve el challenge", () => {
    const params = new URLSearchParams({
      "hub.mode": "subscribe",
      "hub.verify_token": "mi-token",
      "hub.challenge": "CHALLENGE_123",
    })
    const result = verifyMetaWebhook(params, "mi-token")
    expect(result.valid).toBe(true)
    expect(result.challenge).toBe("CHALLENGE_123")
  })

  it("rechaza el handshake si el verify token no coincide o falta challenge", () => {
    const badToken = new URLSearchParams({
      "hub.mode": "subscribe",
      "hub.verify_token": "otro",
      "hub.challenge": "C",
    })
    expect(verifyMetaWebhook(badToken, "mi-token").valid).toBe(false)
    expect(
      verifyMetaWebhook(new URLSearchParams({ "hub.mode": "subscribe", "hub.verify_token": "x" }), "x").valid,
    ).toBe(false)
  })

  it("extrae el account id (`entry[].id`) del payload", () => {
    expect(extractMetaPageId(META_MESSAGING_BODY)).toBe("17841405812345678")
    expect(extractMetaPageId({})).toBe("")
    expect(extractMetaPageId(null)).toBe("")
  })
})

describe("parseWebhookPayload — Meta messaging (FASE 8B)", () => {
  it("convierte un mensaje de texto al modelo unificado", () => {
    const events = parseWebhookPayload({
      providerId: "instagram",
      channel: "instagram",
      headers: {},
      body: META_MESSAGING_BODY,
    })
    expect(events).toHaveLength(1)
    expect(events[0].conversationId).toBe("instagram-client-1")
    expect(events[0].message).toMatchObject({
      text: "Hola, ¿tienen la torta de chocolate?",
      sender: "customer",
      recipient: "17841405812345678",
    })
    expect(events[0].message.id).toBe("MID_ABC123")
    expect(events[0].message.metadata).toMatchObject({ webhook: "meta", channel: "instagram" })
  })

  it("convierte adjuntos con url, size y mediaId", () => {
    const payload = JSON.parse(JSON.stringify(META_MESSAGING_BODY))
    payload.entry[0].messaging[0].message = {
      mid: "MID_IMG1",
      attachments: [
        { type: "image", payload: { url: "https://s3.example/photo.jpg", size: 2048 } },
      ],
    }
    const events = parseWebhookPayload({ providerId: "instagram", channel: "instagram", headers: {}, body: payload })
    expect(events).toHaveLength(1)
    const attachment = events[0].message.attachments[0]
    expect(attachment).toMatchObject({ type: "image", url: "https://s3.example/photo.jpg" })
    expect(events[0].message.metadata.webhook).toBe("meta")
  })

  it("ignora mensajes echo (is_echo) del propio negocio", () => {
    const payload = JSON.parse(JSON.stringify(META_MESSAGING_BODY))
    payload.entry[0].messaging[0].message.is_echo = true
    const events = parseWebhookPayload({ providerId: "messenger", channel: "messenger", headers: {}, body: payload })
    expect(events).toHaveLength(0)
  })

  it("emite statusUpdate delivered por cada mid y read por watermark", () => {
    const payload = JSON.parse(JSON.stringify(META_MESSAGING_BODY))
    payload.entry[0].messaging = [
      {
        sender: { id: "ig-client-2" },
        recipient: { id: "17841405812345678" },
        timestamp: 1600000000000,
        delivery: { mids: ["MID_OUT1", "MID_OUT2"], watermark: 1600000100000 },
        read: { watermark: 1600000200000 },
      },
    ]
    const events = parseWebhookPayload({ providerId: "instagram", channel: "instagram", headers: {}, body: payload })
    const updates = events.filter((e) => e.statusUpdate).map((e) => e.statusUpdate!)
    expect(updates).toHaveLength(3)
    expect(updates[0]).toMatchObject({ type: "delivered", externalMessageId: "MID_OUT1" })
    expect(updates[1]).toMatchObject({ type: "delivered", externalMessageId: "MID_OUT2" })
    expect(updates[2].type).toBe("read")
  })
})

describe("InstagramProvider / MessengerProvider (FASE 8B)", () => {
  it("rechaza conectar sin credenciales", async () => {
    const provider = new InstagramProvider()
    await expect(provider.connect({})).rejects.toSatisfy(
      (error: unknown) => isServiceError(error) && (error as { status: number }).status === 400,
    )
    expect(provider.isConnected).toBe(false)
  })

  it("conecta y expone info saneada sin secretos", async () => {
    const provider = new MessengerProvider({ appSecret: "app-secret" })
    const result = await provider.connect({ accessToken: "EAA-SECRETO", accountId: "123456" })
    expect(result.status).toBe("connected")
    expect(provider.isConnected).toBe(true)
    expect(JSON.stringify(result.info)).not.toContain("EAA-SECRETO")
  })

  it("Instagram envía al path {accountId}/messages con Bearer token", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ message_id: "mid.out.1" }))
    mockFetch(fetchMock as never)
    const provider = new InstagramProvider({ baseUrl: "https://graph.test" })
    provider.setConnectedForTest({ accessToken: "TOKEN", accountId: "17841405812345678" })

    const result = await provider.sendMessage({ conversationId: "c1", recipient: "ig-client-1", text: "¡Claro!" })
    expect(result.externalMessageId).toBe("mid.out.1")
    expect(result.status).toBe("sent")

    const [url, init] = fetchMock.mock.calls[0]
    expect(String(url)).toContain("17841405812345678/messages")
    expect((init as RequestInit).headers).toMatchObject({ Authorization: "Bearer TOKEN" })
    expect(JSON.parse(String((init as RequestInit).body))).toMatchObject({
      recipient: { id: "ig-client-1" },
      message: { text: "¡Claro!" },
    })
  })

  it("Messenger envía a me/messages con messaging_type RESPONSE", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ message_id: "mid.out.2" }))
    mockFetch(fetchMock as never)
    const provider = new MessengerProvider({ baseUrl: "https://graph.test" })
    provider.setConnectedForTest({ accessToken: "TOKEN", accountId: "123456" })

    await provider.sendMessage({ conversationId: "c1", recipient: "psid-1", text: "Hola" })
    const [url, init] = fetchMock.mock.calls[0]
    expect(String(url)).toContain("me/messages")
    const sent = JSON.parse(String((init as RequestInit).body))
    expect(sent.messaging_type).toBe("RESPONSE")
    expect(sent.recipient).toEqual({ id: "psid-1" })
  })

  it("mapea 429 a INSTAGRAM_RATE_LIMITED", async () => {
    mockFetch(async () => jsonResponse({ error: { message: "rate limit" } }, 429))
    const provider = new InstagramProvider({ baseUrl: "https://graph.test" })
    provider.setConnectedForTest({ accessToken: "TOKEN", accountId: "17841405812345678" })
    await expect(
      provider.sendMessage({ conversationId: "c1", recipient: "ig-client-1", text: "hola" }),
    ).rejects.toSatisfy(
      (error: unknown) =>
        isServiceError(error) && (error as { code?: string }).code === "INSTAGRAM_RATE_LIMITED",
    )
  })

  it("acepta un webhook firmado correctamente", async () => {
    const provider = new InstagramProvider()
    provider.setConnectedForTest({ accessToken: "T", accountId: "A", appSecret: "app-secret" })
    const raw = JSON.stringify(META_MESSAGING_BODY)
    const signature = createSignature("app-secret", raw)
    const events = await provider.webhook({
      headers: { "x-hub-signature-256": `sha256=${signature}` },
      body: raw,
    })
    expect(events).toHaveLength(1)
    expect(events[0].message.text).toContain("torta")
  })

  it("rechaza una firma inválida con MESSENGER_INVALID_SIGNATURE", async () => {
    const provider = new MessengerProvider()
    provider.setConnectedForTest({ accessToken: "T", accountId: "A", appSecret: "app-secret" })
    const raw = JSON.stringify(META_MESSAGING_BODY)
    await expect(
      provider.webhook({ headers: { "x-hub-signature-256": "sha256=deadbeef" }, body: raw }),
    ).rejects.toSatisfy(
      (error: unknown) => isServiceError(error) && (error as { code?: string }).code === "MESSENGER_INVALID_SIGNATURE",
    )
  })

  it("verifica la firma sin red (createSignature ↔ verifyWebhookSignature)", () => {
    const raw = "hola"
    expect(verifyWebhookSignature("secret", raw, `sha256=${createSignature("secret", raw)}`)).toBe(true)
    expect(verifyWebhookSignature("secret", raw, "sha256=xyz")).toBe(false)
  })

  it("reporta health no conectado sin configuración", async () => {
    const provider = new InstagramProvider()
    const health = await provider.health()
    expect(health.connected).toBe(false)
    expect(health.channel).toBe("instagram")
  })
})

describe("MetaConnectionService — DTO y parseo (FASE 8B)", () => {
  const service = new MetaConnectionService()

  it("parsea el config JSON a credenciales tipadas", () => {
    const parsed = service.parseConfig({
      config: JSON.stringify({
        accessToken: "EAA_SECRET",
        accountId: "17841405812345678",
        verifyToken: "vt",
        appSecret: "app-secret",
        username: "@mi.negocio",
      }),
    })
    expect(parsed).toMatchObject({
      accessToken: "EAA_SECRET",
      accountId: "17841405812345678",
      verifyToken: "vt",
      appSecret: "app-secret",
      username: "@mi.negocio",
    })
    expect(service.parseConfig({ config: "no-json" })).toEqual({ accessToken: "", accountId: "" })
  })

  it("nunca expone secrets en el DTO", () => {
    const dto = service.toDTO({
      id: "conn-1",
      channelId: "ch-1",
      provider: "meta",
      status: "connected",
      config: JSON.stringify({ accessToken: "EAA_SECRET", accountId: "17841405812345678", verifyToken: "vt" }),
      externalRef: "17841405812345678",
      errorMessage: null,
      connectedAt: new Date(),
      disconnectedAt: null,
      lastHealthAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      channel: { type: "instagram", name: "Instagram" },
    })
    const serialized = JSON.stringify(dto)
    expect(serialized).not.toContain("EAA_SECRET")
    expect(serialized).not.toContain("vt")
    expect(dto).toMatchObject({
      channel: "instagram",
      status: "connected",
      configured: true,
      accountId: "17841405812345678",
      verifyTokenSet: true,
    })
  })
})

describe("MetaIngestionService — ingesta (FASE 8B)", () => {
  function metaInboundEvent(): ProviderInboundEvent {
    return {
      providerId: "instagram",
      channel: "instagram",
      conversationId: "ig-client-1",
      message: {
        id: "MID_ABC123",
        channel: "instagram",
        conversationId: "ig-client-1",
        sender: "customer",
        recipient: "17841405812345678",
        text: "Hola, ¿tienen la torta de chocolate?",
        attachments: [],
        timestamp: new Date().toISOString(),
        metadata: { webhook: "meta", channel: "instagram" },
        status: "received",
      },
    }
  }

  function makeDb() {
    const calls: { deduped: number } = { deduped: 0 }
    const db = {
      inboxMessage: {
        findUnique: vi.fn().mockImplementation(async () => {
          calls.deduped += 1
          return null
        }),
        create: vi.fn().mockImplementation(async (args: { data: Record<string, unknown> }) => ({
          id: "msg-new",
          storeId: "store-1",
          conversationId: "conv-1",
          channel: "instagram",
          sender: "customer",
          authorId: null,
          senderName: "Cliente",
          recipient: "17841405812345678",
          content: String(args.data.content),
          contentType: "text",
          attachments: null,
          status: "received",
          externalId: "MID_ABC123",
          createdAt: new Date(),
        })),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      inboxConversation: {
        findUnique: vi.fn().mockResolvedValue({
          id: "conv-1",
          storeId: "store-1",
          channelId: "ch-1",
          channel: { type: "instagram" },
        }),
        findFirst: vi.fn().mockResolvedValue({ id: "conv-1" }),
        create: vi.fn().mockResolvedValue({ id: "conv-new" }),
        update: vi.fn().mockResolvedValue({}),
      },
      inboxParticipant: { create: vi.fn().mockResolvedValue({}) },
    }
    return { db: db as unknown as PrismaClient, calls }
  }

  it("ingiere un mensaje nuevo en la conversación existente", async () => {
    const { db, calls } = makeDb()
    const service = new MetaIngestionService("instagram", db)
    const result = await service.processInbound({ storeId: "store-1" }, [metaInboundEvent()])
    expect(result).toMatchObject({ ingested: 1, skipped: 0, statuses: 0 })
    expect(calls.deduped).toBe(1)
    expect(db.inboxMessage.create).toHaveBeenCalledTimes(1)
    expect(db.inboxConversation.create).not.toHaveBeenCalled()
  })

  it("deduplica mensajes repetidos por externalId (idempotencia)", async () => {
    const { db } = makeDb()
    ;(db.inboxMessage.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "existing" })
    const service = new MetaIngestionService("instagram", db)
    const result = await service.processInbound({ storeId: "store-1" }, [metaInboundEvent()])
    expect(result).toMatchObject({ ingested: 0, skipped: 1 })
    expect(db.inboxMessage.create).not.toHaveBeenCalled()
  })

  it("descarta eventos sin cliente", async () => {
    const { db } = makeDb()
    const service = new MetaIngestionService("messenger", db)
    const noClient: ProviderInboundEvent = {
      ...metaInboundEvent(),
      channel: "messenger",
      message: { ...metaInboundEvent().message, channel: "messenger", conversationId: "", metadata: {} },
    }
    const result = await service.processInbound({ storeId: "store-1" }, [noClient])
    expect(result).toMatchObject({ ingested: 0, skipped: 1 })
    expect(db.inboxMessage.create).not.toHaveBeenCalled()
  })

  it("aplica delivered por mid exacto", async () => {
    const { db } = makeDb()
    const service = new MetaIngestionService("instagram", db)
    const statusEvent: ProviderInboundEvent = {
      providerId: "instagram",
      channel: "instagram",
      conversationId: "",
      message: {
        id: "",
        channel: "instagram",
        conversationId: "",
        sender: "customer",
        recipient: "17841405812345678",
        text: "",
        attachments: [],
        timestamp: new Date().toISOString(),
        metadata: { webhook: "meta", channel: "instagram", status: true, delivery: true },
        status: "received",
      },
      statusUpdate: { type: "delivered", externalMessageId: "MID_OUT1", timestamp: new Date().toISOString() },
    }
    const result = await service.processInbound({ storeId: "store-1" }, [statusEvent])
    expect(result).toMatchObject({ ingested: 0, statuses: 1 })
    expect(db.inboxMessage.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { storeId: "store-1", externalId: "MID_OUT1" },
        data: { status: "delivered" },
      }),
    )
  })

  it("marca como leídos por watermark los mensajes enviados/entregados", async () => {
    const { db } = makeDb()
    const service = new MetaIngestionService("instagram", db)
    const readEvent: ProviderInboundEvent = {
      providerId: "instagram",
      channel: "instagram",
      conversationId: "ig-client-1",
      message: {
        id: "",
        channel: "instagram",
        conversationId: "ig-client-1",
        sender: "customer",
        recipient: "17841405812345678",
        text: "",
        attachments: [],
        timestamp: new Date().toISOString(),
        metadata: { webhook: "meta", channel: "instagram", status: true, readWatermark: "1600000200000" },
        status: "received",
      },
      statusUpdate: { type: "read", externalMessageId: "1600000200000", timestamp: new Date().toISOString() },
    }
    const result = await service.processInbound({ storeId: "store-1" }, [readEvent])
    expect(result).toMatchObject({ ingested: 0, statuses: 1 })
    expect(db.inboxMessage.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          storeId: "store-1",
          conversationId: "conv-1",
          status: { in: ["sent", "delivered"] },
        },
        data: { status: "read" },
      }),
    )
  })
})

describe("Media (FASE 8B)", () => {
  it("resuelve la URL de media por mediaId desde los attachments guardados", async () => {
    const db = {
      inboxMessage: {
        findMany: vi.fn().mockResolvedValue([
          {
            attachments: JSON.stringify([
              { type: "image", mediaId: "17841400000000000_17841400000000001", url: "https://s3.example/a.jpg" },
            ]),
          },
        ]),
      },
    } as unknown as PrismaClient
    const url = await resolveMetaAttachmentUrl(db, { storeId: "store-1" }, "instagram", "17841400000000000_17841400000000001")
    expect(url).toBe("https://s3.example/a.jpg")
    expect(await resolveMetaAttachmentUrl(db, { storeId: "store-1" }, "instagram", "")).toBeNull()
  })
})

describe("sendMetaAgentMessage (FASE 8B)", () => {
  it("no envía si la conversación no es del canal indicado", async () => {
    const db = {
      inboxConversation: {
        findUnique: vi.fn().mockResolvedValue({
          id: "conv-1",
          storeId: "store-1",
          channel: { type: "whatsapp" },
          externalRef: "ig:ig-client-1",
        }),
      },
    } as unknown as PrismaClient
    const outcome = await sendMetaAgentMessage({ storeId: "store-1" }, "conv-1", "instagram", {
      text: "hola",
    }, db)
    expect(outcome).toMatchObject({ externalId: null, sentVia: "none" })
  })

  it("rechaza conversaciones de otra tienda (tenant isolation)", async () => {
    const db = {
      inboxConversation: {
        findUnique: vi.fn().mockResolvedValue({
          id: "conv-1",
          storeId: "store-OTRA",
          channel: { type: "instagram" },
          externalRef: "ig:ig-client-1",
        }),
      },
    } as unknown as PrismaClient
    await expect(
      sendMetaAgentMessage({ storeId: "store-1" }, "conv-1", "instagram", { text: "hola" }, db),
    ).rejects.toSatisfy((error: unknown) => isServiceError(error))
  })
})

describe("Config y gating (FASE 8B)", () => {
  it("externalRefPrefix y defaultCustomerName por canal", () => {
    expect(externalRefPrefix("instagram")).toBe("ig")
    expect(externalRefPrefix("messenger")).toBe("fb")
    expect(defaultCustomerName("instagram")).toBe("Contacto de Instagram")
    expect(defaultCustomerName("messenger")).toBe("Contacto de Messenger")
  })

  it("instagram_inbox y facebook_inbox son de Panitas Negocios Plus", () => {
    const plus = { plan: "business_plus", planType: "business_plus" }
    const basic = { plan: "business", planType: "business" }
    expect(hasFeature(plus, "instagram_inbox")).toBe(true)
    expect(hasFeature(plus, "facebook_inbox")).toBe(true)
    expect(hasFeature(basic, "instagram_inbox")).toBe(false)
    expect(hasFeature(basic, "facebook_inbox")).toBe(false)
  })
})
