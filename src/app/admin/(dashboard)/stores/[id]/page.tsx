"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { ArrowLeft, Store, Users, Package, ShoppingCart, DollarSign, Calendar, ExternalLink, TrendingUp, CreditCard } from "lucide-react"
import { cn } from "@/lib/utils"

interface StoreDetail {
  id: string; name: string; slug: string; description: string | null; email: string | null; phone: string | null
  address: string | null; isActive: boolean; plan: string; currency: string; createdAt: string
  _count: { products: number; orders: number; members: number }
  recentOrders: Array<{ id: string; total: number; status: string; createdAt: string; customer: string | null }>
  topProducts: Array<{ id: string; name: string; totalSold: number; totalRevenue: number }>
  revenueByMonth: Array<{ month: string; total: number; count: number }>
  subscriptions: Array<{ id: string; plan: string; status: string; amount: number; createdAt: string; endDate: string | null }>
}

const planLabels: Record<string, string> = { basico: "Emprendedor", negocio: "Negocio", empresarial: "Empresarial" }
const planColors: Record<string, string> = { basico: "bg-slate-100 text-slate-700", negocio: "bg-blue-100 text-blue-700", empresarial: "bg-amber-100 text-amber-700" }

export default function AdminStoreDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params?.id as string

  const [store, setStore] = useState<StoreDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/admin/stores/${id}`)
      if (!res.ok) { router.push("/admin/stores"); return }
      setStore(await res.json())
      setLoading(false)
    }
    load()
  }, [id, router])

  if (loading) return <div className="flex items-center justify-center min-h-[60vh] text-muted-foreground">Cargando...</div>
  if (!store) return null

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/stores">
          <Button variant="ghost" size="icon"><ArrowLeft className="size-4" /></Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{store.name}</h1>
          <p className="text-sm text-muted-foreground">/{store.slug}</p>
        </div>
        <Badge className={cn(store.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700")}>
          {store.isActive ? "Activa" : "Inactiva"}
        </Badge>
        <a href={`/store/${store.slug}`} target="_blank" rel="noopener noreferrer">
          <Button variant="outline" size="sm" className="gap-2">
            <ExternalLink className="size-4" /> Ver tienda
          </Button>
        </a>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Productos</p>
                <p className="text-2xl font-bold">{store._count.products}</p>
              </div>
              <Package className="size-8 text-primary/40" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Órdenes</p>
                <p className="text-2xl font-bold">{store._count.orders}</p>
              </div>
              <ShoppingCart className="size-8 text-primary/40" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Miembros</p>
                <p className="text-2xl font-bold">{store._count.members}</p>
              </div>
              <Users className="size-8 text-primary/40" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Plan</p>
                <Badge className={cn("mt-1 font-medium", planColors[store.plan as keyof typeof planColors] || "bg-slate-100")}>
                  {planLabels[store.plan as keyof typeof planLabels] || store.plan}
                </Badge>
              </div>
              <CreditCard className="size-8 text-primary/40" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="size-4" /> Ingresos por mes</CardTitle></CardHeader>
          <CardContent>
            {store.revenueByMonth.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Sin datos</p>
            ) : (
              <div className="space-y-2">
                {store.revenueByMonth.map((r) => (
                  <div key={r.month} className="flex items-center justify-between text-sm">
                    <span>{format(new Date(r.month + "-01"), "MMM yyyy", { locale: es })}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-muted-foreground">{r.count} órdenes</span>
                      <span className="font-mono font-bold">${r.total.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Package className="size-4" /> Top productos</CardTitle></CardHeader>
          <CardContent>
            {store.topProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Sin datos</p>
            ) : (
              <div className="space-y-2">
                {store.topProducts.map((p, i) => (
                  <div key={p.id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground w-4">{i + 1}.</span>
                      <span>{p.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-muted-foreground">{p.totalSold} vend.</span>
                      <span className="font-mono">${p.totalRevenue.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><ShoppingCart className="size-4" /> Órdenes recientes</CardTitle></CardHeader>
        <CardContent>
          {store.recentOrders.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Sin órdenes</p>
          ) : (
            <div className="space-y-2">
              {store.recentOrders.map((o) => (
                <div key={o.id} className="flex items-center justify-between text-sm p-2 rounded-lg hover:bg-muted/50">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground">#{o.id.slice(0, 8)}</span>
                    <span>{o.customer || "Anónimo"}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground">{format(new Date(o.createdAt), "dd/MM", { locale: es })}</span>
                    <Badge className={o.status === "paid" ? "bg-green-100 text-green-700" : o.status === "pending" ? "bg-yellow-100 text-yellow-700" : "bg-slate-100"}>
                      {o.status}
                    </Badge>
                    <span className="font-mono font-medium">${o.total.toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><CreditCard className="size-4" /> Historial de suscripciones</CardTitle></CardHeader>
        <CardContent>
          {store.subscriptions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Sin suscripciones</p>
          ) : (
            <div className="space-y-2">
              {store.subscriptions.map((s) => (
                <Link key={s.id} href={`/admin/subscriptions/${s.id}`} className="flex items-center justify-between text-sm p-2 rounded-lg hover:bg-muted/50">
                  <div className="flex items-center gap-3">
                    <Badge className={cn("font-medium", planColors[s.plan as keyof typeof planColors] || "bg-slate-100")}>
                      {planLabels[s.plan as keyof typeof planLabels] || s.plan}
                    </Badge>
                    <span className="font-mono">${s.amount.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">{format(new Date(s.createdAt), "dd/MM/yyyy", { locale: es })}</span>
                    <Badge className={cn(
                      s.status === "active" || s.status === "verified" ? "bg-green-100 text-green-700" :
                      s.status === "pending" ? "bg-yellow-100 text-yellow-700" : "bg-slate-100 text-slate-500"
                    )}>{s.status}</Badge>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
