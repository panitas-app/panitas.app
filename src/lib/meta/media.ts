/**
 * Instagram + Messenger (FASE 8B) — Descarga segura de media.
 *
 * Meta messaging entrega los adjuntos con su URL dentro del webhook (los
 * mensajes guardan `{ type, url, mediaId }` en `InboxMessage.attachments`).
 * Este helper localiza la URL almacenada por `mediaId` y permite a la ruta
 * proxyarla con el access token del negocio (que nunca sale del servidor).
 * Si no se encuentra o falla, la ruta responde con el placeholder amigable.
 */
import type { PrismaClient } from "@prisma/client"
import type { InboxContext } from "@/lib/inbox"
import type { MetaChannel } from "./config"

export const META_FALLBACK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="320" viewBox="0 0 480 320">
  <rect width="480" height="320" fill="#f1f5f9"/>
  <g fill="none" stroke="#94a3b8" stroke-width="3">
    <rect x="120" y="100" width="240" height="160" rx="12"/>
    <circle cx="170" cy="155" r="24"/>
    <path d="M150 240l60-60 40 40 30-30 50 50"/>
  </g>
  <text x="240" y="285" fill="#64748b" font-family="sans-serif" font-size="14" text-anchor="middle">Media no disponible</text>
</svg>`

interface StoredAttachment {
  type?: string
  url?: string
  name?: string
  mediaId?: string
}

/** Busca en los mensajes del canal el adjunto con `mediaId` y devuelve su URL. */
export async function resolveMetaAttachmentUrl(
  db: PrismaClient,
  ctx: Pick<InboxContext, "storeId">,
  channel: MetaChannel,
  mediaId: string,
): Promise<string | null> {
  if (!mediaId) return null
  const rows = await db.inboxMessage.findMany({
    where: { storeId: ctx.storeId, channel, attachments: { contains: mediaId } },
    select: { attachments: true },
    take: 20,
  })
  for (const row of rows) {
    if (!row.attachments) continue
    let parsed: StoredAttachment[] = []
    try {
      const value = JSON.parse(row.attachments) as unknown
      if (Array.isArray(value)) parsed = value as StoredAttachment[]
    } catch {
      continue
    }
    for (const attachment of parsed) {
      if (attachment.mediaId === mediaId && attachment.url) return attachment.url
    }
  }
  return null
}

/** Descarga la URL de media (con o sin access token) o devuelve null. */
export async function fetchMetaMedia(
  url: string,
  accessToken: string,
): Promise<{ bytes: Uint8Array<ArrayBuffer>; contentType: string } | null> {
  const attempts: Array<string | undefined> = [accessToken, undefined]
  for (const token of attempts) {
    try {
      const res = await fetch(token ? `${url}?access_token=${encodeURIComponent(token)}` : url)
      if (!res.ok) continue
      const bytes = new Uint8Array(await res.arrayBuffer())
      const contentType = res.headers.get("content-type") || "application/octet-stream"
      return { bytes, contentType }
    } catch {
      continue
    }
  }
  return null
}
