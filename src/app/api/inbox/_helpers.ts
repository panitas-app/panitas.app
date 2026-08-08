import { NextResponse } from "next/server"
import { getCurrentStore } from "@/lib/permissions"
import { tryHasFeature } from "@/lib/features"
import { isServiceError } from "@/services/errors"
import type { InboxContext } from "@/lib/inbox"

export type StoreInfo = NonNullable<Awaited<ReturnType<typeof getCurrentStore>>>

/** Contexto de tenant + store para las rutas del inbox. `null` si no hay sesión. */
export async function requireInboxStore(): Promise<{ ctx: InboxContext; store: StoreInfo } | null> {
  const current = await getCurrentStore()
  if (!current) return null
  const planRef = { plan: current.store.plan, planType: current.store.planType }
  const access = tryHasFeature(planRef, "unified_chat")
  if (!access.allowed) return null
  return {
    ctx: { storeId: current.store.id, userId: current.userId },
    store: current,
  }
}

export function inboxErrorResponse(error: unknown, fallback: string): NextResponse {
  if (isServiceError(error)) return NextResponse.json({ error: error.message }, { status: error.status })
  const message = error instanceof Error ? error.message : fallback
  return NextResponse.json({ error: message }, { status: 500 })
}
