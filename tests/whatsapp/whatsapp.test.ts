/**
 * WhatsApp Cloud API (FASE 8A) — Tests unitarios.
 *
 * Cubre: handshake GET del webhook, extracción de phone_number_id, parser de
 * payloads de WhatsApp Cloud (mensajes + estados), verificación de firma del
 * provider, DTO de conexión (sin secrets), ingesta (dedup + estados) y gating
 * de la feature Panitas Plus.
 */
import { describe, expect, it, vi } from "vitest"
import {
  createSignature,
  normalizeWhatsAppPhone,
  parseWebhookPayload,
  WhatsAppProvider,
} from "@/lib/communication"
import { extractPhoneNumberId, verifyWhatsAppWebhook } from "@/lib/whatsapp/webhook"
import { WhatsAppIngestionService } from "@/lib/whatsapp/ingestion-service"
import { ChannelConnectionService } from "@/lib/whatsapp/connection-service"
import { hasFeature } from "@/lib/features"
import { isServiceError } from "@/services/errors"
import type { PrismaClient } from "@prisma/client"
import type { ProviderInboundEvent } from "@/lib/communication"

const WHATSAPP_CLOUD_BODY = {
  object: "whatsapp_business_account",
  entry: [
    {
      id: "101234567890",
      changes: [
        {
          field: "messages",
          value: {
            messaging_product: "whatsapp",
            metadata: { display_phone_number: "16505551111", phone_number_id: "111111111111111" },
            contacts: [{ profile: { name: "María Pérez" }, wa_id: "5491155990000" }],
            messages: [
              {
                from: "5491155990000",
                id: "wamid.ABC123",
                timestamp: "1600000000",
                type: "text",
                text: { body: "Hola, ¿cuánto cuesta la torta?" },
              },
            ],
          },
        },
      ],
    },
  ],
}

function waId(): string {
  return "5491155990000"
}

function textInboundEvent(): ProviderInboundEvent {
  return {
    providerId: "whatsapp",
    channel: "whatsapp",
    conversationId: waId(),
    message: {
      id: "wamid.ABC123",
      channel: "whatsapp",
      conversationId: waId(),
      sender: "customer",
      recipient: "111111111111111",
      text: "Hola, ¿cuánto cuesta la torta?",
      attachments: [],
      timestamp: new Date().toISOString(),
      metadata: { waId: waId(), profileName: "María Pérez" },
      status: "received",
    },
  }
}

describe("webhook helpers (FASE 8A)", () => {
  it("verifica el handshake GET y devuelve el challenge", () => {
    const params = new URLSearchParams({
      "hub.mode": "subscribe",
      "hub.verify_token": "mi-token",
      "hub.challenge": "CHALLENGE_123",
    })
    const result = verifyWhatsAppWebhook(params, "mi-token")
    expect(result.valid).toBe(true)
    expect(result.challenge).toBe("CHALLENGE_123")
  })

  it("rechaza el handshake si el verify token no coincide", () => {
    const params = new URLSearchParams({
      "hub.mode": "subscribe",
      "hub.verify_token": "otro",
      "hub.challenge": "CHALLENGE_123",
    })
    expect(verifyWhatsAppWebhook(params, "mi-token").valid).toBe(false)
  })

  it("rechaza si no es una suscripción o falta challenge", () => {
    expect(verifyWhatsAppWebhook(new URLSearchParams({ "hub.mode": "delete" }), "x").valid).toBe(false)
    expect(
      verifyWhatsAppWebhook(
        new URLSearchParams({ "hub.mode": "subscribe", "hub.verify_token": "x" }),
        "x",
      ).valid,
    ).toBe(false)
  })

  it("extrae el phone_number_id del payload", () => {
    expect(extractPhoneNumberId(WHATSAPP_CLOUD_BODY)).toBe("111111111111111")
    expect(extractPhoneNumberId({})).toBe("")
    expect(extractPhoneNumberId(null)).toBe("")
  })
})

