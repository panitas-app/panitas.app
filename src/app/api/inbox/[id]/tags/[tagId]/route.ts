import { NextRequest, NextResponse } from "next/server"
import { csrfGuard } from "@/lib/csrf"
import { InboxConversationService } from "@/lib/inbox"
import { requireInboxStore, inboxErrorResponse } from "../../../_helpers"

const conversations = new InboxConversationService()

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; tagId: string }> },
) {
  const csrf = csrfGuard(_request)
  if (csrf) return csrf

  const current = await requireInboxStore()
  if (!current) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id, tagId } = await params
  try {
    await conversations.removeTag(current.ctx, id, tagId)
    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    return inboxErrorResponse(error, "Error al quitar la etiqueta")
  }
}
