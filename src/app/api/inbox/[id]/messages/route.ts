import { NextRequest, NextResponse } from "next/server"
import { csrfGuard } from "@/lib/csrf"
import { InboxMessageService, type InboxSender, type InboxContentType } from "@/lib/inbox"
import { requireInboxStore, inboxErrorResponse } from "../../_helpers"

const messages = new InboxMessageService()

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const current = await requireInboxStore()
  if (!current) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id } = await params
  try {
    const rows = await messages.list(current.ctx, id)
    return NextResponse.json({ messages: rows })
  } catch (error: unknown) {
    return inboxErrorResponse(error, "Error al cargar los mensajes")
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const csrf = csrfGuard(request)
  if (csrf) return csrf

  const current = await requireInboxStore()
  if (!current) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id } = await params
  let body: {
    sender?: InboxSender
    content?: string
    contentType?: InboxContentType
    attachments?: Array<{ type: string; url: string; name?: string; size?: number }>
    channel?: string
    recipient?: string
    senderName?: string
    externalId?: string
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 })
  }

  if (!body.sender || !body.content) {
    return NextResponse.json({ error: "Faltan campos obligatorios (sender, content)" }, { status: 400 })
  }

  try {
    const message = await messages.addMessage(current.ctx, {
      conversationId: id,
      sender: body.sender,
      content: body.content,
      contentType: body.contentType,
      attachments: body.attachments,
      channel: body.channel as never,
      recipient: body.recipient,
      senderName: body.senderName,
      externalId: body.externalId,
    })
    return NextResponse.json(message, { status: 201 })
  } catch (error: unknown) {
    return inboxErrorResponse(error, "Error al enviar el mensaje")
  }
}
