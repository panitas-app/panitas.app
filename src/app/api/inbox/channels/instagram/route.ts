/**
 * Instagram (FASE 8B) — Gestión de la conexión de Instagram del negocio.
 */
import { NextRequest, NextResponse } from "next/server"
import { requireInboxStore } from "../../_helpers"
import { metaChannelGate, metaChannelGet, metaChannelPost } from "@/lib/meta/channel-route"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  const current = await requireInboxStore()
  if (!current) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const gated = metaChannelGate(current.store, "instagram")
  if (gated) return gated
  return metaChannelGet(current, "instagram")
}

export async function POST(request: NextRequest) {
  const current = await requireInboxStore()
  if (!current) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const gated = metaChannelGate(current.store, "instagram")
  if (gated) return gated
  return metaChannelPost(request, current, "instagram")
}
