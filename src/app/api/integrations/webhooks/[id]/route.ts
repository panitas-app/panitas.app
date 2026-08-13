import { NextRequest, NextResponse } from "next/server"
import { csrfGuard } from "@/lib/csrf"
import { WebhookService } from "@/lib/platform/webhooks/service"
import { requireIntegrationsAdmin } from "@/lib/platform/admin/guard"

const webhookService = new WebhookService()

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const current = await requireIntegrationsAdmin()
    const { id } = await params
    const subscription = await webhookService.getById(id, current.store.id)
    if (!subscription) return NextResponse.json({ error: "Webhook no encontrado" }, { status: 404 })
    return NextResponse.json({ subscription })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "No autorizado"
    return NextResponse.json({ error: message }, { status: 401 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const csrf = csrfGuard(request)
  if (csrf) return csrf

  try {
    const current = await requireIntegrationsAdmin()
    const { id } = await params

    let body: { name?: unknown; endpoint?: unknown; events?: unknown; status?: unknown }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: "JSON inválido" }, { status: 400 })
    }

    const subscription = await webhookService.update(id, current.store.id, {
      ...(body.name !== undefined ? { name: String(body.name) } : {}),
      ...(body.endpoint !== undefined ? { endpoint: String(body.endpoint) } : {}),
      ...(body.events !== undefined ? { events: body.events } : {}),
      ...(body.status !== undefined ? { status: String(body.status) } : {}),
    })
    if (!subscription) return NextResponse.json({ error: "Webhook no encontrado" }, { status: 404 })
    return NextResponse.json({ subscription })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error al actualizar el webhook"
    return NextResponse.json({ error: message }, { status: 422 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const csrf = csrfGuard(request)
  if (csrf) return csrf

  try {
    const current = await requireIntegrationsAdmin()
    const { id } = await params
    const removed = await webhookService.remove(id, current.store.id)
    if (!removed) return NextResponse.json({ error: "Webhook no encontrado" }, { status: 404 })
    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "No autorizado"
    return NextResponse.json({ error: message }, { status: 401 })
  }
}
