import { NextRequest, NextResponse } from "next/server"
import { csrfGuard } from "@/lib/csrf"
import { ExtensionService } from "@/lib/platform/extensions/service"
import { requireIntegrationsAdmin } from "@/lib/platform/admin/guard"

const extensionService = new ExtensionService()

export async function GET() {
  try {
    const current = await requireIntegrationsAdmin()
    const extensions = await extensionService.list(current.store.id)
    return NextResponse.json({ extensions })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error al cargar las extensiones"
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

  let body: { name?: unknown; description?: unknown; type?: unknown; permissions?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 })
  }

  try {
    const extension = await extensionService.create({
      storeId: current.store.id,
      name: typeof body.name === "string" ? body.name : "",
      description: typeof body.description === "string" ? body.description : undefined,
      type: typeof body.type === "string" ? body.type : undefined,
      permissions: Array.isArray(body.permissions) ? body.permissions : [],
    })
    return NextResponse.json({ extension }, { status: 201 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error al crear la extensión"
    return NextResponse.json({ error: message }, { status: 422 })
  }
}
