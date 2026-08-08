import { NextRequest, NextResponse } from "next/server"
import { csrfGuard } from "@/lib/csrf"
import { prisma } from "@/lib/prisma"
import { InboxMessageService, type InboxSender, type InboxContentType } from "@/lib/inbox"
import { sendAgentMessage } from "@/lib/whatsapp/send-service"
import { sendMetaAgentMessage } from "@/lib/meta/send-service"
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

    let externalId: string | null = null
    if (body.sender === "agent") {
      try {
        const conversation = await prisma.inboxConversation.findUnique({
          where: { id },
          select: { channel: { select: { type: true } } },
        })
        const channelType = conversation?.channel.type
        const outcome =
          channelType === "instagram" || channelType === "messenger"
            ? await sendMetaAgentMessage(current.ctx, id, channelType, {
                text: body.content,
                contentType: body.contentType,
                attachments: body.attachments,
              })
            : await sendAgentMessage(current.ctx, id, {
                text: body.content,
                contentType: body.contentType,
                attachments: body.attachments,
              })
        externalId = outcome.externalId
        if (externalId) {
          await prisma.inboxMessage.update({
            where: { id: message.id },
            data: { externalId },
          })
        }
      } catch {
        await prisma.inboxMessage.update({
          where: { id: message.id },
          data: { status: "failed" },
        })
        throw new Error("No se pudo enviar el mensaje por el canal")
      }
    }

    return NextResponse.json({ ...message, externalId }, { status: 201 })
  } catch (error: unknown) {
    return inboxErrorResponse(error, "Error al enviar el mensaje")
  }
}
