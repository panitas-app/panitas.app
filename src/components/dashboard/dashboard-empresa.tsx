"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DollarSign, ShoppingCart, Calendar, Users, TrendingUp, CheckCircle, Clock, Zap, Receipt } from "lucide-react"
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
  sales: {
    totalRevenue: number
    todayRevenue: number
    weekRevenue: number
    productCount: number
    totalOrders: number
  }
  appointments: {
    pending: number
    confirmed: number
    completed: number
    todayApps: any[]
  }
  crm: {
    totalCustomers: number
    customersWithOrders: number
    followUps: number
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
  serviceStats: { name: string; count: number; sales: number }[]
  pendingCommissions: number
}

export function DashboardEmpresa({ store, rate: initialRate, sales, appointments, crm, orders, visitorData, categoryStats, serviceStats, pendingCommissions }: Props) {
  const rate = initialRate

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div data-tour="dashboard-title">
          <h1 className="font-heading text-2xl font-black text-foreground tracking-tight md:text-3xl">Resumen Ejecutivo</h1>
          <p className="text-xs text-muted-foreground font-semibold tracking-wider uppercase mt-1">{store.name} · Plan Empresa</p>
        </div>
        <div className="flex items-center gap-3 rounded-2xl bg-card p-3.5 shadow-xs">
          <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <DollarSign className="size-4.5" />
          </div>
          <div className="text-left">
            <span className="text-[10px] font-bold text-muted-foreground block uppercase tracking-wider">Tasa BCV del Día</span>
            <span className="text-sm font-black text-foreground">Bs. {rate.toFixed(2)} / USD</span>
          </div>
        </div>
      </div>

      {/* Executive KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card data-tour="kpi-ventas-hoy" className="rounded-2xl bg-card shadow-xs">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Ventas Hoy</span>
              <TrendingUp className="size-4 text-primary" />
            </div>
            <p className="text-xl font-black text-foreground">${sales?.todayRevenue.toFixed(2) ?? "0.00"}</p>
          </CardContent>
        </Card>
        <Card data-tour="kpi-comisiones-pendientes" className="rounded-2xl bg-card shadow-xs">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Comisiones Pend.</span>
              <Receipt className="size-4 text-amber-500" />
            </div>
            <p className="text-xl font-black text-foreground">{pendingCommissions}</p>
          </CardContent>
        </Card>
        <Card data-tour="kpi-citas-hoy" className="rounded-2xl bg-card shadow-xs">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Citas Hoy</span>
              <Calendar className="size-4 text-purple-500" />
            </div>
            <p className="text-xl font-black text-foreground">{appointments?.todayApps.length ?? 0}</p>
          </CardContent>
        </Card>
        <Card data-tour="kpi-clientes" className="rounded-2xl bg-card shadow-xs">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Clientes</span>
              <Users className="size-4 text-emerald-500" />
            </div>
            <p className="text-xl font-black text-foreground">{crm?.totalCustomers ?? 0}</p>
          </CardContent>
        </Card>
        <Card data-tour="kpi-seguimientos" className="rounded-2xl bg-card shadow-xs">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Seguimientos</span>
              <Zap className="size-4 text-amber-500" />
            </div>
            <p className="text-xl font-black text-foreground">{crm?.followUps ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      {/* Two-column layout */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Sales column */}
        <div className="space-y-4">
          <h2 className="font-heading text-sm font-bold text-foreground flex items-center gap-2"><ShoppingCart className="size-4" /> Ventas</h2>
          <div className="grid grid-cols-2 gap-3">
            <Card className="rounded-xl bg-card">
              <CardContent className="p-4">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase">Ventas Semanales</p>
                <p className="text-lg font-bold text-foreground mt-1">${sales.weekRevenue.toFixed(2)}</p>
              </CardContent>
            </Card>
            <Card className="rounded-xl bg-card">
              <CardContent className="p-4">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase">Total Pedidos</p>
                <p className="text-lg font-bold text-foreground mt-1">{sales.totalOrders}</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Appointments column */}
        <div className="space-y-4">
          <h2 className="font-heading text-sm font-bold text-foreground flex items-center gap-2"><Calendar className="size-4" /> Agenda</h2>
          <div className="grid grid-cols-3 gap-3">
            <Card className="rounded-xl bg-card">
              <CardContent className="p-4 text-center">
                <Clock className="size-4 text-purple-500 mx-auto mb-1" />
                <p className="text-lg font-bold text-foreground">{appointments.pending}</p>
                <p className="text-[10px] text-muted-foreground">Pendientes</p>
              </CardContent>
            </Card>
            <Card className="rounded-xl bg-card">
              <CardContent className="p-4 text-center">
                <CheckCircle className="size-4 text-blue-500 mx-auto mb-1" />
                <p className="text-lg font-bold text-foreground">{appointments.confirmed}</p>
                <p className="text-[10px] text-muted-foreground">Confirmadas</p>
              </CardContent>
            </Card>
            <Card className="rounded-xl bg-card">
              <CardContent className="p-4 text-center">
                <CheckCircle className="size-4 text-green-500 mx-auto mb-1" />
                <p className="text-lg font-bold text-foreground">{appointments.completed}</p>
                <p className="text-[10px] text-muted-foreground">Completadas</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* CRM Section */}
      <div className="space-y-4">
        <h2 className="font-heading text-sm font-bold text-foreground flex items-center gap-2"><Users className="size-4" /> CRM</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <Card className="rounded-xl bg-card">
            <CardContent className="p-4">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase">Clientes nuevos</p>
              <p className="text-lg font-bold text-foreground mt-1">{crm.totalCustomers}</p>
            </CardContent>
          </Card>
          <Card className="rounded-xl bg-card">
            <CardContent className="p-4">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase">Clientes recurrentes</p>
              <p className="text-lg font-bold text-foreground mt-1">{crm.customersWithOrders}</p>
            </CardContent>
          </Card>
          <Card className="rounded-xl bg-card">
            <CardContent className="p-4">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase">Seguimientos pendientes</p>
              <p className="text-lg font-bold text-foreground mt-1">{crm.followUps}</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div data-tour="visitors-panel"><VisitorsPanel {...visitorData} /></div>
        <div data-tour="recent-orders"><RecentOrdersWidget orders={orders} /></div>
        <div data-tour="category-stats"><CategoryStats type="category" items={categoryStats} /></div>
      </div>
      <div data-tour="sales-chart"><SalesChart orders={orders} bcvRate={rate} /></div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div data-tour="traffic-sources"><TrafficSources sources={visitorData.sources} /></div>
        <div data-tour="service-stats"><CategoryStats type="service" items={serviceStats} /></div>
      </div>
    </div>
  )
}
