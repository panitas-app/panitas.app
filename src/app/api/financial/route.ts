import { NextRequest, NextResponse } from "next/server"
import { getCurrentStore } from "@/lib/permissions"
import { FinancialEngine } from "@/lib/financial-intelligence"
import type { FinancialPeriod } from "@/lib/financial-intelligence"

const engine = new FinancialEngine()

const VALID_PERIODS: FinancialPeriod[] = ["today", "week", "month"]

function parsePeriod(raw: string | null): FinancialPeriod {
  return raw && (VALID_PERIODS as string[]).includes(raw) ? (raw as FinancialPeriod) : "week"
}

/** Devuelve el panel ejecutivo de inteligencia financiera. */
export async function GET(request: NextRequest) {
  const current = await getCurrentStore()
  if (!current) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const period = parsePeriod(searchParams.get("period"))
  const view = searchParams.get("view")

  const ctx = { storeId: current.store.id, userId: current.userId }

  try {
    if (view === "summary") {
      const summary = await engine.getSummary(ctx, period)
      return NextResponse.json({ summary, period })
    }
    if (view === "insights") {
      const insights = await engine.getInsights(ctx, period)
      return NextResponse.json({ insights, period })
    }

    const panel = await engine.getPanel(ctx, period)
    return NextResponse.json({ panel })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error al cargar la inteligencia financiera"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
