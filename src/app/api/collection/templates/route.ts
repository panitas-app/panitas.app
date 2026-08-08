import { NextRequest, NextResponse } from "next/server"
import { getCurrentStore } from "@/lib/permissions"
import { csrfGuard } from "@/lib/csrf"
import { CollectionService } from "@/services/collection.service"
import { isServiceError } from "@/services/errors"

const collectionService = new CollectionService()

export async function GET() {
  const current = await getCurrentStore()
  if (!current) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  try {
    const templates = await collectionService.listTemplates({ storeId: current.store.id, userId: current.userId })
    return NextResponse.json({ templates })
  } catch (error: unknown) {
    if (isServiceError(error)) return NextResponse.json({ error: error.message }, { status: error.status })
    return NextResponse.json({ error: "Error al cargar plantillas" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const csrf = csrfGuard(request)
  if (csrf) return csrf

  const current = await getCurrentStore()
  if (!current) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const body = await request.json().catch(() => null)
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 })
  }

  try {
    const template = await collectionService.upsertTemplate(
      { storeId: current.store.id, userId: current.userId },
      {
        id: typeof body.id === "string" ? body.id : undefined,
        category: body.category,
        name: body.name,
        level: typeof body.level === "number" ? body.level : undefined,
        body: body.body,
        isActive: typeof body.isActive === "boolean" ? body.isActive : undefined,
      }
    )
    return NextResponse.json({ template })
  } catch (error: unknown) {
    if (isServiceError(error)) return NextResponse.json({ error: error.message }, { status: error.status })
    return NextResponse.json({ error: "Error al guardar la plantilla" }, { status: 500 })
  }
}
