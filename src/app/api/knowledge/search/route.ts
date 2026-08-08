import { NextResponse, type NextRequest } from "next/server"
import { csrfGuard } from "@/lib/csrf"
import { createKnowledgeService } from "@/lib/knowledge"
import { requireKnowledgeStore, knowledgeErrorResponse } from "../_helpers"

const knowledge = createKnowledgeService({ source: "api.knowledge" })

/**
 * GET  /api/knowledge/search?query=&categoryId=&categorySlug=&tagId=&tagSlug=&type=&from=&to=&limit=
 *   Búsqueda híbrida (keywords + fuzzy) sobre documentos publicados del tenant.
 *
 * POST /api/knowledge/search  { query?, filters... }
 *   Variante POST con el mismo contrato.
 */
export async function GET(request: NextRequest) {
  try {
    const current = await requireKnowledgeStore()
    if (!current) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    const s = request.nextUrl.searchParams
    const result = await knowledge.search(current.ctx, {
      query: s.get("query") ?? undefined,
      categoryId: s.get("categoryId") ?? undefined,
      categorySlug: s.get("categorySlug") ?? undefined,
      tagId: s.get("tagId") ?? undefined,
      tagSlug: s.get("tagSlug") ?? undefined,
      type: s.get("type") ?? undefined,
      status: s.get("status") ?? undefined,
      authorId: s.get("authorId") ?? undefined,
      from: s.get("from") ?? undefined,
      to: s.get("to") ?? undefined,
      limit: Number(s.get("limit") ?? 10),
      offset: Number(s.get("offset") ?? 0),
    })
    return NextResponse.json(result)
  } catch (error: unknown) {
    return knowledgeErrorResponse(error, "Error al buscar en la Base de Conocimiento")
  }
}

export async function POST(request: NextRequest) {
  const csrf = csrfGuard(request)
  if (csrf) return csrf

  try {
    const current = await requireKnowledgeStore()
    if (!current) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const body = await request.json().catch(() => ({}))
    const result = await knowledge.search(current.ctx, {
      query: typeof body.query === "string" ? body.query : undefined,
      categoryId: typeof body.categoryId === "string" ? body.categoryId : undefined,
      categorySlug: typeof body.categorySlug === "string" ? body.categorySlug : undefined,
      tagId: typeof body.tagId === "string" ? body.tagId : undefined,
      tagSlug: typeof body.tagSlug === "string" ? body.tagSlug : undefined,
      type: typeof body.type === "string" ? body.type : undefined,
      status: typeof body.status === "string" ? body.status : undefined,
      authorId: typeof body.authorId === "string" ? body.authorId : undefined,
      from: typeof body.from === "string" ? body.from : undefined,
      to: typeof body.to === "string" ? body.to : undefined,
      limit: typeof body.limit === "number" ? body.limit : 10,
      offset: typeof body.offset === "number" ? body.offset : 0,
    })
    return NextResponse.json(result)
  } catch (error: unknown) {
    return knowledgeErrorResponse(error, "Error al buscar en la Base de Conocimiento")
  }
}
