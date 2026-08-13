import { NextRequest, NextResponse } from "next/server"
import { csrfGuard } from "@/lib/csrf"
import { webhookDispatcher } from "@/lib/platform/webhooks/app"
import { requireIntegrationsAdmin } from "@/lib/platform/admin/guard"

export async function POST(request: NextRequest, { params }: { params: Promise<{ deliveryId: string }> }) {
  const csrf = csrfGuard(request)
  if (csrf) return csrf

  try {
    const current = await requireIntegrationsAdmin()
    const { deliveryId } = await params
    const ok = await webhookDispatcher.retryDelivery(deliveryId, current.store.id)
    if (!ok) return NextResponse.json({ error: "Entrega no encontrada o no reenviable" }, { status: 404 })
    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "No autorizado"
    return NextResponse.json({ error: message }, { status: 401 })
  }
}
