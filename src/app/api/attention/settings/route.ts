import { NextRequest, NextResponse } from "next/server"
import { requireRole } from "@/lib/permissions"
import { attentionService } from "@/lib/attention/app"
import { isAttentionType, type AttentionPriority } from "@/lib/attention"

/**
 * Preferencias del Centro de Atención (FASE 8C).
 *
 * GET /api/attention/settings   → preferencias del negocio
 * PUT /api/attention/settings   → actualiza preferencias (admin/manager)
 */
export async function GET() {
  try {
    const current = await requireRole(["admin", "manager", "seller", "viewer"])
    const preferences = await attentionService.getPreferences(current.store.id)
    return NextResponse.json({ preferences })
  } catch (error) {
    return errorResponse(error)
  }
}

export async function PUT(req: NextRequest) {
  try {
    const current = await requireRole(["admin", "manager"])
    const storeId = current.store.id

    const body = (await req.json()) as {
      enabledTypes?: string[]
      minPriority?: string
      quietHoursStart?: string | null
      quietHoursEnd?: string | null
    }

    const enabledTypes =
      Array.isArray(body.enabledTypes)
        ? body.enabledTypes.filter(isAttentionType)
        : undefined

    const minPriority: AttentionPriority | undefined =
      body.minPriority === "critical" || body.minPriority === "high" || body.minPriority === "medium" || body.minPriority === "low"
        ? body.minPriority
        : undefined

    const preferences = await attentionService.updatePreferences(storeId, {
      ...(enabledTypes ? { enabledTypes } : {}),
      ...(minPriority ? { minPriority } : {}),
      ...(body.quietHoursStart !== undefined ? { quietHoursStart: body.quietHoursStart || null } : {}),
      ...(body.quietHoursEnd !== undefined ? { quietHoursEnd: body.quietHoursEnd || null } : {}),
    })

    return NextResponse.json({ preferences })
  } catch (error) {
    return errorResponse(error)
  }
}

function errorResponse(error: unknown): NextResponse {
  const message = error instanceof Error ? error.message : String(error)
  const unauthorized = /permisos|acceso/i.test(message)
  return NextResponse.json({ error: message }, { status: unauthorized ? 403 : 500 })
}
