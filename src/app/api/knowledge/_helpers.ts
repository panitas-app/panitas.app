import { NextResponse } from "next/server"
import { getCurrentStore } from "@/lib/permissions"
import { tryHasFeature } from "@/lib/features"
import { isServiceError } from "@/services/errors"
import type { StoreServiceContext } from "@/services/context"

export type StoreInfo = NonNullable<Awaited<ReturnType<typeof getCurrentStore>>>

/** Contexto multi-tenant para el servicio de la Base de Conocimiento. */
export function knowledgeCtxFrom(current: StoreInfo): StoreServiceContext {
  return {
    storeId: current.store.id,
    userId: current.userId,
    negocioId: current.store.negocioId ?? undefined,
    role: current.role,
    plan: current.store.plan,
    storeName: current.store.name,
  }
}

/** Requiere sesión + feature de Base de Conocimiento. Devuelve null si no accede. */
export async function requireKnowledgeStore(): Promise<{ ctx: StoreServiceContext; store: StoreInfo } | null> {
  const current = await getCurrentStore()
  if (!current) return null
  const planRef = { plan: current.store.plan, planType: current.store.planType }
  const access = tryHasFeature(planRef, "knowledge_base")
  if (!access.allowed) return null
  return { ctx: knowledgeCtxFrom(current), store: current }
}

export function knowledgeErrorResponse(error: unknown, fallback: string): NextResponse {
  if (isServiceError(error)) return NextResponse.json({ error: error.message }, { status: error.status })
  const message = error instanceof Error ? error.message : fallback
  return NextResponse.json({ error: message }, { status: 500 })
}
