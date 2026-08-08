import { NextResponse } from "next/server"
import { InboxConversationService } from "@/lib/inbox"
import { requireInboxStore, inboxErrorResponse } from "../_helpers"

const conversations = new InboxConversationService()

export async function GET() {
  const current = await requireInboxStore()
  if (!current) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  try {
    const tags = await conversations.listTags(current.ctx)
    return NextResponse.json({ tags })
  } catch (error: unknown) {
    return inboxErrorResponse(error, "Error al cargar las etiquetas")
  }
}
