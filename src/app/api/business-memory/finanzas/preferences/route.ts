import { NextRequest, NextResponse } from "next/server"
import { getCurrentStore } from "@/lib/permissions"
import {
  createBusinessMemoryEngine,
  readFinancialPreferences,
  recordFinancialUsage,
  saveFinancialVisualization,
  FINANCIAL_PREF_KEYS,
} from "@/lib/business-memory"
import type { FinancialVisualization } from "@/lib/business-memory"

const VALID_PERIODS = new Set(["today", "week", "month"])
const VALID_VISUALIZATIONS = new Set<FinancialVisualization>(["resumen", "indicadores", "insights"])

const memory = createBusinessMemoryEngine()

export async function GET() {
  const current = await getCurrentStore()
  if (!current) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const ctx = { userId: current.userId, storeId: current.store.id, negocioId: undefined }
  const prefs = await readFinancialPreferences(memory, ctx)
  return NextResponse.json({ prefs, keys: FINANCIAL_PREF_KEYS })
}

export async function POST(request: NextRequest) {
  const current = await getCurrentStore()
  if (!current) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const body = (await request.json().catch(() => ({}))) as {
    period?: string
    indicators?: string[]
    visualization?: string
  }

  const ctx = { userId: current.userId, storeId: current.store.id, negocioId: undefined }

  await recordFinancialUsage(memory, ctx, {
    period: typeof body.period === "string" && VALID_PERIODS.has(body.period) ? body.period : undefined,
    indicators: Array.isArray(body.indicators) ? body.indicators.filter((v): v is string => typeof v === "string").slice(0, 8) : undefined,
  })
  if (typeof body.visualization === "string" && VALID_VISUALIZATIONS.has(body.visualization as FinancialVisualization)) {
    await saveFinancialVisualization(memory, ctx, body.visualization as FinancialVisualization)
  }

  const prefs = await readFinancialPreferences(memory, ctx)
  return NextResponse.json({ ok: true, prefs })
}
