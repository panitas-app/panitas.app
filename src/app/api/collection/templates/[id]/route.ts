import { NextRequest, NextResponse } from "next/server"
import { getCurrentStore } from "@/lib/permissions"
import { csrfGuard } from "@/lib/csrf"
import { CollectionService } from "@/services/collection.service"
import { isServiceError } from "@/services/errors"

const collectionService = new CollectionService()

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const csrf = csrfGuard(request)
  if (csrf) return csrf

  const current = await getCurrentStore()
  if (!current) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id } = await params

  try {
    await collectionService.deleteTemplate({ storeId: current.store.id, userId: current.userId }, id)
    return NextResponse.json({ ok: true })
  } catch (error: unknown) {
    if (isServiceError(error)) return NextResponse.json({ error: error.message }, { status: error.status })
    return NextResponse.json({ error: "Error al eliminar la plantilla" }, { status: 500 })
  }
}
