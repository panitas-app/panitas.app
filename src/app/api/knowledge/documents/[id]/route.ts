import { NextResponse, type NextRequest } from "next/server"
import { csrfGuard } from "@/lib/csrf"
import { createKnowledgeService } from "@/lib/knowledge"
import { requireKnowledgeStore, knowledgeErrorResponse } from "../../_helpers"

const knowledge = createKnowledgeService({ source: "api.knowledge" })

/**
 * GET    /api/knowledge/documents/[id]  → documento completo
 * PATCH  /api/knowledge/documents/[id]  { title?, content?, summary?, type?, status?, categoryIds?, tagIds?, changeNote? }
 * DELETE /api/knowledge/documents/[id]  → eliminación definitiva (auditada)
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const current = await requireKnowledgeStore()
    if (!current) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    const { id } = await params
    const document = await knowledge.getDocument(current.ctx, id)
    return NextResponse.json({ document })
  } catch (error: unknown) {
    return knowledgeErrorResponse(error, "Error al cargar el documento")
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const csrf = csrfGuard(request)
  if (csrf) return csrf

  try {
    const current = await requireKnowledgeStore()
    if (!current) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const document = await knowledge.updateDocument(current.ctx, id, {
      title: typeof body.title === "string" ? body.title : undefined,
      content: typeof body.content === "string" ? body.content : undefined,
      summary: body.summary !== undefined ? body.summary : undefined,
      type: typeof body.type === "string" ? body.type : undefined,
      status: typeof body.status === "string" ? body.status : undefined,
      categoryIds: Array.isArray(body.categoryIds) ? body.categoryIds.filter((c: unknown) => typeof c === "string") : undefined,
      tagIds: Array.isArray(body.tagIds) ? body.tagIds.filter((t: unknown) => typeof t === "string") : undefined,
      changeNote: typeof body.changeNote === "string" ? body.changeNote : undefined,
    })
    return NextResponse.json({ document })
  } catch (error: unknown) {
    return knowledgeErrorResponse(error, "Error al actualizar el documento")
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const csrf = csrfGuard(request)
  if (csrf) return csrf

  try {
    const current = await requireKnowledgeStore()
    if (!current) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    const { id } = await params
    await knowledge.deleteDocument(current.ctx, id)
    return NextResponse.json({ ok: true })
  } catch (error: unknown) {
    return knowledgeErrorResponse(error, "Error al eliminar el documento")
  }
}
