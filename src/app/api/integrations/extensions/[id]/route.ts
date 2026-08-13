import { NextRequest, NextResponse } from "next/server"
import { csrfGuard } from "@/lib/csrf"
import { ExtensionService } from "@/lib/platform/extensions/service"
import { requireIntegrationsAdmin } from "@/lib/platform/admin/guard"

const extensionService = new ExtensionService()

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const csrf = csrfGuard(request)
  if (csrf) return csrf

  try {
    const current = await requireIntegrationsAdmin()
    const { id } = await params

    let body: { status?: unknown }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: "JSON inválido" }, { status: 400 })
    }

    if (typeof body.status !== "string") {
      return NextResponse.json({ error: "status inválido" }, { status: 422 })
    }
    const extension = await extensionService.updateStatus(id, current.store.id, body.status)
    if (!extension) return NextResponse.json({ error: "Extensión no encontrada" }, { status: 404 })
    return NextResponse.json({ extension })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error al actualizar la extensión"
    return NextResponse.json({ error: message }, { status: 422 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const csrf = csrfGuard(request)
  if (csrf) return csrf

  try {
    const current = await requireIntegrationsAdmin()
    const { id } = await params
    const removed = await extensionService.remove(id, current.store.id)
    if (!removed) return NextResponse.json({ error: "Extensión no encontrada" }, { status: 404 })
    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "No autorizado"
    return NextResponse.json({ error: message }, { status: 401 })
  }
}
