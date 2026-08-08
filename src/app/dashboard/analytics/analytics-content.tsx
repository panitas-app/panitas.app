"use client"

import { useEffect, useState } from "react"

import { BicAreaNav, type BicAreaId } from "@/components/business-intelligence-center/bic-shared"
import { BicMonitorArea } from "@/components/business-intelligence-center/bic-monitor-area"
import { BicOperationArea } from "@/components/business-intelligence-center/bic-operation-area"
import { BicFinancialArea } from "@/components/business-intelligence-center/bic-financial-area"
import { BicAnalysisArea } from "@/components/business-intelligence-center/bic-analysis-area"
import { BicReportsArea } from "@/components/business-intelligence-center/bic-reports-area"
import type { BicBalance, BicBreakeven, BicInventario } from "@/components/business-intelligence-center/bic-data"

interface ChartOrder {
  id: string
  total: number
  bcvRateAtOrder: number | null
  createdAt: Date
}

const PLAN_TYPES_SIN_INVENTARIO = ["agenda", "reservas"]

/**
 * Reportes → Business Intelligence Center (FASE 5A).
 *
 * Cinco áreas con un solo enfoque cada una: Monitor (protagonista), Operación,
 * Salud Financiera, Análisis y Reportes. Consume las APIs existentes sin
 * duplicar lógica; solo reorganiza la presentación.
 */
export function AnalyticsContent({ orders, initialRate }: { orders: ChartOrder[]; initialRate: number }) {
  const [balance, setBalance] = useState<BicBalance | null>(null)
  const [inventario, setInventario] = useState<BicInventario | null>(null)
  const [breakeven, setBreakeven] = useState<BicBreakeven | null>(null)
  const [storeName, setStoreName] = useState("")
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [hideInventario, setHideInventario] = useState(false)
  const [area, setArea] = useState<BicAreaId>("monitor")

  useEffect(() => {
    let cancelled = false
    Promise.all([
      fetch("/api/analytics").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/analytics/finanzas").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/analytics/breakeven").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/stores").then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([a, f, b, store]) => {
        if (cancelled) return
        setBalance(a)
        setInventario(f)
        setBreakeven(b)
        if (store) {
          setStoreName(store.name || "")
          if (PLAN_TYPES_SIN_INVENTARIO.includes(store.planType)) {
            setHideInventario(true)
          }
        }
        if (!a) setLoadError(true)
      })
      .catch(() => {
        if (!cancelled) setLoadError(true)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  if (loadError || !balance) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground">
        No se pudieron cargar los datos. Intenta de nuevo en un momento.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-black tracking-tight text-foreground md:text-3xl">
          Reportes
        </h1>
        <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {storeName ? `${storeName} · Business Intelligence Center` : "Business Intelligence Center"}
        </p>
      </div>

      <BicAreaNav active={area} onChange={setArea} />

      {area === "monitor" ? (
        <BicMonitorArea />
      ) : area === "operacion" ? (
        <BicOperationArea balance={balance} inventario={inventario} hideInventario={hideInventario} />
      ) : area === "finanzas" ? (
        <BicFinancialArea balance={balance} breakeven={breakeven} />
      ) : area === "analisis" ? (
        <BicAnalysisArea
          balance={balance}
          inventario={inventario}
          hideInventario={hideInventario}
          orders={orders}
          bcvRate={initialRate}
        />
      ) : (
        <BicReportsArea balance={balance} inventario={inventario} breakeven={breakeven} />
      )}
    </div>
  )
}
