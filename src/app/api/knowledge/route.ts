import { NextResponse, type NextRequest } from "next/server"
import { csrfGuard } from "@/lib/csrf"
import { createKnowledgeService } from "@/lib/knowledge"
import { requireKnowledgeStore, knowledgeErrorResponse } from "./_helpers"

const knowledge = createKnowledgeService({ source: "api.knowledge" })

/**
 * GET  /api/knowledge
 *   Lista documentos del tenant (todos los estados para gestión) con filtros:
 *   ?status=&type=&categoryId=&tagId=&authorId=&query=&limit=&offset=
 *   También siembra las categorías del sistema si faltan.
 *
 * POST /api/knowledge  { title?, content, summary?, type?, status?, categoryIds?, tagIds? }
 *   Crea un documento (publicado por defecto).
 */
export async function GET(request: NextRequest) {
  try {
    const current = await requireKnowledgeStore()
    if (!current) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    const { ctx } = current

    await knowledge.ensureSystemCategories(ctx)
    const search = request.nextUrl.searchParams
    const result = await knowledge.listDocuments(ctx, {
      status: search.get("status") ?? undefined,
      type: search.get("type") ?? undefined,
      categoryId: search.get("categoryId") ?? undefined,
      tagId: search.get("tagId") ?? undefined,
      authorId: search.get("authorId") ?? undefined,
      query: search.get("query") ?? undefined,
      limit: Number(search.get("limit") ?? 20),
      offset: Number(search.get("offset") ?? 0),
    })
    return NextResponse.json(result)
  } catch (error: unknown) {
    return knowledgeErrorResponse(error, "Error al listar documentos")
  }
}

export async function POST(request: NextRequest) {
  const csrf = csrfGuard(request)
  if (csrf) return csrf

  try {
    const current = await requireKnowledgeStore()
    if (!current) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    const { ctx } = current

    const body = await request.json().catch(() => null)
    if (!body) return NextResponse.json({ error: "JSON inválido" }, { status: 400 })
    if (typeof body.content !== "string" && typeof body.title !== "string" && typeof body.fileName !== "string") {
      return NextResponse.json({ error: "El documento necesita contenido, título o un archivo" }, { status: 400 })
    }

    const document = await knowledge.createDocument(ctx, {
      title: typeof body.title === "string" ? body.title : undefined,
      content: typeof body.content === "string" ? body.content : "",
      summary: typeof body.summary === "string" ? body.summary : undefined,
      type: typeof body.type === "string" ? body.type : undefined,
      status: typeof body.status === "string" ? body.status : undefined,
      fileName: typeof body.fileName === "string" ? body.fileName : null,
      fileUrl: typeof body.fileUrl === "string" ? body.fileUrl : null,
      fileType: typeof body.fileType === "string" ? body.fileType : null,
      fileSize: typeof body.fileSize === "number" ? body.fileSize : null,
      categoryIds: Array.isArray(body.categoryIds) ? body.categoryIds.filter((c: unknown) => typeof c === "string") : [],
      tagIds: Array.isArray(body.tagIds) ? body.tagIds.filter((t: unknown) => typeof t === "string") : [],
      changeNote: typeof body.changeNote === "string" ? body.changeNote : undefined,
    })
    return NextResponse.json({ document }, { status: 201 })
  } catch (error: unknown) {
    return knowledgeErrorResponse(error, "Error al crear el documento")
  }
}
