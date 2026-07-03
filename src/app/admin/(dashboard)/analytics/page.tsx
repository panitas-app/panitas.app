"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Users, Store, DollarSign, CreditCard, TrendingUp, TrendingDown, Activity } from "lucide-react"
import { cn } from "@/lib/utils"
import { format, differenceInDays } from "date-fns"

interface AnalyticsData {
  totalUsers: number; usersThisMonth: number
  totalStores: number; totalOrders: number
  pendingSubs: number; activeSubs: number; verifiedSubs: number; rejectedSubs: number
  mrr: number; prevMrr: number; mrrGrowth: string
  churnRate: number; churned: number
  revenueByPlan: Array<{ plan: string; revenue: number }>
  bcvHistory: Array<{ rate: number; createdAt: string }>
  topStores: Array<{ id: string; name: string; slug: string; planType: string; totalRevenue: number; _count: { orders: number }; user: { name: string | null; email: string | null } }>
  recentActivity: Array<{ id: string; action: string; entity: string; createdAt: string }>
  expiringSoon: Array<{ id: string; plan: string; status: string; endDate: string; store: { name: string } }>
}

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/admin/analytics").then(r => r.json()).then(d => { setData(d); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex items-center justify-center min-h-[60vh] text-muted-foreground">Cargando...</div>
  if (!data) return <div className="flex items-center justify-center min-h-[60vh] text-muted-foreground">Error al cargar</div>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="text-sm text-muted-foreground">Métricas globales de Panitas</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Usuarios totales</p>
                <p className="text-2xl font-bold mt-1">{data.totalUsers}</p>
                <p className="text-xs text-muted-foreground mt-1">+{data.usersThisMonth} este mes</p>
              </div>
              <Users className="size-8 text-primary/40" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">MRR</p>
                <p className="text-2xl font-bold mt-1">${data.mrr.toFixed(2)}</p>
                <p className={cn("text-xs mt-1", parseFloat(data.mrrGrowth) >= 0 ? "text-green-600" : "text-red-600")}>
                  {parseFloat(data.mrrGrowth) >= 0 ? "+" : ""}{data.mrrGrowth}% vs mes anterior
                </p>
              </div>
              <DollarSign className="size-8 text-primary/40" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Suscripciones activas</p>
                <p className="text-2xl font-bold mt-1">{data.activeSubs + data.verifiedSubs}</p>
                <div className="flex gap-2 mt-1">
                  <Badge className="bg-yellow-100 text-yellow-700 text-[10px]">{data.pendingSubs} pend.</Badge>
                </div>
              </div>
              <CreditCard className="size-8 text-primary/40" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Churn rate</p>
                <p className="text-2xl font-bold mt-1">{data.churnRate}%</p>
                <p className="text-xs text-muted-foreground mt-1">{data.churned} cancelados</p>
              </div>
              {data.churnRate > 5 ? <TrendingDown className="size-8 text-red-400" /> : <TrendingUp className="size-8 text-green-400" />}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="dashboard">
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="topstores">Top Tiendas</TabsTrigger>
          <TabsTrigger value="expiring">Próximos a vencer</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-4 pt-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="text-sm">Ingresos por plan (este mes)</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {data.revenueByPlan.filter(p => p.revenue > 0).map((p) => (
                    <div key={p.plan} className="flex items-center justify-between">
                      <span className="text-sm capitalize">{p.plan}</span>
                      <span className="text-sm font-mono font-bold">${p.revenue.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-sm">Actividad reciente</CardTitle></CardHeader>
              <CardContent className="max-h-60 overflow-y-auto space-y-1">
                {data.recentActivity.slice(0, 15).map((a) => (
                  <div key={a.id} className="flex items-center justify-between py-1 text-xs border-b border-border/30">
                    <span className="font-mono">{a.action}</span>
                    <span className="text-muted-foreground">{format(new Date(a.createdAt), "dd/MM HH:mm")}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="topstores" className="pt-4">
          <Card>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {data.topStores.map((s, i) => (
                  <div key={s.id} className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-muted-foreground w-6">#{i + 1}</span>
                      <div>
                        <p className="text-sm font-medium">{s.name}</p>
                        <p className="text-xs text-muted-foreground">{s.user.name || s.user.email} · {s._count.orders} órdenes</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold">${s.totalRevenue.toFixed(2)}</p>
                      <Badge className={cn("text-[10px]", s.planType === "negocio" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-700")}>
                        {s.planType}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="expiring" className="pt-4">
          <Card>
            <CardContent className="p-4">
              {data.expiringSoon.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Ninguna suscripción próxima a vencer</p>
              ) : (
                <div className="space-y-2">
                  {data.expiringSoon.map((s) => (
                    <div key={s.id} className="flex items-center justify-between p-2 rounded-lg bg-red-50 border border-red-200">
                      <div>
                        <p className="text-sm font-medium">{s.store.name}</p>
                        <p className="text-xs text-muted-foreground">{s.plan} · {s.endDate ? (() => {
  const daysLeft = differenceInDays(new Date(s.endDate), new Date())
  return daysLeft < 0
    ? `Vencido hace ${Math.abs(daysLeft)}d`
    : `Faltan ${daysLeft}d · ${format(new Date(s.endDate), "dd/MM/yyyy")}`
})() : "—"}</p>
                      </div>
                      <Badge className="bg-red-100 text-red-700">{s.status}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
