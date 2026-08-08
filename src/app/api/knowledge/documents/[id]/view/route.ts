import { NextResponse, type NextRequest } from "next/server"
import { csrfGuard } from "@/lib/csrf"
import { createKnowledgeService } from "@/lib/knowledge"
import { requireKnowledgeStore, knowledgeErrorResponse } from "../../../_helpers"

const knowledge = createKnowledgeService({ source: "api.knowledge" })

/** POST /api/knowledge/documents/[id]/view → registra una vista (auditada). */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const csrf = csrfGuard(request)
  if (csrf) return csrf

  try {
    const current = await requireKnowledgeStore()
    if (!current) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    const { id } = await params
    await knowledge.recordView(current.ctx, id)
    return NextResponse.json({ ok: true })
  } catch (error: unknown) {
    return knowledgeErrorResponse(error, "Error al registrar la vista")
  }
}
