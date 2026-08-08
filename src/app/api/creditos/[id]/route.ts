import { NextRequest, NextResponse } from "next/server"
import { getCurrentStore } from "@/lib/permissions"
import { csrfGuard } from "@/lib/csrf"
import { CreditService } from "@/services/credit.service"
import { isServiceError } from "@/services/errors"

const creditService = new CreditService()

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const current = await getCurrentStore()
  if (!current) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id } = await params

  try {
    const detail = await creditService.getDetail({ storeId: current.store.id, userId: current.userId }, id)
    return NextResponse.json(detail)
  } catch (error: unknown) {
    if (isServiceError(error)) return NextResponse.json({ error: error.message }, { status: error.status })
    const message = error instanceof Error ? error.message : "Error al cargar el crédito"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const csrf = csrfGuard(request)
  if (csrf) return csrf

  const current = await getCurrentStore()
  if (!current) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id } = await params

  let body: { action?: string; count?: number; totalAmount?: number; periodDays?: number; startDate?: string; reason?: string }
  try { body = await request.json() } catch { return NextResponse.json({ error: "JSON inválido" }, { status: 400 }) }

  const ctx = { storeId: current.store.id, userId: current.userId }

  try {
    if (body.action === "reschedule") {
      const detail = await creditService.reschedule(ctx, {
        orderId: id,
        count: body.count!,
        totalAmount: body.totalAmount,
        periodDays: body.periodDays!,
        startDate: body.startDate ? new Date(body.startDate) : undefined,
      })
      return NextResponse.json(detail)
    }

    if (body.action === "cancel") {
      const detail = await creditService.cancel(ctx, id, body.reason)
      return NextResponse.json(detail)
    }

    return NextResponse.json({ error: "Acción no válida" }, { status: 400 })
  } catch (error: unknown) {
    if (isServiceError(error)) return NextResponse.json({ error: error.message }, { status: error.status })
    const message = error instanceof Error ? error.message : "Error al actualizar el crédito"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
