"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, Store, ShoppingCart, CreditCard, DollarSign, Clock, CheckCircle2, TrendingUp, TrendingDown, ArrowRight, AlertTriangle } from "lucide-react"
import { format, differenceInDays } from "date-fns"
import { es } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { planDisplayLabel } from "@/lib/plans"

interface Stats {
  totalUsers: number; usersThisMonth: number
  totalStores: number; totalOrders: number
  pendingSubscriptions: number; activeSubscriptions: number
  verifiedSubscriptions: number; rejectedSubscriptions: number
  cancelledSubscriptions: number; expiredSubscriptions: number
  totalRevenue: number; mrr: number
  planDistribution: Array<{ plan: string; _count: number; _sum: { amount: number | null } }>
  recentSubscriptions: Array<{
    id: string; plan: string; status: string; amount: number; createdAt: string
    store: { name: string; slug: string }
  }>
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [analytics, setAnalytics] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/stats").then(r => r.json()),
      fetch("/api/admin/analytics").then(r => r.json()),
    ]).then(([s, a]) => { setStats(s); setAnalytics(a); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex items-center justify-center min-h-[60vh] text-muted-foreground">Cargando...</div>
  if (!stats) return <div className="flex items-center justify-center min-h-[60vh] text-muted-foreground">Error al cargar</div>

  const alerts: string[] = []
  if (stats.pendingSubscriptions > 5) alerts.push(`${stats.pendingSubscriptions} pagos pendientes de verificación`)
  if (analytics?.expiringSoon?.length > 0) alerts.push(`${analytics.expiringSoon.length} suscripciones próximas a vencer`)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Panel de Administración</h1>
          <p className="text-sm text-muted-foreground">Resumen general de Panitas</p>
        </div>
        {alerts.length > 0 && (
          <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
            <AlertTriangle className="size-4" />
            <span>{alerts[0]}</span>
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/admin/users">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Usuarios</p>
                  <p className="text-2xl font-bold">{stats.totalUsers}</p>
                  <p className="text-xs text-muted-foreground">+{stats.usersThisMonth} este mes</p>
                </div>
                <div className="flex size-10 items-center justify-center rounded-full bg-blue-500 text-white">
                  <Users className="size-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/subscriptions">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Suscripciones activas</p>
                  <p className="text-2xl font-bold">{stats.activeSubscriptions}</p>
                  <div className="flex gap-1.5 mt-1">
                    <Badge className="bg-yellow-100 text-yellow-700 text-[10px]">{stats.pendingSubscriptions} pend.</Badge>
                    <Badge className="bg-green-100 text-green-700 text-[10px]">{stats.verifiedSubscriptions} verificadas</Badge>
                  </div>
                </div>
                <div className="flex size-10 items-center justify-center rounded-full bg-emerald-500 text-white">
                  <CreditCard className="size-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">MRR</p>
                <p className="text-2xl font-bold">${stats.mrr.toFixed(2)}</p>
                {analytics && (
                  <p className={cn("text-xs", parseFloat(analytics.mrrGrowth) >= 0 ? "text-green-600" : "text-red-600")}>
                    {parseFloat(analytics.mrrGrowth) >= 0 ? "+" : ""}{analytics.mrrGrowth}%
                  </p>
                )}
              </div>
              <DollarSign className="size-8 text-primary/40" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Facturado total</p>
                <p className="text-2xl font-bold">${stats.totalRevenue.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">{stats.totalOrders} órdenes</p>
              </div>
              <div className="flex size-10 items-center justify-center rounded-full bg-primary text-white">
                <TrendingUp className="size-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Distribución por plan</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.planDistribution.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Sin datos</p>
            ) : (
              <div className="space-y-2">
                {stats.planDistribution.map((p) => {
                  const label = planDisplayLabel(p.plan)
                  return (
                    <div key={p.plan} className="flex items-center justify-between">
                      <span className="text-sm capitalize">{label}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold">{p._count}</span>
                        <span className="text-xs text-muted-foreground">${(p._sum?.amount || 0).toFixed(2)}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Últimas suscripciones</CardTitle>
            <Link href="/admin/subscriptions">
              <Button variant="ghost" size="sm" className="gap-1 text-xs">
                Ver todas <ArrowRight className="size-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {stats.recentSubscriptions.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Sin movimientos</p>
            ) : (
              <div className="space-y-2">
                {stats.recentSubscriptions.map((sub) => (
                  <Link key={sub.id} href={`/admin/subscriptions/${sub.id}`} className="flex items-center justify-between p-2.5 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "flex size-8 items-center justify-center rounded-full",
                        sub.status === "active" || sub.status === "verified" ? "bg-green-100 text-green-700" :
                        sub.status === "pending" ? "bg-yellow-100 text-yellow-700" : "bg-slate-100 text-slate-500"
                      )}>
                        {sub.status === "active" || sub.status === "verified" ? <CheckCircle2 className="size-4" /> :
                         sub.status === "pending" ? <Clock className="size-4" /> : <CreditCard className="size-4" />}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{sub.store.name}</p>
                        <p className="text-xs text-muted-foreground">{sub.plan} · ${sub.amount.toFixed(2)}</p>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">{format(new Date(sub.createdAt), "dd/MM", { locale: es })}</span>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Suscripciones próximas a vencer</CardTitle>
            <Link href="/admin/analytics"><Button variant="ghost" size="sm" className="gap-1 text-xs">Ver más <ArrowRight className="size-3" /></Button></Link>
          </CardHeader>
          <CardContent>
            {!analytics?.expiringSoon || analytics.expiringSoon.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Ninguna próxima a vencer</p>
            ) : (
              <div className="space-y-2">
                {analytics.expiringSoon.slice(0, 5).map((s: any) => (
                  <div key={s.id} className="flex items-center justify-between p-2 rounded-lg bg-red-50 border border-red-100">
                    <div>
                      <p className="text-sm font-medium">{s.store.name}</p>
                      <p className="text-xs text-muted-foreground">
  {s.endDate ? (() => {
    const daysLeft = differenceInDays(new Date(s.endDate), new Date())
    return daysLeft < 0
      ? `Vencido hace ${Math.abs(daysLeft)}d`
      : `Faltan ${daysLeft}d · ${format(new Date(s.endDate), "dd/MM/yyyy")}`
  })() : "—"}
</p>
                    </div>
                    <Badge className="bg-red-100 text-red-700 text-xs">{s.plan}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Estado del sistema</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Panel Admin</span>
              <Badge className="bg-green-100 text-green-700">Activo</Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Base de datos</span>
              <Badge className="bg-green-100 text-green-700">Conectada</Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">BD: PostgreSQL</span>
              <span className="text-xs text-muted-foreground">panitas_db</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Tiendas</span>
              <span className="font-bold">{stats.totalStores}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
