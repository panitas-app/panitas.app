import { NextRequest, NextResponse } from "next/server"
import { getCurrentStore } from "@/lib/permissions"
import { createBusinessMemoryEngine, readCreditPreferences, saveCreditPreferences, DEFAULT_CREDIT_VIEW_PREFS } from "@/lib/business-memory"
import { CREDIT_PREF_FILTER_KEY, CREDIT_PREF_SEARCH_KEY } from "@/lib/business-memory/credit-preferences"

const VALID_FILTERS = new Set(["all", "on_time", "upcoming", "overdue", "paid", "cancelled"])

const memory = createBusinessMemoryEngine()

export async function GET() {
  const current = await getCurrentStore()
  if (!current) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const ctx = { userId: current.userId, storeId: current.store.id, negocioId: undefined }
  const prefs = await readCreditPreferences(memory, ctx)
  return NextResponse.json({ prefs, keys: { filter: CREDIT_PREF_FILTER_KEY, search: CREDIT_PREF_SEARCH_KEY } })
}

export async function POST(request: NextRequest) {
  const current = await getCurrentStore()
  if (!current) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const body = (await request.json().catch(() => ({}))) as { filter?: string; search?: string }
  const next: typeof DEFAULT_CREDIT_VIEW_PREFS = {
    filter: body.filter && VALID_FILTERS.has(body.filter) ? body.filter : DEFAULT_CREDIT_VIEW_PREFS.filter,
    search: typeof body.search === "string" && body.search.length <= 120 ? body.search.trim() : "",
  }

  const ctx = { userId: current.userId, storeId: current.store.id, negocioId: undefined }
  await saveCreditPreferences(memory, ctx, next)
  return NextResponse.json({ ok: true, prefs: next })
}
