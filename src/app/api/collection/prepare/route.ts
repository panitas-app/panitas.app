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

  const body = await request.json().catch(() => null)
  if (!body || typeof body !== "object" || typeof body.orderId !== "string") {
    return NextResponse.json({ error: "Falta el crédito" }, { status: 400 })
  }

  try {
    const reminder = await collectionService.prepareReminder(
      { storeId: current.store.id, userId: current.userId },
      {
        orderId: body.orderId,
        category: typeof body.category === "string" ? body.category : undefined,
        level: typeof body.level === "number" ? body.level : undefined,
        templateId: typeof body.templateId === "string" ? body.templateId : undefined,
        bodyOverride: typeof body.bodyOverride === "string" ? body.bodyOverride : undefined,
        channel: typeof body.channel === "string" ? (body.channel as never) : undefined,
      }
    )
    return NextResponse.json({ reminder })
  } catch (error: unknown) {
    if (isServiceError(error)) return NextResponse.json({ error: error.message }, { status: error.status })
    return NextResponse.json({ error: "Error al preparar el recordatorio" }, { status: 500 })
  }
}