describe("parseWebhookPayload — WhatsApp Cloud API (FASE 8A)", () => {
  it("convierte un mensaje de texto al modelo unificado", () => {
    const events = parseWebhookPayload({
      providerId: "whatsapp",
      channel: "whatsapp",
      headers: {},
      body: WHATSAPP_CLOUD_BODY,
    })
    expect(events).toHaveLength(1)
    expect(events[0].conversationId).toBe(waId())
    expect(events[0].message).toMatchObject({
      text: "Hola, ¿cuánto cuesta la torta?",
      sender: "customer",
      recipient: "111111111111111",
    })
    expect(events[0].message.id).toBe("wamid.ABC123")
    expect(events[0].message.metadata).toMatchObject({
      webhook: "whatsapp",
      waId: waId(),
      profileName: "María Pérez",
      phoneNumberId: "111111111111111",
    })
  })

  it("parsea estados delivered/read/failed como statusUpdate", () => {
    const payload = {
      ...WHATSAPP_CLOUD_BODY,
      entry: [
        {
          id: "101234567890",
          changes: [
            {
              field: "messages",
              value: {
                metadata: { phone_number_id: "111111111111111" },
                statuses: [
                  { id: "wamid.OUT1", status: "delivered", timestamp: "1600000100" },
                  { id: "wamid.OUT2", status: "read", timestamp: "1600000200" },
                  { id: "wamid.OUT3", status: "failed", timestamp: "1600000300", errors: [{ message: "Permiso denegado" }] },
                ],
              },
            },
          ],
        },
      ],
    }
    const events = parseWebhookPayload({ providerId: "whatsapp", channel: "whatsapp", headers: {}, body: payload })
    const updates = events.filter((e) => e.statusUpdate).map((e) => e.statusUpdate!)
    expect(updates).toHaveLength(3)
    expect(updates[0]).toMatchObject({ type: "delivered", externalMessageId: "wamid.OUT1" })
    expect(updates[1].type).toBe("read")
    expect(updates[2]).toMatchObject({ type: "failed", error: "Permiso denegado" })
  })

  it("ignora mensajes sin remitente", () => {
    const payload = JSON.parse(JSON.stringify(WHATSAPP_CLOUD_BODY))
    ;(payload.entry[0].changes[0].value.messages[0] as { from?: string }).from = ""
    const events = parseWebhookPayload({ providerId: "whatsapp", channel: "whatsapp", headers: {}, body: payload })
    expect(events).toHaveLength(0)
  })
})

describe("WhatsAppProvider — firma de webhook (FASE 8A)", () => {
  const provider = new WhatsAppProvider({ appSecret: "app-secret", requireSignature: true })

  it("acepta un webhook firmado correctamente", async () => {
    provider.setConnectedForTest({ appSecret: "app-secret", phoneNumberId: "111111111111111" })
    const raw = JSON.stringify(WHATSAPP_CLOUD_BODY)
    const signature = createSignature("app-secret", raw)
    const events = await provider.webhook({
      headers: { "x-hub-signature-256": `sha256=${signature}` },
      body: raw,
    })
    expect(events).toHaveLength(1)
    expect(events[0].message.text).toContain("torta")
  })

  it("rechaza una firma inválida", async () => {
    provider.setConnectedForTest({ appSecret: "app-secret", phoneNumberId: "111111111111111" })
    const raw = JSON.stringify(WHATSAPP_CLOUD_BODY)
    await expect(
      provider.webhook({
        headers: { "x-hub-signature-256": "sha256=deadbeef" },
        body: raw,
      }),
    ).rejects.toSatisfy((error: unknown) => isServiceError(error) && (error as { status: number }).status === 401)
  })

  it("exige app secret para verificar firmas", async () => {
    const insecure = new WhatsAppProvider({ requireSignature: true })
    insecure.setConnectedForTest({ phoneNumberId: "111111111111111" })
    await expect(
      insecure.webhook({ headers: {}, body: WHATSAPP_CLOUD_BODY }),
    ).rejects.toSatisfy((error: unknown) => isServiceError(error))
  })
})

describe("normalizeWhatsAppPhone (E.164)", () => {
  it("normaliza variantes a solo dígitos y limita a 15", () => {
    expect(normalizeWhatsAppPhone("+58 412-123 4567")).toBe("584121234567")
    expect(normalizeWhatsAppPhone("04141234567")).toBe("04141234567")
    expect(normalizeWhatsAppPhone("")).toBe("")
    expect(normalizeWhatsAppPhone("12345678901234567890")).toHaveLength(15)
  })
})

describe("ChannelConnectionService — DTO y parseo (FASE 8A)", () => {
  const service = new ChannelConnectionService()

  it("parsea el config JSON a credenciales tipadas", () => {
    const parsed = service.parseConfig({
      config: JSON.stringify({
        accessToken: "SECRET_TOKEN",
        phoneNumberId: "111111111111111",
        wabaId: "waba-1",
        verifyToken: "vt",
        appSecret: "secret",
      }),
    })
    expect(parsed).toMatchObject({
      accessToken: "SECRET_TOKEN",
      phoneNumberId: "111111111111111",
      wabaId: "waba-1",
      verifyToken: "vt",
      appSecret: "secret",
    })
    expect(service.parseConfig({ config: "no-json" })).toEqual({ accessToken: "", phoneNumberId: "" })
  })

  it("nunca expone secrets en el DTO", () => {
    const dto = service.toDTO({
      id: "conn-1",
      channelId: "ch-1",
      provider: "meta",
      status: "connected",
      config: JSON.stringify({ accessToken: "SECRET_TOKEN", phoneNumberId: "111111111111111", verifyToken: "vt" }),
      externalRef: "111111111111111",
      errorMessage: null,
      connectedAt: new Date(),
      disconnectedAt: null,
      lastHealthAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      channel: { type: "whatsapp", name: "WhatsApp" },
    })
    const serialized = JSON.stringify(dto)
    expect(serialized).not.toContain("SECRET_TOKEN")
    expect(serialized).not.toContain("vt")
    expect(dto).toMatchObject({
      status: "connected",
      configured: true,
      phoneNumberId: "111111111111111",
      verifyTokenSet: true,
    })
    expect(dto.displayPhoneNumber).toBe("111111111111111")
  })
})

