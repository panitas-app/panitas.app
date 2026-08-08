import { NextRequest, NextResponse } from "next/server"
import { getCurrentStore } from "@/lib/permissions"
import { csrfGuard } from "@/lib/csrf"
import { SupplierService } from "@/services/supplier.service"
import { isServiceError } from "@/services/errors"

const supplierService = new SupplierService()

export async function GET(request: NextRequest) {
  const current = await getCurrentStore()
  if (!current) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const status = searchParams.get("status") || "all"
  const search = searchParams.get("search") || undefined
  const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : undefined

  try {
    const result = await supplierService.list(
      { storeId: current.store.id, userId: current.userId },
      { status, search, limit }
    )
    return NextResponse.json(result)
  } catch (error: unknown) {
    if (isServiceError(error)) return NextResponse.json({ error: error.message }, { status: error.status })
    const message = error instanceof Error ? error.message : "Error al cargar proveedores"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const csrf = csrfGuard(request)
  if (csrf) return csrf

  const current = await getCurrentStore()
  if (!current) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  let body: {
    name?: string
    ruc?: string
    phone?: string
    email?: string
    address?: string
    category?: string
    notes?: string | null
  }
  try { body = await request.json() } catch { return NextResponse.json({ error: "JSON inválido" }, { status: 400 }) }

  try {
    const detail = await supplierService.create(
      { storeId: current.store.id, userId: current.userId },
      {
        name: body.name ?? "",
        ruc: body.ruc,
        phone: body.phone,
        email: body.email,
        address: body.address,
        category: body.category,
        notes: body.notes,
      }
    )
    return NextResponse.json(detail, { status: 201 })
  } catch (error: unknown) {
    if (isServiceError(error)) return NextResponse.json({ error: error.message }, { status: error.status })
    const message = error instanceof Error ? error.message : "Error al crear el proveedor"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
