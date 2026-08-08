import { NextRequest, NextResponse } from "next/server"
import { InboxConversationContextService } from "@/lib/inbox"
import { requireInboxStore, inboxErrorResponse } from "../../_helpers"

const context = new InboxConversationContextService()

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const current = await requireInboxStore()
  if (!current) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id } = await params
  try {
    const ctx = await context.build(current.ctx, id)
    return NextResponse.json(ctx)
  } catch (error: unknown) {
    return inboxErrorResponse(error, "Error al cargar el contexto del cliente")
  }
}
