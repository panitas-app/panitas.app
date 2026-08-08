import { NextRequest, NextResponse } from "next/server"
import { csrfGuard } from "@/lib/csrf"
import { InboxConversationService } from "@/lib/inbox"
import { requireInboxStore, inboxErrorResponse } from "../../_helpers"

const conversations = new InboxConversationService()

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const csrf = csrfGuard(request)
  if (csrf) return csrf

  const current = await requireInboxStore()
  if (!current) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id } = await params
  let body: { content?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 })
  }

  try {
    const note = await conversations.addNote(current.ctx, id, body.content ?? "")
    return NextResponse.json(note, { status: 201 })
  } catch (error: unknown) {
    return inboxErrorResponse(error, "Error al guardar la nota")
  }
}
