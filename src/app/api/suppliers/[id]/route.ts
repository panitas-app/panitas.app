import { NextRequest, NextResponse } from "next/server"
import { getCurrentStore } from "@/lib/permissions"
import { csrfGuard } from "@/lib/csrf"
import { SupplierService } from "@/services/supplier.service"
import { isServiceError } from "@/services/errors"

const supplierService = new SupplierService()

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const current = await getCurrentStore()
  if (!current) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id } = await params

  try {
    const detail = await supplierService.getDetail({ storeId: current.store.id, userId: current.userId }, id)
    return NextResponse.json(detail)
  } catch (error: unknown) {
    if (isServiceError(error)) return NextResponse.json({ error: error.message }, { status: error.status })
    const message = error instanceof Error ? error.message : "Error al cargar el proveedor"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const csrf = csrfGuard(request)
  if (csrf) return csrf

  const current = await getCurrentStore()
  if (!current) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id } = await params

  let body: {
    name?: string
    ruc?: string
    phone?: string
    email?: string
    address?: string
    category?: string
    notes?: string | null
    isActive?: boolean
  }
  try { body = await request.json() } catch { return NextResponse.json({ error: "JSON inválido" }, { status: 400 }) }

  try {
    const detail = await supplierService.update(
      { storeId: current.store.id, userId: current.userId },
      id,
      {
        name: body.name,
        ruc: body.ruc,
        phone: body.phone,
        email: body.email,
        address: body.address,
        category: body.category,
        notes: body.notes,
        isActive: body.isActive,
      }
    )
    return NextResponse.json(detail)
  } catch (error: unknown) {
    if (isServiceError(error)) return NextResponse.json({ error: error.message }, { status: error.status })
    const message = error instanceof Error ? error.message : "Error al actualizar el proveedor"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const csrf = csrfGuard(request)
  if (csrf) return csrf

  const current = await getCurrentStore()
  if (!current) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id } = await params

  try {
    const result = await supplierService.remove({ storeId: current.store.id, userId: current.userId }, id)
    return NextResponse.json(result)
  } catch (error: unknown) {
    if (isServiceError(error)) return NextResponse.json({ error: error.message }, { status: error.status })
    const message = error instanceof Error ? error.message : "Error al eliminar el proveedor"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
