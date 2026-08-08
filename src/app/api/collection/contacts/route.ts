import { NextRequest, NextResponse } from "next/server"
import { getCurrentStore } from "@/lib/permissions"
import { csrfGuard } from "@/lib/csrf"
import { CollectionService } from "@/services/collection.service"
import { isServiceError } from "@/services/errors"
import { createBusinessMemoryEngine, recordCollectionUsage } from "@/lib/business-memory"

const collectionService = new CollectionService()
const memory = createBusinessMemoryEngine()

export async function GET(request: NextRequest) {
  const current = await getCurrentStore()
  if (!current) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const orderId = searchParams.get("orderId") || undefined
  const customerId = searchParams.get("customerId") || undefined
  const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : undefined

  try {
    const contacts = await collectionService.listHistory(
      { storeId: current.store.id, userId: current.userId },
      { orderId, customerId, limit }
    )
    return NextResponse.json({ contacts })
  } catch (error: unknown) {
    if (isServiceError(error)) return NextResponse.json({ error: error.message }, { status: error.status })
    return NextResponse.json({ error: "Error al cargar el historial" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const csrf = csrfGuard(request)
  if (csrf) return csrf

  const current = await getCurrentStore()
  if (!current) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const body = await request.json().catch(() => null)
  if (!body || typeof body !== "object" || typeof body.logId !== "string") {
    return NextResponse.json({ error: "Falta el contacto" }, { status: 400 })
  }
  if (body.status !== "sent" && body.status !== "responded") {
    return NextResponse.json({ error: "Estado inválido" }, { status: 400 })
  }

  try {
    const contact = await collectionService.markContact(
      { storeId: current.store.id, userId: current.userId },
      body.logId,
      body.status,
      typeof body.at === "string" ? new Date(body.at) : undefined
    )
    if (contact && body.status === "sent") {
      await recordCollectionUsage(
        memory,
        { userId: current.userId, storeId: current.store.id, negocioId: undefined },
        { category: contact.category ?? undefined, method: contact.channel === "whatsapp" ? undefined : contact.channel, level: contact.level }
      )
    }
    return NextResponse.json({ contact })
  } catch (error: unknown) {
    if (isServiceError(error)) return NextResponse.json({ error: error.message }, { status: error.status })
    return NextResponse.json({ error: "Error al actualizar el contacto" }, { status: 500 })
  }
}
