"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar, Clock, CheckCircle, TrendingUp } from "lucide-react"
import type { Store } from "@prisma/client"
import { SalesChart } from "@/components/dashboard/sales-chart"
import { TrafficSources } from "@/components/dashboard/traffic-sources"
import { VisitorsPanel } from "@/components/dashboard/visitors-panel"
import { RecentOrdersWidget } from "@/components/dashboard/recent-orders-widget"
import { CategoryStats } from "@/components/dashboard/category-stats"

interface Props {
  store: Store
  rate: number
  planType: string
  data: {
    appointments: any[]
    todayApps: any[]
    pending: number
    confirmed: number
    completed: number
    serviceCount: number
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
  serviceStats: { name: string; count: number; sales: number }[]
}

export function DashboardAgenda({ store, rate, data, orders, visitorData, serviceStats }: Props) {
  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div data-tour="dashboard-title">
          <h1 className="font-heading text-2xl font-black text-foreground tracking-tight md:text-3xl">Panel de Agenda</h1>
          <p className="text-xs text-muted-foreground font-semibold tracking-wider uppercase mt-1">{store.name} · Plan Agenda</p>
        </div>
        <div data-tour="citas-hoy" className="flex items-center gap-3 rounded-2xl bg-card p-3.5 shadow-xs">
          <div className="flex size-9 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400">
            <Calendar className="size-4.5" />
          </div>
          <div className="text-left">
            <span className="text-[10px] font-bold text-muted-foreground block uppercase tracking-wider">Citas Hoy</span>
            <span className="text-sm font-black text-foreground">{data.todayApps.length} cita{data.todayApps.length !== 1 ? "s" : ""}</span>
          </div>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Card data-tour="kpi-pendientes" className="rounded-3xl bg-card shadow-xs overflow-hidden relative group">
          <div className="absolute top-0 left-0 w-full h-1 bg-purple-500" />
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Citas Pendientes</CardTitle>
            <div className="flex size-8 items-center justify-center rounded-xl bg-purple-500/10 text-purple-500">
              <Clock className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-foreground tracking-tight">{data.pending}</div>
            <p className="text-xs text-muted-foreground font-semibold mt-1">Esperando confirmación</p>
          </CardContent>
        </Card>

        <Card data-tour="kpi-confirmadas" className="rounded-3xl bg-card shadow-xs overflow-hidden relative group">
          <div className="absolute top-0 left-0 w-full h-1 bg-blue-500" />
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Citas Confirmadas</CardTitle>
            <div className="flex size-8 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500">
              <CheckCircle className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-foreground tracking-tight">{data.confirmed}</div>
            <p className="text-xs text-muted-foreground font-semibold mt-1">Próximas a realizarse</p>
          </CardContent>
        </Card>

        <Card data-tour="kpi-completadas" className="rounded-3xl bg-card shadow-xs overflow-hidden relative group">
          <div className="absolute top-0 left-0 w-full h-1 bg-green-500" />
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Completadas</CardTitle>
            <div className="flex size-8 items-center justify-center rounded-xl bg-green-500/10 text-green-500">
              <CheckCircle className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-foreground tracking-tight">{data.completed}</div>
            <p className="text-xs text-muted-foreground font-semibold mt-1">Citas realizadas</p>
          </CardContent>
        </Card>

        <Card data-tour="kpi-servicios" className="rounded-3xl bg-card shadow-xs overflow-hidden relative group">
          <div className="absolute top-0 left-0 w-full h-1 bg-amber-500" />
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Servicios</CardTitle>
            <div className="flex size-8 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
              <Calendar className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-foreground tracking-tight">{data.serviceCount}</div>
            <p className="text-xs text-muted-foreground font-semibold mt-1">Servicios activos</p>
          </CardContent>
        </Card>
      </div>

      <div data-tour="sales-chart"><SalesChart orders={orders} bcvRate={rate} /></div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div data-tour="visitors-panel"><VisitorsPanel {...visitorData} /></div>
        <div data-tour="recent-orders"><RecentOrdersWidget orders={orders} /></div>
        <div data-tour="category-stats"><CategoryStats type="service" items={serviceStats} /></div>
      </div>
      <div data-tour="traffic-sources"><TrafficSources sources={visitorData.sources} /></div>
    </div>
  )
}
