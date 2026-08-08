"use client"

import { useMemo, useState, type ReactNode } from "react"
import { BarChart3, Boxes, PieChart, ShoppingCart, TrendingUp, Users } from "lucide-react"

import { SalesChart } from "@/components/dashboard/sales-chart"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { aggregateOrdersByStatus } from "@/lib/business-intelligence-center"
import type { BicBalance, BicInventario, BicMonthlyPoint } from "./bic-data"
import { BicMoney } from "./bic-shared"
import { cn } from "@/lib/utils"

type AnalysisView = "ventas" | "pedidos" | "clientes" | "rentabilidad" | "inventario"

const VIEWS: { id: AnalysisView; label: string; icon: typeof TrendingUp }[] = [
  { id: "ventas", label: "Ventas", icon: TrendingUp },
  { id: "pedidos", label: "Pedidos", icon: ShoppingCart },
  { id: "clientes", label: "Clientes", icon: Users },
  { id: "rentabilidad", label: "Rentabilidad", icon: PieChart },
  { id: "inventario", label: "Inventario", icon: Boxes },
]

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente",
  confirmed: "Confirmado",
  preparing: "Preparando",
  shipped: "Enviado",
  delivered: "Entregado",
  cancelled: "Cancelado",
}

/** Barras agrupadas (ingresos vs gastos) para la serie mensual. */
function MonthlyGroupedBars({ points }: { points: BicMonthlyPoint[] }) {
  const maxVal = Math.max(...points.map((p) => Math.max(p.revenue, p.expenses)), 1)
  const hasData = points.some((p) => p.revenue > 0 || p.expenses > 0)

  if (!hasData) {
    return <EmptyChart text="Aún no hay datos de ingresos ni gastos por mes." />
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-emerald-500" /> Ingresos
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-rose-500" /> Gastos
        </span>
      </div>
      <div className="flex h-48 items-end gap-1.5 overflow-x-auto pb-1">
        {points.map((p) => (
          <div key={p.month} className="group flex min-w-8 flex-1 flex-col items-center gap-1">
            <div className="flex h-36 w-full items-end justify-center gap-1">
              <div
                className="w-1/2 max-w-5 rounded-t bg-emerald-500 transition-all"
                style={{ height: `${(p.revenue / maxVal) * 100}%` }}
                title={`${p.label}: ingresos $${p.revenue.toFixed(2)}`}
              />
              <div
                className="w-1/2 max-w-5 rounded-t bg-rose-500 transition-all"
                style={{ height: `${(p.expenses / maxVal) * 100}%` }}
                title={`${p.label}: gastos $${p.expenses.toFixed(2)}`}
              />
            </div>
            <span className="text-[10px] text-muted-foreground">{p.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/** Barras horizontales por categoría (estados de pedido, márgenes, etc.). */
function CategoryBars({
  items,
}: {
  items: { label: string; value: number; sub?: ReactNode }[]
}) {
  const maxVal = Math.max(...items.map((i) => i.value), 1)
  if (items.length === 0 || items.every((i) => i.value === 0)) {
    return <EmptyChart text="Sin datos para mostrar." />
  }
  return (
    <div className="space-y-3">
      {items.map((item) => {
        const pct = Math.max(2, Math.round((item.value / maxVal) * 100))
        return (
          <div key={item.label} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{item.label}</span>
              <span className="text-xs text-muted-foreground">
                {item.sub ?? String(item.value)}
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function EmptyChart({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-10">
      <BarChart3 className="size-6 text-muted-foreground/40" />
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  )
}

/**
 * Área Análisis del Business Intelligence Center (FASE 5A).
 *
 * Un gráfico a la vez: el usuario elige la dimensión (Ventas, Pedidos,
 * Clientes, Rentabilidad, Inventario) con los filtros superiores.
 */
export function BicAnalysisArea({
  balance,
  inventario,
  hideInventario,
  orders,
  bcvRate,
}: {
  balance: BicBalance
  inventario: BicInventario | null
  hideInventario: boolean
  orders: { id: string; total: number; bcvRateAtOrder: number | null; createdAt: Date }[]
  bcvRate: number
}) {
  const [view, setView] = useState<AnalysisView>("ventas")

  const ordersByStatus = useMemo(() => aggregateOrdersByStatus(balance.statusCounts), [balance.statusCounts])

  const marginItems = useMemo(() => {
    if (!inventario) return []
    return [...inventario.products]
      .filter((p) => p.price > 0)
      .sort((a, b) => b.marginPercent - a.marginPercent)
      .slice(0, 10)
      .map((p) => ({
        label: p.name,
        value: p.marginPercent,
        sub: (
          <>
            {p.marginPercent.toFixed(1)}% · <BicMoney value={p.marginPerUnit} />
          </>
        ),
      }))
  }, [inventario])

  const visibleViews = hideInventario ? VIEWS.filter((v) => v.id !== "inventario") : VIEWS

  return (
    <div className="space-y-4">
      <div className="flex gap-1.5 overflow-x-auto rounded-xl border border-border/60 bg-card/70 p-1">
        {visibleViews.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setView(id)}
            aria-pressed={view === id}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
              view === id ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted/70"
            )}
          >
            <Icon className="size-3.5" />
            {label}
          </button>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">
            {VIEWS.find((v) => v.id === view)?.label} — evolución y detalle
          </CardTitle>
        </CardHeader>
        <CardContent>
          {view === "ventas" ? (
            <SalesChart orders={orders} bcvRate={bcvRate} />
          ) : view === "pedidos" ? (
            <CategoryBars
              items={Object.entries(ordersByStatus.byStatus).map(([status, count]) => ({
                label: STATUS_LABELS[status] ?? status,
                value: count,
                sub: `${count} pedido${count === 1 ? "" : "s"}`,
              }))}
            />
          ) : view === "clientes" ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: "Clientes totales", value: String(balance.customers.total) },
                { label: "Nuevos este mes", value: String(balance.customers.newThisMonth) },
                { label: "Reincidentes", value: String(balance.customers.recurrent) },
                { label: "Inactivos", value: String(balance.customers.inactive) },
                { label: "Valor promedio", value: <BicMoney value={balance.customers.averageCustomerValue} /> },
                { label: "Total gastado", value: <BicMoney value={balance.customers.totalSpent} /> },
              ].map((item) => (
                <div key={item.label} className="rounded-xl bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className="mt-0.5 font-heading text-base font-bold text-foreground">{item.value}</p>
                </div>
              ))}
            </div>
          ) : view === "rentabilidad" ? (
            <MonthlyGroupedBars points={balance.monthlySeries} />
          ) : (
            <CategoryBars items={marginItems} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
