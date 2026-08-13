import { NextRequest, NextResponse } from "next/server"
import { csrfGuard } from "@/lib/csrf"
import { ApiKeyService } from "@/lib/platform/api-key/service"
import { requireIntegrationsAdmin } from "@/lib/platform/admin/guard"

const apiKeyService = new ApiKeyService()

async function resolveStore() {
  const current = await requireIntegrationsAdmin()
  return current
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const csrf = csrfGuard(_request)
  if (csrf) return csrf

  try {
    const current = await resolveStore()
    const { id } = await params
    await apiKeyService.revoke(id, current.store.id)
    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "No autorizado"
    return NextResponse.json({ error: message }, { status: 401 })
  }
}

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const csrf = csrfGuard(_request)
  if (csrf) return csrf

  try {
    const current = await resolveStore()
    const { id } = await params
    const rotated = await apiKeyService.rotate(id, current.store.id)
    if (!rotated) return NextResponse.json({ error: "API key no encontrada" }, { status: 404 })
    return NextResponse.json({ apiKey: rotated.apiKey, secret: rotated.secret })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "No autorizado"
    return NextResponse.json({ error: message }, { status: 401 })
  }
}
