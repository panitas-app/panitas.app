/**
 * Messenger (FASE 8B) — Webhook de Meta.
 *
 * `GET`  — handshake de suscripción de Messenger webhooks.
 * `POST` — entrega de eventos (mensajes entrantes + delivery/read) con firma
 *          `x-hub-signature-256` e ingesta idempotente al inbox.
 */
import { NextRequest } from "next/server"
import { metaWebhookGet, metaWebhookPost } from "@/lib/meta/webhook-route"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  return metaWebhookGet(request, "messenger")
}

export async function POST(request: NextRequest) {
  return metaWebhookPost(request, "messenger")
}
