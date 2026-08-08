import { NextResponse } from "next/server"
import { createKnowledgeService } from "@/lib/knowledge"
import { requireKnowledgeStore, knowledgeErrorResponse } from "../../../_helpers"

const knowledge = createKnowledgeService({ source: "api.knowledge" })

/** GET /api/knowledge/documents/[id]/versions → historial de versiones. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const current = await requireKnowledgeStore()
    if (!current) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    const { id } = await params
    const versions = await knowledge.listVersions(current.ctx, id)
    return NextResponse.json({ versions })
  } catch (error: unknown) {
    return knowledgeErrorResponse(error, "Error al listar versiones")
  }
}
