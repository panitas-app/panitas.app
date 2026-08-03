import { NextResponse } from "next/server"
import { requireRole } from "@/lib/permissions"
import { requireFeature } from "@/lib/features"
import { rateLimit } from "@/lib/rate-limit"
import { toServiceResponse } from "@/services/http"
import { createBusinessSummaryGenerator } from "@/lib/business-intelligence"
import type { StoreServiceContext } from "@/services/context"

let generator: ReturnType<typeof createBusinessSummaryGenerator> | null = null

function getGenerator() {
  if (!generator) generator = createBusinessSummaryGenerator()
  return generator
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
 * GET /api/agent/business-summary
 *
 * Resumen operativo del negocio listo para dashboard, chat y móvil:
 *   { summary: { greeting, summary, overview, insights, metrics, recommendations } }
 * Solo lectura; el `storeId` siempre proviene de la sesión autenticada.
 */
export async function GET() {
  const rl = await rateLimit("agent-business-summary", 30, 60 * 1000)
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
    const summary = await getGenerator().generate({
      ctx,
      storeName: current.store.name,
    })

    return NextResponse.json({ summary })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : ""
    if (message.includes("No tienes") || message.includes("Tu plan")) {
      return NextResponse.json({ error: message }, { status: 403 })
    }
    return toServiceResponse(error)
  }
}
