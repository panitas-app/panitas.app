import { NextRequest, NextResponse } from "next/server"
import { csrfGuard } from "@/lib/csrf"
import { InboxMessageService } from "@/lib/inbox"
import { requireInboxStore, inboxErrorResponse } from "../../_helpers"

const messages = new InboxMessageService()

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const csrf = csrfGuard(request)
  if (csrf) return csrf

  const current = await requireInboxStore()
  if (!current) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id } = await params
  try {
    await messages.markRead(current.ctx, id)
    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    return inboxErrorResponse(error, "Error al marcar como leído")
  }
}
