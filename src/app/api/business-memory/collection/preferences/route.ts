import { NextRequest, NextResponse } from "next/server"
import { getCurrentStore } from "@/lib/permissions"
import { createBusinessMemoryEngine, readCollectionPreferences, recordCollectionUsage, saveCollectionWorkOrder, COLLECTION_PREF_KEYS } from "@/lib/business-memory"

const VALID_WORK_ORDERS = new Set(["vencidos_primero", "solo_vencidos", "todos"])
const VALID_CATEGORIES = new Set(["primer_recordatorio", "segundo_recordatorio", "ultimo_aviso", "despues_abono", "agradecimiento"])

const memory = createBusinessMemoryEngine()

export async function GET() {
  const current = await getCurrentStore()
  if (!current) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const ctx = { userId: current.userId, storeId: current.store.id, negocioId: undefined }
  const prefs = await readCollectionPreferences(memory, ctx)
  return NextResponse.json({ prefs, keys: COLLECTION_PREF_KEYS })
}

export async function POST(request: NextRequest) {
  const current = await getCurrentStore()
  if (!current) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const body = (await request.json().catch(() => ({}))) as {
    category?: string
    method?: string
    level?: number
    workOrder?: string
  }

  const ctx = { userId: current.userId, storeId: current.store.id, negocioId: undefined }

  await recordCollectionUsage(memory, ctx, {
    category: body.category && VALID_CATEGORIES.has(body.category) ? body.category : undefined,
    method: typeof body.method === "string" && body.method.length <= 60 ? body.method : undefined,
    level: body.level,
  })
  if (body.workOrder && VALID_WORK_ORDERS.has(body.workOrder)) {
    await saveCollectionWorkOrder(memory, ctx, body.workOrder)
  }

  const prefs = await readCollectionPreferences(memory, ctx)
  return NextResponse.json({ ok: true, prefs })
}
