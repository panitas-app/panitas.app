"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { DollarSign, ShoppingCart, Calendar, TrendingUp, Users, Briefcase, BarChart3, ArrowRight, CreditCard, XCircle, CheckCircle, Clock, Wallet } from "lucide-react"
import type { Store } from "@prisma/client"

interface Props {
  store: Store
  rate: number
  planType: string
  sales: { totalRevenue: number; todayRevenue: number; weekRevenue: number; productCount: number; totalOrders: number; todayOrders: any[]; weekOrders: any[] }
  appointments: { pending: number; confirmed: number; completed: number; todayApps: any[]; cancelled: number }
  orders: any[]
  visitorData: { today: number; week: number; month: number; trend: "up" | "down"; trendPct: number; sources: { id: string; label: string; percentage: number }[] }
  categoryStats: { name: string; count: number; sales: number }[]
  serviceStats: { name: string; count: number; sales: number }[]
  employeeCount: number
  newCustomers: number
  recentActivity: { id: string; type: string; desc: string; time: string; status?: string }[]
}

export function DashboardNegocio({ store, rate, sales, appointments, orders, visitorData, categoryStats, serviceStats, employeeCount, newCustomers, recentActivity }: Props) {
  const totalToday = sales.todayRevenue + (appointments.todayApps?.length || 0) * 0

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-black text-foreground tracking-tight md:text-3xl">Panel Ejecutivo</h1>
          <p className="text-xs text-muted-foreground font-semibold tracking-wider uppercase mt-1">{store.name} · Plan Negocio</p>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3.5 shadow-xs">
          <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <DollarSign className="size-4.5" />
          </div>
          <div className="text-left">
            <span className="text-[10px] font-bold text-muted-foreground block uppercase tracking-wider">Tasa BCV</span>
            <span className="text-sm font-black text-foreground">Bs. {rate.toFixed(2)} / USD</span>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="rounded-2xl border-border/50 shadow-xs">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Ventas productos hoy</span>
              <div className="flex size-8 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-500"><TrendingUp className="size-4" /></div>
            </div>
            <div className="text-2xl font-black text-foreground">${sales.todayRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">{sales.todayOrders.length} pedido(s)</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/50 shadow-xs">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Citas hoy</span>
              <div className="flex size-8 items-center justify-center rounded-xl bg-purple-50 dark:bg-purple-950/30 text-purple-500"><Calendar className="size-4" /></div>
            </div>
            <div className="text-2xl font-black text-foreground">{appointments.todayApps.length}</div>
            <div className="flex gap-2 mt-1 text-xs">
              <span className="text-amber-500">{appointments.pending} pendientes</span>
              <span className="text-emerald-500">{appointments.confirmed} confirmadas</span>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/50 shadow-xs">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Total Facturado</span>
              <div className="flex size-8 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/30 text-blue-500"><Wallet className="size-4" /></div>
            </div>
            <div className="text-2xl font-black text-foreground">${sales.totalRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">{sales.totalOrders} pedidos totales</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/50 shadow-xs">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Nuevos clientes</span>
              <div className="flex size-8 items-center justify-center rounded-xl bg-rose-50 dark:bg-rose-950/30 text-rose-500"><Users className="size-4" /></div>
            </div>
            <div className="text-2xl font-black text-foreground">{newCustomers}</div>
            <p className="text-xs text-muted-foreground mt-1">hoy</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="rounded-2xl border-border/50 lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-sm font-bold">Resumen financiero semanal</CardTitle>
            <Link href="/dashboard/finanzas" className="text-xs text-primary hover:underline flex items-center gap-1">
              Ver finanzas <ArrowRight className="size-3" />
            </Link>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/20 p-4">
                <p className="text-xs text-muted-foreground mb-1">Ventas productos</p>
                <p className="text-lg font-black text-emerald-600">${sales.weekRevenue.toFixed(2)}</p>
              </div>
              <div className="rounded-xl bg-purple-50 dark:bg-purple-950/20 p-4">
                <p className="text-xs text-muted-foreground mb-1">Ventas servicios</p>
                <p className="text-lg font-black text-purple-600">${(appointments.completed * 25).toFixed(2)}</p>
              </div>
              <div className="rounded-xl bg-blue-50 dark:bg-blue-950/20 p-4">
                <p className="text-xs text-muted-foreground mb-1">Total semana</p>
                <p className="text-lg font-black text-blue-600">${(sales.weekRevenue + appointments.completed * 25).toFixed(2)}</p>
              </div>
            </div>
            <div className="h-48 bg-muted/30 rounded-xl flex items-center justify-center text-muted-foreground text-sm">
              <BarChart3 className="size-5 mr-2" /> Gráfico de ventas por día
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold">Acceso rápido</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href="/dashboard/employees" className="flex items-center gap-3 rounded-xl p-3 hover:bg-muted/50 transition-colors group">
              <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary"><Briefcase className="size-4" /></div>
              <div className="flex-1"><p className="text-sm font-bold text-foreground">Empleados</p><p className="text-xs text-muted-foreground">{employeeCount} registrados</p></div>
              <ArrowRight className="size-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
            <Link href="/dashboard/finanzas" className="flex items-center gap-3 rounded-xl p-3 hover:bg-muted/50 transition-colors group">
              <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-500"><DollarSign className="size-4" /></div>
              <div className="flex-1"><p className="text-sm font-bold text-foreground">Finanzas</p><p className="text-xs text-muted-foreground">Comisiones, pagos, reportes</p></div>
              <ArrowRight className="size-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
            <Link href="/dashboard/analytics" className="flex items-center gap-3 rounded-xl p-3 hover:bg-muted/50 transition-colors group">
              <div className="flex size-9 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-950/30 text-amber-500"><BarChart3 className="size-4" /></div>
              <div className="flex-1"><p className="text-sm font-bold text-foreground">Analíticas</p><p className="text-xs text-muted-foreground">Reportes y estadísticas</p></div>
              <ArrowRight className="size-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-2xl border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold">Actividad reciente</CardTitle>
        </CardHeader>
        <CardContent>
          {recentActivity.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No hay actividad reciente</p>
          ) : (
            <div className="space-y-0 divide-y divide-border/50">
              {recentActivity.map((a) => (
                <div key={a.id} className="flex items-center gap-3 py-3">
                  <div className={`flex size-8 items-center justify-center rounded-full ${
                    a.type === "sale" ? "bg-emerald-50 text-emerald-500" :
                    a.type === "appointment" ? "bg-purple-50 text-purple-500" :
                    a.type === "client" ? "bg-blue-50 text-blue-500" :
                    a.type === "cancel" ? "bg-red-50 text-red-500" :
                    a.type === "payment" ? "bg-green-50 text-green-500" :
                    "bg-slate-50 text-slate-500"
                  }`}>
                    {a.type === "sale" ? <ShoppingCart className="size-3.5" /> :
                     a.type === "appointment" ? <Calendar className="size-3.5" /> :
                     a.type === "client" ? <Users className="size-3.5" /> :
                     a.type === "cancel" ? <XCircle className="size-3.5" /> :
                     a.type === "payment" ? <CheckCircle className="size-3.5" /> :
                     <Clock className="size-3.5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground truncate">{a.desc}</p>
                    <p className="text-xs text-muted-foreground">{a.time}</p>
                  </div>
                  {a.status && <Badge variant="outline" className="text-[10px]">{a.status}</Badge>}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
