import { NextResponse, type NextRequest } from "next/server"
import { csrfGuard } from "@/lib/csrf"
import { createKnowledgeService } from "@/lib/knowledge"
import { requireKnowledgeStore, knowledgeErrorResponse } from "../_helpers"

const knowledge = createKnowledgeService({ source: "api.knowledge" })

/**
 * GET  /api/knowledge/categories
 *   Lista las categorías de la tienda (incluye las del sistema).
 *
 * POST /api/knowledge/categories  { name, description?, color? }
 *   Crea una categoría personalizada.
 */
export async function GET() {
  try {
    const current = await requireKnowledgeStore()
    if (!current) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    await knowledge.ensureSystemCategories(current.ctx)
    const categories = await knowledge.listCategories(current.ctx)
    return NextResponse.json({ categories })
  } catch (error: unknown) {
    return knowledgeErrorResponse(error, "Error al listar categorías")
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
      return NextResponse.json({ error: "Falta el nombre de la categoría" }, { status: 400 })
    }
    const category = await knowledge.createCategory(current.ctx, {
      name: body.name,
      description: typeof body.description === "string" ? body.description : undefined,
      color: typeof body.color === "string" ? body.color : undefined,
    })
    return NextResponse.json({ category }, { status: 201 })
  } catch (error: unknown) {
    return knowledgeErrorResponse(error, "Error al crear la categoría")
  }
}
