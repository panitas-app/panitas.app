"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Banknote, FileBarChart2, HandCoins, Sparkles } from "lucide-react"
import { toast } from "sonner"
import { LoadingState } from "@/components/ui/loading-state"
import { cn } from "@/lib/utils"
import { KpiGrid } from "@/components/dashboard/financial/kpi-grid"
import { ExecutiveSummary } from "@/components/dashboard/financial/executive-summary"
import { InsightsList } from "@/components/dashboard/financial/insights-list"
import {
  PERIODS,
  formatDate,
  money,
  initialsOf,
  type FinancialIndicators,
  type FinancialPanel,
  type FinancialPeriod,
  type FinancialSummary,
} from "@/components/dashboard/financial/financial-types"

type View = "todo" | "resumen" | "indicadores" | "insights"

const VIEWS: Array<{ value: View; label: string }> = [
  { value: "todo", label: "Todo" },
  { value: "resumen", label: "Resumen" },
  { value: "indicadores", label: "Indicadores" },
  { value: "insights", label: "Insights" },
]

export default function FinanzasPage() {
  const [panel, setPanel] = useState<FinancialPanel | null>(null)
  const [period, setPeriod] = useState<FinancialPeriod>("week")
  const [view, setView] = useState<View>("todo")
  const [loading, setLoading] = useState(true)
  const prefsRef = useRef<{ loaded: boolean; period: FinancialPeriod | null; view: View }>({
    loaded: false,
    period: null,
    view: "todo",
  })

  useEffect(() => {
    let active = true
    fetch("/api/business-memory/finanzas/preferences")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active || !data?.prefs) return
        const prefs = data.prefs as { favoritePeriod?: string | null; visualization?: string }
        prefsRef.current.loaded = true
        if (prefs.favoritePeriod === "today" || prefs.favoritePeriod === "week" || prefs.favoritePeriod === "month") {
          prefsRef.current.period = prefs.favoritePeriod
          setPeriod(prefs.favoritePeriod)
        }
        if (prefs.visualization === "resumen" || prefs.visualization === "indicadores" || prefs.visualization === "insights") {
          prefsRef.current.view = prefs.visualization
          setView(prefs.visualization)
        }
      })
      .catch(() => {
        prefsRef.current.loaded = true
      })
    return () => {
      active = false
    }
  }, [])

  const recordUsage = useCallback((nextPeriod: FinancialPeriod, indicators: FinancialIndicators) => {
    const consulted: string[] = []
    if (indicators.netFlow !== 0) consulted.push("flujo")
    if (indicators.totalPending > 0) consulted.push("por_cobrar")
    if (indicators.totalPayable > 0) consulted.push("por_pagar")
    if (indicators.overdueCredits > 0 || indicators.overdueSupplierInvoices > 0) consulted.push("vencidos")
    void fetch("/api/business-memory/finanzas/preferences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ period: nextPeriod, indicators: consulted.slice(0, 4) }),
    }).catch(() => {})
  }, [])

  const fetchPanel = useCallback(
    async (nextPeriod: FinancialPeriod, record: boolean) => {
      try {
        const res = await fetch(`/api/financial?period=${nextPeriod}`)
        if (!res.ok) throw new Error("Error al cargar el panel financiero")
        const data = await res.json()
        setPanel(data.panel)
        if (record && data.panel?.indicators) {
          recordUsage(nextPeriod, data.panel.indicators)
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Error al cargar el panel financiero")
      } finally {
        setLoading(false)
      }
    },
    [recordUsage],
  )

  useEffect(() => {
    fetchPanel(period, prefsRef.current.loaded || period !== prefsRef.current.period)
  }, [period, fetchPanel])

  const saveView = useCallback((next: View) => {
    setView(next)
    if (next === "todo") return
    void fetch("/api/business-memory/finanzas/preferences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visualization: next }),
    }).catch(() => {})
  }, [])

  const indicators = panel?.indicators
  const summary: FinancialSummary | null = panel?.summary ?? null

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-xl font-black flex items-center gap-2">
            <FileBarChart2 className="size-6 text-primary" /> Inteligencia Financiera
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Tus ingresos, gastos, cuentas por cobrar y por pagar en un solo panel ejecutivo.
          </p>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {PERIODS.map((p) => {
            const active = period === p.value
            return (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value)}
                className={cn(
                  "inline-flex items-center px-3.5 h-9 text-xs font-bold rounded border transition-colors",
                  active
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-muted-foreground border-border hover:border-primary/50",
                )}
              >
                {p.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex items-center gap-1.5 rounded-xl border border-border/60 bg-background p-1 w-fit">
        {VIEWS.map((v) => {
          const active = view === v.value
          return (
            <button
              key={v.value}
              onClick={() => saveView(v.value)}
              className={cn(
                "rounded-lg px-3 h-8 text-xs font-bold transition-colors",
                active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {v.label}
            </button>
          )
        })}
      </div>

      {loading && !panel ? (
        <LoadingState message="Calculando inteligencia financiera..." />
      ) : panel && indicators ? (
        <>
          {view !== "indicadores" && view !== "insights" && summary && (
            <ExecutiveSummary summary={summary} indicators={indicators} />
          )}

          {view !== "resumen" && view !== "insights" && <KpiGrid indicators={indicators} />}

          {(view === "todo" || view === "indicadores") && (
            <div className="grid gap-3 md:grid-cols-2">
              <TopCollectList indicators={indicators} />
              <TopPayList indicators={indicators} />
            </div>
          )}

          {view !== "resumen" && view !== "indicadores" && (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 text-primary" />
                <h2 className="text-sm font-black text-foreground">Qué revisar hoy</h2>
                <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-bold text-muted-foreground">
                  {panel.insights.length}
                </span>
              </div>
              <InsightsList insights={panel.insights} />
            </section>
          )}
        </>
      ) : (
        <p className="text-sm text-muted-foreground">No se pudieron cargar los datos financieros.</p>
      )}
    </div>
  )
}

function TopCollectList({ indicators }: { indicators: FinancialIndicators }) {
  if (indicators.topDebtors.length === 0) {
    return (
      <div className="rounded-xl border border-border/50 bg-background/70 p-4">
        <p className="text-xs font-black text-success">No tienes deudas por cobrar</p>
        <p className="text-xs text-muted-foreground mt-1">No hay clientes con créditos pendientes.</p>
      </div>
    )
  }
  return (
    <div className="rounded-xl border border-border/50 bg-background/70 p-4">
      <div className="flex items-center gap-2 mb-3">
        <HandCoins className="size-4 text-success" />
        <h3 className="text-xs font-black text-foreground">Clientes con mayor deuda</h3>
      </div>
      <div className="space-y-2">
        {indicators.topDebtors.map((debtor) => (
          <div key={debtor.name} className="flex items-center gap-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-black text-foreground">
              {initialsOf(debtor.name)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-bold text-foreground">{debtor.name}</p>
            </div>
            <span className="text-xs font-black text-foreground">{money(debtor.pending)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function TopPayList({ indicators }: { indicators: FinancialIndicators }) {
  if (indicators.topPayableSuppliers.length === 0) {
    return (
      <div className="rounded-xl border border-border/50 bg-background/70 p-4">
        <p className="text-xs font-black text-info">No tienes cuentas por pagar</p>
        <p className="text-xs text-muted-foreground mt-1">No hay facturas pendientes con proveedores.</p>
      </div>
    )
  }
  return (
    <div className="rounded-xl border border-border/50 bg-background/70 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Banknote className="size-4 text-info" />
        <h3 className="text-xs font-black text-foreground">Proveedores a pagar primero</h3>
      </div>
      <div className="space-y-2">
        {indicators.topPayableSuppliers.map((supplier) => (
          <div key={supplier.name} className="flex items-center gap-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-black text-foreground">
              {initialsOf(supplier.name)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-bold text-foreground">{supplier.name}</p>
              {supplier.dueDate && (
                <p className="text-[10px] text-muted-foreground">Vence {formatDate(supplier.dueDate)}</p>
              )}
            </div>
            <span className="text-xs font-black text-foreground">{money(supplier.outstanding)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
