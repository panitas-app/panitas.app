import { NextRequest, NextResponse } from "next/server"
import { csrfGuard } from "@/lib/csrf"
import { CopilotService } from "@/lib/conversation-ai"
import { requireInboxStore, inboxErrorResponse } from "../../_helpers"

const copilot = new CopilotService()

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const current = await requireInboxStore()
  if (!current) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id } = await params
  try {
    const analysis = await copilot.analyze(current.ctx, id)
    return NextResponse.json({ analysis })
  } catch (error: unknown) {
    return inboxErrorResponse(error, "Error al cargar el análisis del copiloto")
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const csrf = csrfGuard(request)
  if (csrf) return csrf

  const current = await requireInboxStore()
  if (!current) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id } = await params
  let body: { action?: string; question?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 })
  }

  const action = body.action ?? ""
  if (action === "analyze") {
    try {
      const analysis = await copilot.analyze(current.ctx, id, { force: true })
      return NextResponse.json({ analysis })
    } catch (error: unknown) {
      return inboxErrorResponse(error, "Error al re-analizar la conversación")
    }
  }

  if (action === "query") {
    const question = body.question?.trim()
    if (!question) {
      return NextResponse.json({ error: "Escribe una pregunta para consultar" }, { status: 400 })
    }
    try {
      const answer = await copilot.query(current.ctx, id, question)
      return NextResponse.json({ answer })
    } catch (error: unknown) {
      return inboxErrorResponse(error, "Error al responder la consulta")
    }
  }

  return NextResponse.json({ error: "Acción inválida. Usa: analyze, query" }, { status: 400 })
}
