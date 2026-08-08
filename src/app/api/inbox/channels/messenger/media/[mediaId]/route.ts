/**
 * Messenger (FASE 8B) — Descarga segura de media con fallback amigable.
 */
import { NextRequest } from "next/server"
import { metaMediaGet } from "@/lib/meta/media-route"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(_request: NextRequest, { params }: { params: Promise<{ mediaId: string }> }) {
  const { mediaId } = await params
  return metaMediaGet(_request, { mediaId }, "messenger")
}
