import { NextRequest, NextResponse } from "next/server"
import { getCurrentStore } from "@/lib/permissions"
import { csrfGuard } from "@/lib/csrf"
import { SupplierService } from "@/services/supplier.service"
import { isServiceError } from "@/services/errors"

const supplierService = new SupplierService()

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const csrf = csrfGuard(request)
  if (csrf) return csrf

  const current = await getCurrentStore()
  if (!current) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id } = await params

  let body: { amount?: number; date?: string; paymentMethod?: string; reference?: string; notes?: string | null }
  try { body = await request.json() } catch { return NextResponse.json({ error: "JSON inválido" }, { status: 400 }) }

  try {
    const detail = await supplierService.registerPayment(
      { storeId: current.store.id, userId: current.userId },
      {
        supplierId: id,
        amount: body.amount ?? 0,
        date: body.date ? new Date(body.date) : undefined,
        paymentMethod: body.paymentMethod,
        reference: body.reference,
        notes: body.notes,
      }
    )
    return NextResponse.json(detail)
  } catch (error: unknown) {
    if (isServiceError(error)) return NextResponse.json({ error: error.message }, { status: error.status })
    const message = error instanceof Error ? error.message : "Error al registrar el pago"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
