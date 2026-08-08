import { NextResponse, type NextRequest } from "next/server"
import { csrfGuard } from "@/lib/csrf"
import { createKnowledgeService } from "@/lib/knowledge"
import { requireKnowledgeStore, knowledgeErrorResponse } from "../_helpers"

const knowledge = createKnowledgeService({ source: "api.knowledge" })

/**
 * GET  /api/knowledge/tags
 *   Lista las etiquetas de la tienda.
 *
 * POST /api/knowledge/tags  { name }
 *   Crea una etiqueta.
 */
export async function GET() {
  try {
    const current = await requireKnowledgeStore()
    if (!current) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    const tags = await knowledge.listTags(current.ctx)
    return NextResponse.json({ tags })
  } catch (error: unknown) {
    return knowledgeErrorResponse(error, "Error al listar etiquetas")
  }
}

export async function POST(request: NextRequest) {
  const csrf = csrfGuard(request)
  if (csrf) return csrf

  try {
    const current = await requireKnowledgeStore()
    if (!current) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    const body = await request.json().catch(() => null)
    if (!body || typeof body.name !== "string") {
      return NextResponse.json({ error: "Falta el nombre de la etiqueta" }, { status: 400 })
    }
    const tag = await knowledge.createTag(current.ctx, body.name)
    return NextResponse.json({ tag }, { status: 201 })
  } catch (error: unknown) {
    return knowledgeErrorResponse(error, "Error al crear la etiqueta")
  }
}
