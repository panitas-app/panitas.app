import { NextRequest, NextResponse } from "next/server"
import { requireRole } from "@/lib/permissions"
import { csrfGuard } from "@/lib/csrf"
import { rateLimit } from "@/lib/rate-limit"
import { toServiceResponse } from "@/services/http"
import { MemoryManager } from "@/lib/agent/memory"
import type { MemoryContext, MemoryImportance } from "@/lib/agent/memory"
import { createAuditEntry } from "@/lib/audit"

let memory: MemoryManager | null = null

function getMemory() {
  if (!memory) memory = new MemoryManager()
  return memory
}

function ctxFrom(current: Awaited<ReturnType<typeof requireRole>>): MemoryContext {
  return {
    storeId: current.store.id,
    userId: current.userId,
    negocioId: current.store.negocioId ?? undefined,
  }
}

const IMPORTANCES: MemoryImportance[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"]

/** GET /api/agent/memory — memoria del negocio (lista o búsqueda). */
export async function GET(request: NextRequest) {
  const rl = await rateLimit("agent-memory", 60, 60 * 1000)
  if (!rl.success) {
    return NextResponse.json(
      { error: `Demasiadas solicitudes. Intenta en ${Math.ceil(rl.resetIn / 1000)}s` },
      { status: 429, headers: { "Retry-After": String(Math.ceil(rl.resetIn / 1000)) } }
    )
  }

  try {
    const current = await requireRole(["admin", "manager", "seller", "viewer"])
    const ctx = ctxFrom(current)

    const query = request.nextUrl.searchParams.get("query")?.trim() || undefined
    const rawLimit = Number(request.nextUrl.searchParams.get("limit") ?? 20)
    const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(Math.floor(rawLimit), 1), 100) : 20
    const rawImportance = request.nextUrl.searchParams.get("minImportance")
    const minImportance = IMPORTANCES.includes(rawImportance as MemoryImportance)
      ? (rawImportance as MemoryImportance)
      : undefined

    const results = query
      ? await getMemory().search(ctx, query, { limit, minImportance })
      : (await getMemory().list(ctx, { limit })).map((item) => ({ item, score: 0 }))

    return NextResponse.json({ results })
  } catch (error: unknown) {
    return toServiceResponse(error)
  }
}

/** DELETE /api/agent/memory?key=... — elimina un ítem de memoria del negocio. */
export async function DELETE(request: NextRequest) {
  const csrf = csrfGuard(request)
  if (csrf) return csrf

  const rl = await rateLimit("agent-memory-delete", 30, 60 * 1000)
  if (!rl.success) {
    return NextResponse.json(
      { error: `Demasiadas solicitudes. Intenta en ${Math.ceil(rl.resetIn / 1000)}s` },
      { status: 429, headers: { "Retry-After": String(Math.ceil(rl.resetIn / 1000)) } }
    )
  }

  try {
    const current = await requireRole(["admin", "manager"])
    const ctx = ctxFrom(current)
    const key = request.nextUrl.searchParams.get("key")?.trim()

    if (!key) {
      return NextResponse.json({ error: "Falta el parámetro key" }, { status: 400 })
    }

    const deleted = await getMemory().forget(ctx, key)

    if (deleted) {
      createAuditEntry({
        action: "memory.deleted",
        entity: "BusinessMemory",
        metadata: { key },
        userId: ctx.userId,
        storeId: ctx.storeId,
      }).catch(() => undefined)
    }

    return NextResponse.json({ deleted })
  } catch (error: unknown) {
    return toServiceResponse(error)
  }
}
