import { NextRequest, NextResponse } from "next/server"
import { csrfGuard } from "@/lib/csrf"
import { InboxConversationAiService, type InboxAiActionKind } from "@/lib/inbox"
import { requireInboxStore, inboxErrorResponse } from "../../_helpers"

const ai = new InboxConversationAiService()

const ACTIONS: Record<string, InboxAiActionKind> = {
  summary: "summary",
  intent: "intent",
  suggestion: "suggestion",
  relevant_history: "relevant_history",
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const current = await requireInboxStore()
  if (!current) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id } = await params
  const kind = new URL(request.url).searchParams.get("kind") as InboxAiActionKind | null
  try {
    const rows = await ai.list(current.ctx, id, kind ?? undefined)
    return NextResponse.json({ results: rows })
  } catch (error: unknown) {
    return inboxErrorResponse(error, "Error al cargar los análisis")
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const csrf = csrfGuard(request)
  if (csrf) return csrf

  const current = await requireInboxStore()
  if (!current) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id } = await params
  let body: { action?: string; query?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 })
  }

  const action = body.action ? ACTIONS[body.action] : undefined
  if (!action) {
    return NextResponse.json(
      { error: "Acción inválida. Usa: summary, intent, suggestion, relevant_history" },
      { status: 400 },
    )
  }

  try {
    let result
    switch (action) {
      case "summary":
        result = await ai.summarize(current.ctx, id)
        break
      case "intent":
        result = await ai.analyzeIntent(current.ctx, id)
        break
      case "suggestion":
        result = await ai.suggestReply(current.ctx, id)
        break
      case "relevant_history":
        result = await ai.relevantHistory(current.ctx, id, body.query ?? "")
        break
    }
    return NextResponse.json(result)
  } catch (error: unknown) {
    return inboxErrorResponse(error, "Error al ejecutar la acción IA")
  }
}
