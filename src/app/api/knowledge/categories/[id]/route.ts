import { NextResponse, type NextRequest } from "next/server"
import { csrfGuard } from "@/lib/csrf"
import { createKnowledgeService } from "@/lib/knowledge"
import { requireKnowledgeStore, knowledgeErrorResponse } from "../../_helpers"

const knowledge = createKnowledgeService({ source: "api.knowledge" })

/**
 * PATCH  /api/knowledge/categories/[id]  { name?, description?, color? }
 * DELETE /api/knowledge/categories/[id]
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const csrf = csrfGuard(request)
  if (csrf) return csrf

  try {
    const current = await requireKnowledgeStore()
    if (!current) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    const { id } = await params
    const body = await request.json().catch(() => ({}))
    await knowledge.updateCategory(current.ctx, id, {
      name: typeof body.name === "string" ? body.name : undefined,
      description: body.description !== undefined && body.description !== null ? body.description : undefined,
      color: typeof body.color === "string" ? body.color : undefined,
    })
    return NextResponse.json({ ok: true })
  } catch (error: unknown) {
    return knowledgeErrorResponse(error, "Error al actualizar la categoría")
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const csrf = csrfGuard(request)
  if (csrf) return csrf

  try {
    const current = await requireKnowledgeStore()
    if (!current) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    const { id } = await params
    await knowledge.deleteCategory(current.ctx, id)
    return NextResponse.json({ ok: true })
  } catch (error: unknown) {
    return knowledgeErrorResponse(error, "Error al eliminar la categoría")
  }
}
