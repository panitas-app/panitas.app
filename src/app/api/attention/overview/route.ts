import { NextResponse } from "next/server"
import { requireRole } from "@/lib/permissions"
import { attentionService } from "@/lib/attention/app"
import { syncIfStale } from "@/lib/attention/engine"

/**
 * Conteos agregados del Centro de Atención (FASE 8C).
 * Usado por el badge de navegación, el monitor de negocio y el dashboard.
 *
 * GET /api/attention/overview
 */
export async function GET() {
  try {
    const current = await requireRole(["admin", "manager", "seller", "viewer"])
    const storeId = current.store.id

    await syncIfStale(attentionService, storeId)
    const overview = await attentionService.overview(storeId)

    return NextResponse.json({ overview })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    const unauthorized = /permisos|acceso/i.test(message)
    return NextResponse.json({ error: message }, { status: unauthorized ? 403 : 500 })
  }
}
