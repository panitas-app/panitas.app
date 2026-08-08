import { NextResponse } from "next/server"
import { requireRole } from "@/lib/permissions"
import { requireFeature } from "@/lib/features"
import { rateLimit } from "@/lib/rate-limit"
import { toServiceResponse } from "@/services/http"
import { createBehaviorEngine } from "@/lib/assistant-behavior"
import type { StoreServiceContext } from "@/services/context"

let engine: ReturnType<typeof createBehaviorEngine> | null = null

function getEngine() {
  if (!engine) engine = createBehaviorEngine()
  return engine
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
 * GET /api/agent/proactive
 *
 * Comportamiento proactivo del asistente (FASE 5F), listo para el chat y la
 * UI: saludo contextual + recomendaciones accionables priorizadas.
 *   { greeting: { text, hour }, recommendations: [...], hasFindings, generatedAt }
 * Solo lectura y cacheable; el `storeId` siempre proviene de la sesión.
 */
export async function GET() {
  const rl = await rateLimit("agent-proactive", 30, 60 * 1000)
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

    const result = await getEngine().analyze({
      ctx: ctxFrom(current),
      storeName: current.store.name,
    })

    return NextResponse.json({
      greeting: result.greeting,
      recommendations: result.recommendations,
      hasFindings: result.hasFindings,
      generatedAt: result.generatedAt,
      storeId: result.storeId,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : ""
    if (message.includes("No tienes") || message.includes("Tu plan")) {
      return NextResponse.json({ error: message }, { status: 403 })
    }
    return toServiceResponse(error)
  }
}
