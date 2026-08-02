import { NextRequest, NextResponse } from "next/server"
import { getCurrentStore, requireRole } from "@/lib/permissions"
import { csrfGuard } from "@/lib/csrf"
import { getPaginationParams, paginatedResponse } from "@/lib/pagination"
import { InventoryService } from "@/services/inventory.service"
import { toServiceResponse, createdResponse } from "@/services/http"
import type { StoreServiceContext } from "@/services/context"

const inventoryService = new InventoryService()

export async function GET(request: NextRequest) {
  const current = await getCurrentStore()
  if (!current) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const { skip, take, page } = getPaginationParams(searchParams)
  const productId = searchParams.get("productId")
  const type = searchParams.get("type")
  const from = searchParams.get("from")
  const to = searchParams.get("to")

  const { movements, total } = await inventoryService.list(
    { storeId: current.store.id, userId: current.userId },
    { productId, type, from, to, skip, take }
  )

  return NextResponse.json(paginatedResponse(movements, total, page, take))
}

export async function POST(request: NextRequest) {
  const csrf = csrfGuard(request)
  if (csrf) return csrf
  const current = await requireRole(["admin", "manager"])

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 })
  }
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 })

  try {
    const ctx: StoreServiceContext = { storeId: current.store.id, userId: current.userId }
    const movement = await inventoryService.applyMovement(ctx, body)
    return createdResponse(movement)
  } catch (err) {
    return toServiceResponse(err)
  }
}
