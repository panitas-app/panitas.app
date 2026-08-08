import { NextRequest, NextResponse } from "next/server"
import { csrfGuard } from "@/lib/csrf"
import { InboxChannelManager, INBOX_CHANNEL_TYPES } from "@/lib/inbox"
import { requireInboxStore, inboxErrorResponse } from "../_helpers"

const channels = new InboxChannelManager()

export async function GET() {
  const current = await requireInboxStore()
  if (!current) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  try {
    const rows = await channels.list(current.ctx)
    return NextResponse.json({ channels: rows })
  } catch (error: unknown) {
    return inboxErrorResponse(error, "Error al cargar los canales")
  }
}

export async function POST(request: NextRequest) {
  const csrf = csrfGuard(request)
  if (csrf) return csrf

  const current = await requireInboxStore()
  if (!current) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  let body: { type?: string; action?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 })
  }

  const type = body.type
  if (!type || !(INBOX_CHANNEL_TYPES as readonly string[]).includes(type)) {
    return NextResponse.json({ error: "Canal inválido" }, { status: 400 })
  }

  try {
    const channel =
      body.action === "disable"
        ? await channels.disable(current.ctx, type as never)
        : await channels.enable(current.ctx, type as never)
    return NextResponse.json({ channel })
  } catch (error: unknown) {
    return inboxErrorResponse(error, "Error al actualizar el canal")
  }
}
