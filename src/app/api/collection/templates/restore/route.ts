import { NextRequest, NextResponse } from "next/server"
import { getCurrentStore } from "@/lib/permissions"
import { csrfGuard } from "@/lib/csrf"
import { CollectionService } from "@/services/collection.service"
import { isServiceError } from "@/services/errors"

const collectionService = new CollectionService()

export async function POST(request: NextRequest) {
  const csrf = csrfGuard(request)
  if (csrf) return csrf

  const current = await getCurrentStore()
  if (!current) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  try {
    const templates = await collectionService.restoreDefaultTemplates({ storeId: current.store.id, userId: current.userId })
    return NextResponse.json({ templates })
  } catch (error: unknown) {
    if (isServiceError(error)) return NextResponse.json({ error: error.message }, { status: error.status })
    return NextResponse.json({ error: "Error al restaurar plantillas" }, { status: 500 })
  }
}
