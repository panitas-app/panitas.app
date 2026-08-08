import { NextResponse } from "next/server"
import { createKnowledgeService } from "@/lib/knowledge"
import { requireKnowledgeStore, knowledgeErrorResponse } from "../../../_helpers"

const knowledge = createKnowledgeService({ source: "api.knowledge" })

/** GET /api/knowledge/documents/[id]/history → auditoría del documento. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const current = await requireKnowledgeStore()
    if (!current) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    const { id } = await params
    const history = await knowledge.listHistory(current.ctx, { documentId: id, limit: 100 })
    return NextResponse.json({ history })
  } catch (error: unknown) {
    return knowledgeErrorResponse(error, "Error al cargar el historial")
  }
}
