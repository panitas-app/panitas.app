import { NextRequest, NextResponse } from "next/server"
import { WebhookService } from "@/lib/platform/webhooks/service"
import { requireIntegrationsAdmin } from "@/lib/platform/admin/guard"

const webhookService = new WebhookService()

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const current = await requireIntegrationsAdmin()
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") ?? "50", 10) || 50, 1), 200)

    const subscription = await webhookService.getById(id, current.store.id)
    if (!subscription) return NextResponse.json({ error: "Webhook no encontrado" }, { status: 404 })

    const deliveries = await webhookService.listDeliveries(current.store.id, id, limit)
    return NextResponse.json({ deliveries })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "No autorizado"
    return NextResponse.json({ error: message }, { status: 401 })
  }
}
