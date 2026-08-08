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

  let body: {
    description?: string
    amount?: number
    number?: string
    date?: string
    dueDate?: string | null
    paymentMethod?: string
    documentRef?: string
    notes?: string | null
  }
  try { body = await request.json() } catch { return NextResponse.json({ error: "JSON inválido" }, { status: 400 }) }

  try {
    const invoice = await supplierService.recordPurchase(
      { storeId: current.store.id, userId: current.userId },
      {
        supplierId: id,
        description: body.description ?? "",
        amount: body.amount ?? 0,
        number: body.number,
        date: body.date ? new Date(body.date) : undefined,
        dueDate: body.dueDate ? new Date(body.dueDate) : body.dueDate === null ? null : undefined,
        paymentMethod: body.paymentMethod,
        documentRef: body.documentRef,
        notes: body.notes,
      }
    )
    return NextResponse.json(invoice, { status: 201 })
  } catch (error: unknown) {
    if (isServiceError(error)) return NextResponse.json({ error: error.message }, { status: error.status })
    const message = error instanceof Error ? error.message : "Error al registrar la compra"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
