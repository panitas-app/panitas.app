import { NextRequest, NextResponse } from "next/server"
import { csrfGuard } from "@/lib/csrf"
import { InboxConversationService, type InboxStatus, type InboxPriority } from "@/lib/inbox"
import { requireInboxStore, inboxErrorResponse } from "../_helpers"

const conversations = new InboxConversationService()

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const current = await requireInboxStore()
  if (!current) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id } = await params
  try {
    const detail = await conversations.get(current.ctx, id)
    return NextResponse.json(detail)
  } catch (error: unknown) {
    return inboxErrorResponse(error, "Error al cargar la conversación")
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const csrf = csrfGuard(request)
  if (csrf) return csrf

  const current = await requireInboxStore()
  if (!current) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id } = await params
  let body: {
    status?: InboxStatus
    priority?: InboxPriority
    isPinned?: boolean
    title?: string
    assignedToId?: string | null
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 })
  }

  try {
    if (body.assignedToId !== undefined) {
      await conversations.assign(current.ctx, id, body.assignedToId)
    }
    const detail = await conversations.update(current.ctx, id, {
      status: body.status,
      priority: body.priority,
      isPinned: body.isPinned,
      title: body.title,
    })
    return NextResponse.json(detail)
  } catch (error: unknown) {
    return inboxErrorResponse(error, "Error al actualizar la conversación")
  }
}
