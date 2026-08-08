import { NextResponse, type NextRequest } from "next/server"
import { requireRole } from "@/lib/permissions"
import { requireFeature } from "@/lib/features"
import { rateLimit } from "@/lib/rate-limit"
import { toServiceResponse } from "@/services/http"
import { createBusinessMemoryEngine } from "@/lib/business-memory"
import type { BusinessMemoryEngine } from "@/lib/business-memory"
import type { StoreServiceContext } from "@/services/context"

let engine: BusinessMemoryEngine | null = null

function getEngine(): BusinessMemoryEngine {
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
 * GET /api/business-memory
 *
 * Lista la memoria estable del negocio (FASE 5G) + estadísticas + estado del
 * aprendizaje. Solo lectura; el `storeId` siempre proviene de la sesión.
 *
 * PATCH /api/business-memory  { key, label?, value?, importance? }
 *   Actualiza un recuerdo (edición desde el panel).
 *
 * DELETE /api/business-memory?key=...
 *   Elimina un recuerdo del negocio.
 */
export async function GET() {
  const rl = await rateLimit("business-memory", 30, 60 * 1000)
  if (!rl.success) {
    return NextResponse.json(
      { error: `Demasiadas solicitudes. Intenta en ${Math.ceil(rl.resetIn / 1000)}s` },
      { status: 429, headers: { "Retry-After": String(Math.ceil(rl.resetIn / 1000)) } }
    )
  }

  try {
    const current = await requireRole(["admin", "manager", "seller", "viewer"])
    const gate = requireFeature(current.store.plan, "basic_ai")
    if (!gate.allowed) return NextResponse.json({ error: gate.error }, { status: 403 })

    const engine = getEngine()
    const ctx = ctxFrom(current)
    const [memories, learningEnabled, stats] = await Promise.all([
      engine.list(ctx),
      engine.isLearningEnabled(ctx),
      engine.stats(ctx),
    ])

    return NextResponse.json({ memories, learningEnabled, stats })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : ""
    if (message.includes("No tienes") || message.includes("Tu plan")) {
      return NextResponse.json({ error: message }, { status: 403 })
    }
    return toServiceResponse(error)
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const current = await requireRole(["admin", "manager"])
    const gate = requireFeature(current.store.plan, "basic_ai")
    if (!gate.allowed) return NextResponse.json({ error: gate.error }, { status: 403 })

    const body = (await request.json().catch(() => ({}))) as {
      key?: string
      label?: string
      value?: unknown
      importance?: string
    }
    if (!body.key) return NextResponse.json({ error: "Falta la clave del recuerdo" }, { status: 400 })

    const updated = await getEngine().update(ctxFrom(current), body.key, {
      label: body.label,
      value: body.value,
      importance: body.importance as never,
    })

    if (!updated) return NextResponse.json({ error: "Recuerdo no encontrado" }, { status: 404 })
    return NextResponse.json({ memory: updated })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : ""
    if (message.includes("No tienes") || message.includes("Tu plan")) {
      return NextResponse.json({ error: message }, { status: 403 })
    }
    return toServiceResponse(error)
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const current = await requireRole(["admin", "manager"])
    const gate = requireFeature(current.store.plan, "basic_ai")
    if (!gate.allowed) return NextResponse.json({ error: gate.error }, { status: 403 })

    const key = request.nextUrl.searchParams.get("key")
    if (!key) return NextResponse.json({ error: "Falta la clave del recuerdo" }, { status: 400 })

    const removed = await getEngine().remove(ctxFrom(current), key)
    if (!removed) return NextResponse.json({ error: "Recuerdo no encontrado" }, { status: 404 })
    return NextResponse.json({ removed: true })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : ""
    if (message.includes("No tienes") || message.includes("Tu plan")) {
      return NextResponse.json({ error: message }, { status: 403 })
    }
    return toServiceResponse(error)
  }
}
