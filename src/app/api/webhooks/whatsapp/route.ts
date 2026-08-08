/**
 * WhatsApp Cloud API (FASE 8A) — Webhook de Meta.
 *
 * `GET`  — handshake de suscripción (`hub.mode=subscribe`, `hub.verify_token`,
 *          `hub.challenge`). Acepta el verify token global o el de una conexión.
 * `POST` — entrega de eventos (mensajes entrantes + estados delivered/read/failed).
 *          Verifica `x-hub-signature-256` (HMAC-SHA256 con App Secret), resuelve
 *          el negocio por `phone_number_id` y envía el payload a la ingesta.
 *
 * Meta espera una respuesta rápida y SIEMPRE 2xx para cortar reintentos; por eso
 * los fallos (firma inválida, negocio desconocido, App Secret ausente) se
 * registran con eventos `whatsapp.webhook.*` y se responden con 200.
 * La idempotencia la garantiza el unique `storeId_externalId` del inbox.
 */
import { NextRequest, NextResponse } from "next/server"
import { fireDomainEvent } from "@/lib/events"
import { parseWebhookPayload, verifyWebhookSignature } from "@/lib/communication"
import { readWhatsAppAppConfig } from "@/lib/whatsapp/config"
import { ChannelConnectionService } from "@/lib/whatsapp/connection-service"
import { WhatsAppIngestionService } from "@/lib/whatsapp/ingestion-service"
import { extractPhoneNumberId, verifyWhatsAppWebhook } from "@/lib/whatsapp/webhook"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const connections = new ChannelConnectionService()
const ingestion = new WhatsAppIngestionService()

export async function GET(request: NextRequest) {
  const appConfig = readWhatsAppAppConfig()
  const params = request.nextUrl.searchParams

  const local = verifyWhatsAppWebhook(params, appConfig.verifyToken)
  if (local.valid) {
    return new NextResponse(local.challenge, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    })
  }

  const verifyToken = params.get("hub.verify_token") ?? ""
  if (verifyToken) {
    const connection = await connections.resolveByVerifyToken(verifyToken)
    if (connection && params.get("hub.mode") === "subscribe") {
      const challenge = params.get("hub.challenge") ?? ""
      if (challenge) {
        return new NextResponse(challenge, {
          status: 200,
          headers: { "Content-Type": "text/plain" },
        })
      }
    }
  }

  return NextResponse.json({ error: "Verificación de webhook fallida" }, { status: 403 })
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  const signature = request.headers.get("x-hub-signature-256") ?? undefined

  let body: unknown
  try {
    body = rawBody ? JSON.parse(rawBody) : null
  } catch {
    return NextResponse.json({ status: "ignored" }, { status: 200 })
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ status: "ignored" }, { status: 200 })
  }

  const appConfig = readWhatsAppAppConfig()
  const phoneNumberId = extractPhoneNumberId(body)
  const connection = await connections.resolveByPhoneNumberId(phoneNumberId)

  if (!connection || connection.status === "revoked") {
    fireDomainEvent({
      type: "whatsapp.webhook.unresolved",
      data: { domain: "whatsapp", phoneNumberId },
      aggregateId: `wa:${phoneNumberId}`,
      aggregateType: "ChannelConnection",
      tenantId: "",
      actorId: undefined,
      source: "api.webhooks.whatsapp",
    })
    return NextResponse.json({ status: "ignored" }, { status: 200 })
  }

  const config = connections.parseConfig(connection)
  const appSecret = config.appSecret || appConfig.appSecret

  if (!appSecret || !verifyWebhookSignature(appSecret, rawBody, signature)) {
    fireDomainEvent({
      type: "whatsapp.webhook.invalid_signature",
      data: {
        domain: "whatsapp",
        connectionId: connection.id,
        phoneNumberId,
        missingAppSecret: !appSecret,
      },
      aggregateId: connection.id,
      aggregateType: "ChannelConnection",
      tenantId: connection.storeId,
      actorId: undefined,
      source: "api.webhooks.whatsapp",
    })
    return NextResponse.json({ status: "ignored" }, { status: 200 })
  }

  fireDomainEvent({
    type: "whatsapp.webhook.received",
    data: { domain: "whatsapp", connectionId: connection.id, phoneNumberId },
    aggregateId: connection.id,
    aggregateType: "ChannelConnection",
    tenantId: connection.storeId,
    actorId: undefined,
    source: "api.webhooks.whatsapp",
  })

  const events = parseWebhookPayload({
    providerId: "whatsapp",
    channel: "whatsapp",
    body: rawBody,
    headers: { "x-hub-signature-256": signature ?? "" },
  })

  const result = await ingestion.processInbound({ storeId: connection.storeId }, events)

  return NextResponse.json({ status: "ok", ...result }, { status: 200 })
}
