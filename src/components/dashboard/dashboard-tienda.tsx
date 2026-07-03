"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Package, ShoppingCart, DollarSign, TrendingUp, RefreshCw, Pencil } from "lucide-react"
import type { Store } from "@prisma/client"
import { SalesChart } from "@/components/dashboard/sales-chart"
import { TrafficSources } from "@/components/dashboard/traffic-sources"
import { VisitorsPanel } from "@/components/dashboard/visitors-panel"
import { RecentOrdersWidget } from "@/components/dashboard/recent-orders-widget"
import { CategoryStats } from "@/components/dashboard/category-stats"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { toast } from "sonner"
import { useBcvRate } from "@/lib/bcv-context"

interface Props {
  store: Store
  rate: number
  planType: string
  data: {
    totalRevenue: number
    todayRevenue: number
    weekRevenue: number
    productCount: number
    totalOrders: number
    todayOrders: any[]
    weekOrders: any[]
    orders: any[]
  }
  orders: any[]
  visitorData: {
    today: number
    week: number
    month: number
    trend: "up" | "down"
    trendPct: number
    sources: { id: string; label: string; percentage: number }[]
  }
  categoryStats: { name: string; count: number; sales: number }[]
}

export function DashboardTienda({ store, rate: initialRate, data, orders, visitorData, categoryStats }: Props) {
  const [rate, setRate] = useState(initialRate)
  const { setRate: setGlobalRate } = useBcvRate()
  const [updating, setUpdating] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editValue, setEditValue] = useState("")
  const todayRevenueVes = data.todayRevenue * rate
  const weekRevenueVes = data.weekRevenue * rate

  const refreshRate = useCallback(async () => {
    try {
      const res = await fetch("/api/bcv", { method: "POST" })
      const result = await res.json()
      if (result.rate) { setRate(result.rate); setGlobalRate(result.rate) }
      return result
    } catch { return null }
  }, [setGlobalRate])

  async function handleRefreshRate() {
    setUpdating(true)
    const result = await refreshRate()
    if (result?.action === "updated") toast.success(`Tasa actualizada: Bs. ${result.rate}`)
    else if (result?.action === "no_change") toast.success("Tasa sin cambios")
    else if (result?.action === "fetch_error") toast.error("Error al consultar API externa")
    else toast.success("Tasa actualizada")
    setUpdating(false)
  }

  async function handleManualSave() {
    const val = parseFloat(editValue)
    if (!val || val <= 0) { toast.error("Tasa inválida"); return }
    try {
      const res = await fetch("/api/bcv", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rate: val }),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setRate(data.rate)
      setGlobalRate(data.rate)
      setEditOpen(false)
      toast.success(`Tasa manual: Bs. ${data.rate}`)
    } catch { toast.error("Error al guardar tasa") }
  }

  // Auto-poll every hour from 4:10 PM to 8:10 PM VET
  useEffect(() => {
    const poll = async () => {
      const hour = new Intl.DateTimeFormat("en-US", { timeZone: "America/Caracas", hour: "numeric", hour12: false }).format(new Date())
      const h = parseInt(hour, 10)
      if (h >= 16 && h <= 20) await refreshRate()
    }
    poll()
    const id = setInterval(poll, 60 * 60 * 1000)
    return () => clearInterval(id)
  }, [refreshRate])

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div data-tour="dashboard-title">
          <h1 className="font-heading text-2xl font-black text-foreground tracking-tight md:text-3xl">Panel de Control</h1>
          <p className="text-xs text-muted-foreground font-semibold tracking-wider uppercase mt-1">{store.name} · Plan Tienda</p>
        </div>
        <div data-tour="bcv-rate" className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3.5 shadow-xs">
          <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <DollarSign className="size-4.5" />
          </div>
          <div className="text-left">
            <span className="text-[10px] font-bold text-muted-foreground block uppercase tracking-wider">Tasa BCV del Día</span>
            <span className="text-sm font-black text-foreground">Bs. {rate.toFixed(2)} / USD</span>
          </div>
          <Button variant="ghost" size="icon" className="size-8 shrink-0" onClick={handleRefreshRate} disabled={updating} title="Actualizar tasa">
            <RefreshCw className={`size-4 ${updating ? "animate-spin" : ""}`} />
          </Button>
          <Button variant="ghost" size="icon" className="size-8 shrink-0" onClick={() => { setEditValue(String(rate)); setEditOpen(true) }} title="Editar tasa manual">
            <Pencil className="size-3.5" />
          </Button>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Card data-tour="kpi-ventas-hoy" className="rounded-3xl border border-border bg-card shadow-xs overflow-hidden relative group">
          <div className="absolute top-0 left-0 w-full h-1 bg-primary" />
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Ventas Hoy</CardTitle>
            <div className="flex size-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <TrendingUp className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-foreground tracking-tight">${data.todayRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground font-semibold mt-1">Bs. {todayRevenueVes.toFixed(2)}</p>
          </CardContent>
        </Card>

        <Card data-tour="kpi-ventas-semanales" className="rounded-3xl border border-border bg-card shadow-xs overflow-hidden relative group">
          <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500" />
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Ventas Semanales</CardTitle>
            <div className="flex size-8 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/30 text-indigo-500">
              <DollarSign className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-foreground tracking-tight">${data.weekRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground font-semibold mt-1">Bs. {weekRevenueVes.toFixed(2)}</p>
          </CardContent>
        </Card>

        <Card data-tour="kpi-total-productos" className="rounded-3xl border border-border bg-card shadow-xs overflow-hidden relative group">
          <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500" />
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Total Productos</CardTitle>
            <div className="flex size-8 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-500">
              <Package className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-foreground tracking-tight">{data.productCount}</div>
            <p className="text-xs text-muted-foreground font-semibold mt-1">Artículos registrados</p>
          </CardContent>
        </Card>

        <Card data-tour="kpi-pedidos-totales" className="rounded-3xl border border-border bg-card shadow-xs overflow-hidden relative group">
          <div className="absolute top-0 left-0 w-full h-1 bg-purple-500" />
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Pedidos Totales</CardTitle>
            <div className="flex size-8 items-center justify-center rounded-xl bg-purple-50 dark:bg-purple-950/30 text-purple-500">
              <ShoppingCart className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-foreground tracking-tight">{data.totalOrders}</div>
            <p className="text-xs text-muted-foreground font-semibold mt-1">Total: ${data.totalRevenue.toFixed(2)}</p>
          </CardContent>
        </Card>
      </div>

      <div data-tour="sales-chart"><SalesChart orders={orders} bcvRate={rate} /></div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div data-tour="visitors-panel"><VisitorsPanel {...visitorData} /></div>
        <div data-tour="recent-orders"><RecentOrdersWidget orders={orders} /></div>
        <div data-tour="category-stats"><CategoryStats type="category" items={categoryStats} /></div>
      </div>
      <div data-tour="traffic-sources"><TrafficSources sources={visitorData.sources} /></div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader><DialogTitle>Editar tasa BCV</DialogTitle></DialogHeader>
          <div className="py-2">
            <Input type="number" step="0.0001" value={editValue} onChange={(e) => setEditValue(e.target.value)}
              placeholder="Ej: 633.36" onKeyDown={(e) => e.key === "Enter" && handleManualSave()} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
            <Button onClick={handleManualSave}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
