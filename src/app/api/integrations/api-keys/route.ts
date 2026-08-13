import { NextRequest, NextResponse } from "next/server"
import { csrfGuard } from "@/lib/csrf"
import { ApiKeyService } from "@/lib/platform/api-key/service"
import { requireIntegrationsAdmin } from "@/lib/platform/admin/guard"

const apiKeyService = new ApiKeyService()

export async function GET() {
  try {
    const current = await requireIntegrationsAdmin()
    const keys = await apiKeyService.list(current.store.id)
    return NextResponse.json({ keys })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error al cargar las API keys"
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

  let body: { name?: unknown; permissions?: unknown; expiresAt?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 })
  }

  try {
    const created = await apiKeyService.create({
      storeId: current.store.id,
      name: typeof body.name === "string" ? body.name : "",
      permissions: Array.isArray(body.permissions) ? body.permissions : [],
      expiresAt: typeof body.expiresAt === "string" ? new Date(body.expiresAt) : null,
      createdBy: current.userId,
    })
    return NextResponse.json({ apiKey: created.apiKey, secret: created.secret }, { status: 201 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error al crear la API key"
    return NextResponse.json({ error: message }, { status: 422 })
  }
}
