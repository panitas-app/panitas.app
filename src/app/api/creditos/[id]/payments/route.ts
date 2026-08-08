import { NextRequest, NextResponse } from "next/server"
import { getCurrentStore } from "@/lib/permissions"
import { csrfGuard } from "@/lib/csrf"
import { CreditService } from "@/services/credit.service"
import { isServiceError } from "@/services/errors"

const creditService = new CreditService()

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const csrf = csrfGuard(request)
  if (csrf) return csrf

  const current = await getCurrentStore()
  if (!current) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id } = await params

  let body: { amount?: number; method?: string; paidAt?: string; reference?: string; notes?: string; paymentAccountId?: string }
  try { body = await request.json() } catch { return NextResponse.json({ error: "JSON inválido" }, { status: 400 }) }

  try {
    const detail = await creditService.registerPayment(
      { storeId: current.store.id, userId: current.userId },
      {
        orderId: id,
        amount: body.amount!,
        method: body.method,
        paidAt: body.paidAt ? new Date(body.paidAt) : undefined,
        reference: body.reference || null,
        notes: body.notes || null,
        paymentAccountId: body.paymentAccountId || null,
      }
    )
    return NextResponse.json(detail)
  } catch (error: unknown) {
    if (isServiceError(error)) return NextResponse.json({ error: error.message }, { status: error.status })
    const message = error instanceof Error ? error.message : "Error al registrar el abono"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
