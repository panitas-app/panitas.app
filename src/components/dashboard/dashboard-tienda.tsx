"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Package, ShoppingCart, DollarSign, TrendingUp } from "lucide-react"
import type { Store } from "@prisma/client"
import { SalesChart } from "@/components/dashboard/sales-chart"
import { formatBCV } from "@/lib/bcv/format"

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
  const rate = initialRate
  const todayRevenueVes = data.todayRevenue * rate
  const weekRevenueVes = data.weekRevenue * rate

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div data-tour="dashboard-title">
          <h1 className="font-heading text-2xl font-black text-foreground tracking-tight md:text-3xl">Panel de Control</h1>
          <p className="text-xs text-muted-foreground font-semibold tracking-wider uppercase mt-1">{store.name} · Plan Tienda</p>
        </div>
        <div data-tour="bcv-rate" className="flex items-center gap-3 rounded-2xl bg-card p-3.5 shadow-xs">
          <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <DollarSign className="size-4.5" />
          </div>
          <div className="text-left">
            <span className="text-[10px] font-bold text-muted-foreground block uppercase tracking-wider">Tasa BCV del Día</span>
            <span className="text-sm font-black text-foreground">Bs. {formatBCV(rate)} / USD</span>
          </div>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Card data-tour="kpi-ventas-hoy" className="rounded-3xl bg-card shadow-xs overflow-hidden relative group">
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

        <Card data-tour="kpi-ventas-semanales" className="rounded-3xl bg-card shadow-xs overflow-hidden relative group">
          <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500" />
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Ventas Semanales</CardTitle>
            <div className="flex size-8 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-500">
              <DollarSign className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-foreground tracking-tight">${data.weekRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground font-semibold mt-1">Bs. {weekRevenueVes.toFixed(2)}</p>
          </CardContent>
        </Card>

        <Card data-tour="kpi-total-productos" className="rounded-3xl bg-card shadow-xs overflow-hidden relative group">
          <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500" />
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Total Productos</CardTitle>
            <div className="flex size-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
              <Package className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-foreground tracking-tight">{data.productCount}</div>
            <p className="text-xs text-muted-foreground font-semibold mt-1">Artículos registrados</p>
          </CardContent>
        </Card>

        <Card data-tour="kpi-pedidos-totales" className="rounded-3xl bg-card shadow-xs overflow-hidden relative group">
          <div className="absolute top-0 left-0 w-full h-1 bg-purple-500" />
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Pedidos Totales</CardTitle>
            <div className="flex size-8 items-center justify-center rounded-xl bg-purple-500/10 text-purple-500">
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
    </div>
  )
}
