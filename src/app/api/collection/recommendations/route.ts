import { NextRequest, NextResponse } from "next/server"
import { getCurrentStore } from "@/lib/permissions"
import { CollectionService } from "@/services/collection.service"
import { isServiceError } from "@/services/errors"

const collectionService = new CollectionService()

export async function GET(request: NextRequest) {
  const current = await getCurrentStore()
  if (!current) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : undefined

  try {
    const recommendations = await collectionService.recommendations(
      { storeId: current.store.id, userId: current.userId },
      { limit }
    )
    return NextResponse.json({ recommendations })
  } catch (error: unknown) {
    if (isServiceError(error)) return NextResponse.json({ error: error.message }, { status: error.status })
    return NextResponse.json({ error: "Error al cargar recomendaciones" }, { status: 500 })
  }
}
