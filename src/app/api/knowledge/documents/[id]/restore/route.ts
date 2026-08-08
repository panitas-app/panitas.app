import { NextResponse, type NextRequest } from "next/server"
import { csrfGuard } from "@/lib/csrf"
import { createKnowledgeService } from "@/lib/knowledge"
import { requireKnowledgeStore, knowledgeErrorResponse } from "../../../_helpers"

const knowledge = createKnowledgeService({ source: "api.knowledge" })

/**
 * POST /api/knowledge/documents/[id]/restore  { version }
 *   Restaura el contenido de una versión anterior (crea una versión nueva).
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const csrf = csrfGuard(request)
  if (csrf) return csrf

  try {
    const current = await requireKnowledgeStore()
    if (!current) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    const { id } = await params
    const body = await request.json().catch(() => ({}))
    if (typeof body.version !== "number") {
      return NextResponse.json({ error: "Indica la versión a restaurar" }, { status: 400 })
    }
    const document = await knowledge.restoreVersion(current.ctx, id, body.version)
    return NextResponse.json({ document })
  } catch (error: unknown) {
    return knowledgeErrorResponse(error, "Error al restaurar la versión")
  }
}
