/**
 * WhatsApp Cloud API (FASE 8A) — Descarga segura de media.
 *
 * `GET /api/inbox/channels/whatsapp/media/[mediaId]`
 *
 * Descarga el media desde la Graph API usando el access token del negocio (nunca
 * expuesto al cliente) y lo devuelve al navegador. Si la conexión no está activa
 * o la descarga falla, responde con un placeholder amigable (SVG) en vez de un
 * error seco, tal y como exige el contrato de media con fallback.
 */
import { NextRequest, NextResponse } from "next/server"
import { WhatsAppProvider } from "@/lib/communication"
import { readWhatsAppAppConfig } from "@/lib/whatsapp"
import { ChannelConnectionService } from "@/lib/whatsapp/connection-service"
import { isAllowedMetaMediaUrl, MEDIA_FETCH_TIMEOUT_MS } from "@/lib/platform/webhooks/ssrf"
import { requireInboxStore } from "../../../../_helpers"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const connections = new ChannelConnectionService()

const FALLBACK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="320" viewBox="0 0 480 320">
  <rect width="480" height="320" fill="#f1f5f9"/>
  <g fill="none" stroke="#94a3b8" stroke-width="3">
    <rect x="120" y="100" width="240" height="160" rx="12"/>
    <circle cx="170" cy="155" r="24"/>
    <path d="M150 240l60-60 40 40 30-30 50 50"/>
  </g>
  <text x="240" y="285" fill="#64748b" font-family="sans-serif" font-size="14" text-anchor="middle">Media de WhatsApp no disponible</text>
</svg>`

function fallbackResponse(): NextResponse {
  return new NextResponse(FALLBACK_SVG, {
    status: 200,
    headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=3600" },
  })
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ mediaId: string }> }) {
  const current = await requireInboxStore()
  if (!current) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { mediaId } = await params
  if (!mediaId) return fallbackResponse()

  try {
    const connection = await connections.get(current.ctx)
    if (!connection || connection.status !== "connected") return fallbackResponse()

    const config = connections.parseConfig(connection)
    if (!config.accessToken || !config.phoneNumberId) return fallbackResponse()

    const provider = new WhatsAppProvider(readWhatsAppAppConfig())
    await provider.connect(config)

    const media = await provider.downloadMedia(mediaId)
    if (!media.url) return fallbackResponse()

    // SSRF guard: solo hosts de Meta (graph/cdn), sin redirects, con timeout.
    if (!isAllowedMetaMediaUrl(media.url)) return fallbackResponse()

    const graphRes = await fetch(`${media.url}?access_token=${encodeURIComponent(config.accessToken)}`, {
      redirect: "error",
      signal: AbortSignal.timeout(MEDIA_FETCH_TIMEOUT_MS),
    })
    if (!graphRes.ok) return fallbackResponse()

    const bytes = Buffer.from(await graphRes.arrayBuffer())
    const contentType = media.type || graphRes.headers.get("content-type") || "application/octet-stream"
    return new NextResponse(bytes, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=3600",
        "Content-Disposition": media.name ? `inline; filename="${media.name.replace(/"/g, "")}"` : "inline",
      },
    })
  } catch {
    return fallbackResponse()
  }
}
