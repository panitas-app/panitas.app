/**
 * Instagram + Messenger (FASE 8B) — Manejador compartido de webhooks.
 *
 * `GET`  — handshake de suscripción (`hub.mode=subscribe`, `hub.verify_token`,
 *          `hub.challenge`). Acepta el verify token global o el de una conexión.
 * `POST` — entrega de eventos (mensajes entrantes + delivery/read). Verifica
 *          `x-hub-signature-256` (HMAC-SHA256 con App Secret), resuelve el
 *          negocio por el account id (`entry[].id`) y envía el payload a la
 *          ingesta idempotente.
 *
 * Meta espera una respuesta rápida y SIEMPRE 2xx para cortar reintentos; por eso
 * los fallos (firma inválida, negocio desconocido, App Secret ausente) se
 * registran con eventos `instagram.webhook.*` / `messenger.webhook.*` y se
 * responden con 200. La idempotencia la garantiza el unique
 * `storeId_externalId` del inbox.
 */
import { NextRequest, NextResponse } from "next/server"
import { fireDomainEvent } from "@/lib/events"
import { parseWebhookPayload, verifyWebhookSignature } from "@/lib/communication"
import { readMetaAppConfig } from "./config"
import { MetaConnectionService } from "./connection-service"
import { MetaIngestionService } from "./ingestion-service"
import { extractMetaPageId, verifyMetaWebhook } from "./webhook"
import type { MetaChannel } from "./config"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const connections = new MetaConnectionService()

export async function metaWebhookGet(request: NextRequest, channel: MetaChannel) {
  const appConfig = readMetaAppConfig()
  const params = request.nextUrl.searchParams

  const local = verifyMetaWebhook(params, appConfig.verifyToken)
  if (local.valid) {
    return new NextResponse(local.challenge, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    })
  }

  const verifyToken = params.get("hub.verify_token") ?? ""
  if (verifyToken) {
    const connection = await connections.resolveByVerifyToken(channel, verifyToken)
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

export async function metaWebhookPost(request: NextRequest, channel: MetaChannel) {
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

  const appConfig = readMetaAppConfig()
  const accountId = extractMetaPageId(body)
  const connection = await connections.resolveByExternalRef(channel, accountId)

  if (!connection || connection.status === "revoked") {
    fireDomainEvent({
      type: `${channel}.webhook.unresolved`,
      data: { domain: channel, accountId },
      aggregateId: `${channel}:${accountId}`,
      aggregateType: "ChannelConnection",
      tenantId: "",
      actorId: undefined,
      source: `api.webhooks.${channel}`,
    })
    return NextResponse.json({ status: "ignored" }, { status: 200 })
  }

  const config = connections.parseConfig(connection)
  const appSecret = config.appSecret || appConfig.appSecret

  if (!appSecret || !verifyWebhookSignature(appSecret, rawBody, signature)) {
    fireDomainEvent({
      type: `${channel}.webhook.invalid_signature`,
      data: {
        domain: channel,
        connectionId: connection.id,
        accountId,
        missingAppSecret: !appSecret,
      },
      aggregateId: connection.id,
      aggregateType: "ChannelConnection",
      tenantId: connection.storeId,
      actorId: undefined,
      source: `api.webhooks.${channel}`,
    })
    return NextResponse.json({ status: "ignored" }, { status: 200 })
  }

  fireDomainEvent({
    type: `${channel}.webhook.received`,
    data: { domain: channel, connectionId: connection.id, accountId },
    aggregateId: connection.id,
    aggregateType: "ChannelConnection",
    tenantId: connection.storeId,
    actorId: undefined,
    source: `api.webhooks.${channel}`,
  })

  const events = parseWebhookPayload({
    providerId: channel,
    channel,
    body: rawBody,
    headers: { "x-hub-signature-256": signature ?? "" },
  })

  const ingestion = new MetaIngestionService(channel)
  const result = await ingestion.processInbound({ storeId: connection.storeId }, events)

  return NextResponse.json({ status: "ok", ...result }, { status: 200 })
}
