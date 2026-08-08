import { NextRequest, NextResponse } from "next/server"
import { getCurrentStore } from "@/lib/permissions"
import {
  createBusinessMemoryEngine,
  readSupplierPreferences,
  recordSupplierUsage,
  saveSupplierFilter,
  SUPPLIER_PREF_KEYS,
} from "@/lib/business-memory"

const VALID_FILTERS = new Set(["all", "saldado", "al_dia", "por_vencer", "vencido", "inactivo"])

const memory = createBusinessMemoryEngine()

export async function GET() {
  const current = await getCurrentStore()
  if (!current) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const ctx = { userId: current.userId, storeId: current.store.id, negocioId: undefined }
  const prefs = await readSupplierPreferences(memory, ctx)
  return NextResponse.json({ prefs, keys: SUPPLIER_PREF_KEYS })
}

export async function POST(request: NextRequest) {
  const current = await getCurrentStore()
  if (!current) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const body = (await request.json().catch(() => ({}))) as {
    category?: string
    method?: string
    filter?: string
  }

  const ctx = { userId: current.userId, storeId: current.store.id, negocioId: undefined }

  await recordSupplierUsage(memory, ctx, {
    category: typeof body.category === "string" && body.category.length <= 40 ? body.category : undefined,
    method: typeof body.method === "string" && body.method.length <= 60 ? body.method : undefined,
  })
  if (body.filter && VALID_FILTERS.has(body.filter)) {
    await saveSupplierFilter(memory, ctx, body.filter)
  }

  const prefs = await readSupplierPreferences(memory, ctx)
  return NextResponse.json({ ok: true, prefs })
}
