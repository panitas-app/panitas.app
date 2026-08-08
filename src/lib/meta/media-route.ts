/**
 * Instagram + Messenger (FASE 8B) — Descarga segura de media (ruta).
 *
 * `GET /api/inbox/channels/{instagram,messenger}/media/[mediaId]`
 *
 * Busca la URL del adjunto almacenada con el mensaje (el access token del
 * negocio nunca sale del servidor) y la proxy al navegador. Si no se encuentra
 * o la descarga falla, responde con un placeholder amigable (SVG) en vez de un
 * error seco, tal y como exige el contrato de media con fallback.
 */
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireInboxStore } from "@/app/api/inbox/_helpers"
import { MetaConnectionService } from "./connection-service"
import { META_FALLBACK_SVG, fetchMetaMedia, resolveMetaAttachmentUrl } from "./media"
import type { MetaChannel } from "./config"

const connections = new MetaConnectionService()

function fallbackResponse(): NextResponse {
  return new NextResponse(META_FALLBACK_SVG, {
    status: 200,
    headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=3600" },
  })
}

export async function metaMediaGet(
  request: NextRequest,
  params: { mediaId: string },
  channel: MetaChannel,
): Promise<NextResponse> {
  const current = await requireInboxStore()
  if (!current) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const mediaId = params.mediaId?.trim()
  if (!mediaId) return fallbackResponse()

  try {
    const connection = await connections.get(current.ctx, channel)
    if (!connection || connection.status !== "connected") return fallbackResponse()
    const config = connections.parseConfig(connection)
    if (!config.accessToken || !config.accountId) return fallbackResponse()

    const url = await resolveMetaAttachmentUrl(prisma, current.ctx, channel, mediaId)
    if (!url) return fallbackResponse()

    const media = await fetchMetaMedia(url, config.accessToken)
    if (!media) return fallbackResponse()

    return new NextResponse(media.bytes, {
      status: 200,
      headers: {
        "Content-Type": media.contentType,
        "Cache-Control": "private, max-age=3600",
        "Content-Disposition": "inline",
      },
    })
  } catch {
    return fallbackResponse()
  }
}
