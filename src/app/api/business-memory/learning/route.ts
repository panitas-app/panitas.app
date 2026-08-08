import { NextResponse, type NextRequest } from "next/server"
import { requireRole } from "@/lib/permissions"
import { requireFeature } from "@/lib/features"
import { rateLimit } from "@/lib/rate-limit"
import { toServiceResponse } from "@/services/http"
import { createBusinessMemoryEngine } from "@/lib/business-memory"
import type { StoreServiceContext } from "@/services/context"

let engine: ReturnType<typeof createBusinessMemoryEngine> | null = null

function getEngine() {
  if (!engine) engine = createBusinessMemoryEngine()
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
 * POST /api/business-memory/learning  { enabled: boolean }
 *
 * Activa o desactiva el aprendizaje automático de la memoria estable del
 * negocio (FASE 5G). Solo admin/manager.
 */
export async function POST(request: NextRequest) {
  const rl = await rateLimit("business-memory-learning", 10, 60 * 1000)
  if (!rl.success) {
    return NextResponse.json(
      { error: `Demasiadas solicitudes. Intenta en ${Math.ceil(rl.resetIn / 1000)}s` },
      { status: 429, headers: { "Retry-After": String(Math.ceil(rl.resetIn / 1000)) } }
    )
  }

  try {
    const current = await requireRole(["admin", "manager"])
    const gate = requireFeature(current.store.plan, "basic_ai")
    if (!gate.allowed) return NextResponse.json({ error: gate.error }, { status: 403 })

    const body = (await request.json().catch(() => ({}))) as { enabled?: unknown }
    if (typeof body.enabled !== "boolean") {
      return NextResponse.json({ error: "Falta el campo `enabled` (booleano)" }, { status: 400 })
    }

    const ctx = ctxFrom(current)
    await getEngine().setLearningEnabled(ctx, body.enabled)
    return NextResponse.json({ enabled: body.enabled })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : ""
    if (message.includes("No tienes") || message.includes("Tu plan")) {
      return NextResponse.json({ error: message }, { status: 403 })
    }
    return toServiceResponse(error)
  }
}
