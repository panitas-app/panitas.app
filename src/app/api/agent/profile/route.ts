import { NextResponse } from "next/server"
import { requireRole } from "@/lib/permissions"
import { rateLimit } from "@/lib/rate-limit"
import { toServiceResponse } from "@/services/http"
import { BusinessProfileBuilder } from "@/lib/agent/profile"
import type { StoreServiceContext } from "@/services/context"

let builder: BusinessProfileBuilder | null = null

function getBuilder() {
  if (!builder) builder = new BusinessProfileBuilder()
  return builder
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

/** GET /api/agent/profile — perfil inteligente del negocio (solo lectura). */
export async function GET() {
  const rl = await rateLimit("agent-profile", 60, 60 * 1000)
  if (!rl.success) {
    return NextResponse.json(
      { error: `Demasiadas solicitudes. Intenta en ${Math.ceil(rl.resetIn / 1000)}s` },
      { status: 429, headers: { "Retry-After": String(Math.ceil(rl.resetIn / 1000)) } }
    )
  }

  try {
    const current = await requireRole(["admin", "manager", "seller", "viewer"])
    const ctx = ctxFrom(current)
    const profile = await getBuilder().build(ctx)
    return NextResponse.json({ profile })
  } catch (error: unknown) {
    return toServiceResponse(error)
  }
}
