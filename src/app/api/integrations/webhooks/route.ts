import { NextRequest, NextResponse } from "next/server"
import { csrfGuard } from "@/lib/csrf"
import { WebhookService } from "@/lib/platform/webhooks/service"
import { requireIntegrationsAdmin } from "@/lib/platform/admin/guard"

const webhookService = new WebhookService()

export async function GET() {
  try {
    const current = await requireIntegrationsAdmin()
    const subscriptions = await webhookService.list(current.store.id)
    return NextResponse.json({ subscriptions })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error al cargar los webhooks"
    return NextResponse.json({ error: message }, { status: 401 })
  }
}

export async function POST(request: NextRequest) {
  const csrf = csrfGuard(request)
  if (csrf) return csrf

  let current: Awaited<ReturnType<typeof requireIntegrationsAdmin>>
  try {
    current = await requireIntegrationsAdmin()
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "No autorizado"
    return NextResponse.json({ error: message }, { status: 401 })
  }

  let body: { name?: unknown; endpoint?: unknown; events?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 })
  }

  try {
    const created = await webhookService.create({
      storeId: current.store.id,
      name: typeof body.name === "string" ? body.name : "",
      endpoint: typeof body.endpoint === "string" ? body.endpoint : "",
      events: body.events,
      createdBy: current.userId,
    })
    return NextResponse.json({ subscription: created.subscription, secret: created.secret }, { status: 201 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error al crear el webhook"
    return NextResponse.json({ error: message }, { status: 422 })
  }
}