describe("WhatsAppIngestionService — ingesta (FASE 8A)", () => {
  function makeDb() {
    const calls: { deduped: number; statuses: number } = { deduped: 0, statuses: 0 }
    const db = {
      inboxMessage: {
        findUnique: vi.fn().mockImplementation(async () => {
          calls.deduped += 1
          return null
        }),
        create: vi.fn().mockImplementation(async (args: { data: Record<string, unknown> }) => ({
          id: "msg-new",
          conversationId: "conv-1",
          channel: "whatsapp",
          sender: "customer",
          authorId: null,
          senderName: "María Pérez",
          recipient: "111111111111111",
          content: String(args.data.content),
          contentType: "text",
          attachments: null,
          status: "received",
          createdAt: new Date(),
        })),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      inboxConversation: {
        findFirst: vi.fn().mockResolvedValue({ id: "conv-1" }),
        findUnique: vi.fn().mockResolvedValue({
          id: "conv-1",
          storeId: "store-1",
          channelId: "ch-1",
          channel: { type: "whatsapp" },
        }),
        update: vi.fn().mockResolvedValue({}),
      },
    }
    return { db: db as unknown as PrismaClient, calls }
  }

  it("ingiere un mensaje nuevo en la conversación existente", async () => {
    const { db, calls } = makeDb()
    const service = new WhatsAppIngestionService(db)
    const result = await service.processInbound(
      { storeId: "store-1" },
      [textInboundEvent()],
    )
    expect(result).toMatchObject({ ingested: 1, skipped: 0, statuses: 0 })
    expect(calls.deduped).toBe(1)
    expect(db.inboxMessage.create).toHaveBeenCalledTimes(1)
    expect(db.inboxConversation.findUnique).toHaveBeenCalled()
  })

  it("deduplica mensajes repetidos por externalId (idempotencia)", async () => {
    const { db } = makeDb()
    ;(db.inboxMessage.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "existing" })
    const service = new WhatsAppIngestionService(db)
    const result = await service.processInbound({ storeId: "store-1" }, [textInboundEvent()])
    expect(result).toMatchObject({ ingested: 0, skipped: 1 })
    expect(db.inboxMessage.findUnique).toHaveBeenCalledTimes(1)
    expect(db.inboxMessage.create).not.toHaveBeenCalled()
  })

  it("aplica estados delivered/read/failed a mensajes enviados", async () => {
    const { db } = makeDb()
    const service = new WhatsAppIngestionService(db)
    const statusEvent: ProviderInboundEvent = {
      providerId: "whatsapp",
      channel: "whatsapp",
      conversationId: "",
      message: {
        id: "",
        channel: "whatsapp",
        conversationId: "",
        sender: "customer",
        recipient: "111111111111111",
        text: "",
        attachments: [],
        timestamp: new Date().toISOString(),
        metadata: { status: true },
        status: "received",
      },
      statusUpdate: { type: "read", externalMessageId: "wamid.OUT2", timestamp: new Date().toISOString() },
    }
    const result = await service.processInbound({ storeId: "store-1" }, [statusEvent])
    expect(result).toMatchObject({ ingested: 0, statuses: 1 })
    expect(db.inboxMessage.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { storeId: "store-1", externalId: "wamid.OUT2" },
        data: { status: "read" },
      }),
    )
  })

  it("descarta eventos sin waId", async () => {
    const { db } = makeDb()
    const service = new WhatsAppIngestionService(db)
    const noWa: ProviderInboundEvent = {
      ...textInboundEvent(),
      message: { ...textInboundEvent().message, conversationId: "", metadata: {} },
    }
    const result = await service.processInbound({ storeId: "store-1" }, [noWa])
    expect(result).toMatchObject({ ingested: 0, skipped: 1 })
    expect(db.inboxMessage.create).not.toHaveBeenCalled()
  })
})

describe("Feature gating de WhatsApp (FASE 8A)", () => {
  it("whatsapp_inbox es de Panitas Negocios Plus", () => {
    expect(hasFeature({ plan: "business_plus", planType: "business_plus" }, "whatsapp_inbox")).toBe(true)
    expect(hasFeature({ plan: "business", planType: "business" }, "whatsapp_inbox")).toBe(false)
  })
})
