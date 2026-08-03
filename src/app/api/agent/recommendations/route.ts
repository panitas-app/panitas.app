import { NextRequest, NextResponse } from "next/server"
import { requireRole } from "@/lib/permissions"
import { requireFeature } from "@/lib/features"
import { csrfGuard } from "@/lib/csrf"
import { rateLimit } from "@/lib/rate-limit"
import { toServiceResponse } from "@/services/http"
import { createRecommendationService } from "@/lib/recommendations"
import type { RecommendationService } from "@/lib/recommendations"
import type { StoreServiceContext } from "@/services/context"

let service: RecommendationService | null = null

function getService() {
  if (!service) service = createRecommendationService()
  return service
}

function ctxFrom(current: Awaited<ReturnType<typeof requireRole>>): StoreServiceContext {
  return {
    storeId: current.store.id,
    userId: current.userId,
    negocioId: current.store.negocioId ?? undefined,
    role: current.role,
    plan: current.store.plan,
    storeName: current.store.name,
  }
}

/**
 * GET /api/agent/recommendations
 *
 * Genera/renueva recomendaciones operativas (con cooldown anti-spam) y
 * devuelve la lista activa: `{ recommendations, count, generatedAt, message }`.
 * Solo lectura desde la perspectiva del usuario.
 */
export async function GET() {
  const rl = await rateLimit("agent-recommendations", 30, 60 * 1000)
  if (!rl.success) {
    return NextResponse.json(
      { error: `Demasiadas solicitudes. Intenta en ${Math.ceil(rl.resetIn / 1000)}s` },
      { status: 429, headers: { "Retry-After": String(Math.ceil(rl.resetIn / 1000)) } }
    )
  }

  try {
    const current = await requireRole(["admin", "manager", "seller", "viewer"])

    const gate = requireFeature(current.store.plan, "basic_ai")
    if (!gate.allowed) {
      return NextResponse.json({ error: gate.error }, { status: 403 })
    }

    const ctx = ctxFrom(current)
    const recommendations = await getService().refresh(ctx)

    return NextResponse.json({
      recommendations,
      count: recommendations.length,
      generatedAt: new Date().toISOString(),
      message: "Recomendaciones generadas a partir de tus datos.",
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : ""
    if (message.includes("No tienes") || message.includes("Tu plan")) {
      return NextResponse.json({ error: message }, { status: 403 })
    }
    return toServiceResponse(error)
  }
}

/**
 * PATCH /api/agent/recommendations
 *
 * Marca una recomendación como vista o descartada:
 * `{ id: string, action: "view" | "dismiss" }`. Valida que la recomendación
 * pertenezca al storeId autenticado.
 */
export async function PATCH(request: NextRequest) {
  const csrf = csrfGuard(request)
  if (csrf) return csrf

  const rl = await rateLimit("agent-recommendations-patch", 30, 60 * 1000)
  if (!rl.success) {
    return NextResponse.json(
      { error: `Demasiadas solicitudes. Intenta en ${Math.ceil(rl.resetIn / 1000)}s` },
      { status: 429, headers: { "Retry-After": String(Math.ceil(rl.resetIn / 1000)) } }
    )
  }

  try {
    const current = await requireRole(["admin", "manager", "seller", "viewer"])

    const gate = requireFeature(current.store.plan, "basic_ai")
    if (!gate.allowed) {
      return NextResponse.json({ error: gate.error }, { status: 403 })
    }

    const body = await request.json()
    const id = typeof body?.id === "string" ? body.id.trim() : ""
    const action = body?.action
    if (!id) {
      return NextResponse.json({ error: "El id de la recomendación es obligatorio" }, { status: 400 })
    }
    if (action !== "view" && action !== "dismiss") {
      return NextResponse.json({ error: "La acción debe ser 'view' o 'dismiss'" }, { status: 400 })
    }

    const ctx = ctxFrom(current)
    const recommendation = await getService().markStatus(ctx, id, action)

    return NextResponse.json({ recommendation })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : ""
    if (message.includes("No tienes") || message.includes("Tu plan")) {
      return NextResponse.json({ error: message }, { status: 403 })
    }
    return toServiceResponse(error)
  }
}
