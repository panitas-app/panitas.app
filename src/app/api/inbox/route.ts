import { NextRequest, NextResponse } from "next/server"
import { csrfGuard } from "@/lib/csrf"
import { InboxConversationService } from "@/lib/inbox"
import { requireInboxStore, inboxErrorResponse } from "./_helpers"

const conversations = new InboxConversationService()

export async function GET(request: NextRequest) {
  const current = await requireInboxStore()
  if (!current) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const status = (searchParams.get("status") ?? "all") as "all" | "nueva" | "pendiente" | "en_atencion" | "resuelta" | "archivada"
  const channel = (searchParams.get("channel") ?? "all") as
    | "all"
    | "whatsapp"
    | "instagram"
    | "messenger"
    | "webchat"
    | "email"
    | "other"
  const tag = searchParams.get("tag") ?? undefined
  const search = searchParams.get("search") ?? undefined
  const assigned = searchParams.get("assigned") ?? undefined
  const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : undefined

  try {
    const result = await conversations.list(current.ctx, { status, channel, tag, search, assigned, limit })
    return NextResponse.json(result)
  } catch (error: unknown) {
    return inboxErrorResponse(error, "Error al cargar las conversaciones")
  }
}

export async function POST(request: NextRequest) {
  const csrf = csrfGuard(request)
  if (csrf) return csrf

  const current = await requireInboxStore()
  if (!current) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  let body: {
    channelType?: string
    title?: string
    customerId?: string
    identifier?: string
    customerName?: string
    customerPhone?: string
    customerEmail?: string
    externalRef?: string
    initialMessage?: string
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 })
  }

  try {
    const detail = await conversations.create(current.ctx, {
      channelType: body.channelType as never,
      title: body.title,
      customerId: body.customerId,
      identifier: body.identifier,
      customerName: body.customerName,
      customerPhone: body.customerPhone,
      customerEmail: body.customerEmail,
      externalRef: body.externalRef,
      initialMessage: body.initialMessage,
    })
    return NextResponse.json(detail, { status: 201 })
  } catch (error: unknown) {
    return inboxErrorResponse(error, "Error al crear la conversación")
  }
}
