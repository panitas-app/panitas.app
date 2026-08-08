import { NextResponse, type NextRequest } from "next/server"
import { csrfGuard } from "@/lib/csrf"
import { createKnowledgeService } from "@/lib/knowledge"
import { requireKnowledgeStore, knowledgeErrorResponse } from "../../../_helpers"

const knowledge = createKnowledgeService({ source: "api.knowledge" })

/**
 * POST /api/knowledge/documents/[id]/archive
 *   Mueve el documento a archivado (borrado lógico).
 *
 * POST /api/knowledge/documents/[id]/archive  { action: "unarchive" }
 *   Lo devuelve a publicado.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const csrf = csrfGuard(request)
  if (csrf) return csrf

  try {
    const current = await requireKnowledgeStore()
    if (!current) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    const { id } = await params
    await knowledge.archiveDocument(current.ctx, id)
    return NextResponse.json({ ok: true })
  } catch (error: unknown) {
    return knowledgeErrorResponse(error, "Error al archivar el documento")
  }
}
