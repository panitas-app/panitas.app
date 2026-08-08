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
    const settings = await collectionService.getSettings({ storeId: current.store.id, userId: current.userId })
    return NextResponse.json({ settings })
  } catch (error: unknown) {
    if (isServiceError(error)) return NextResponse.json({ error: error.message }, { status: error.status })
    return NextResponse.json({ error: "Error al cargar configuración" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const csrf = csrfGuard(request)
  if (csrf) return csrf

  const current = await getCurrentStore()
  if (!current) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const body = await request.json().catch(() => null)
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 })
  }

  try {
    const settings = await collectionService.saveSettings(
      { storeId: current.store.id, userId: current.userId },
      {
        paymentMethods: Array.isArray(body.paymentMethods) ? body.paymentMethods : undefined,
        defaultLevel: typeof body.defaultLevel === "number" ? body.defaultLevel : undefined,
        businessName: typeof body.businessName === "string" ? body.businessName : undefined,
      }
    )
    return NextResponse.json({ settings })
  } catch (error: unknown) {
    if (isServiceError(error)) return NextResponse.json({ error: error.message }, { status: error.status })
    return NextResponse.json({ error: "Error al guardar configuración" }, { status: 500 })
  }
}
