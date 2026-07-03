"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DollarSign, TrendingUp, TrendingDown, Wallet, Users, Percent, Calendar } from "lucide-react"
import { toast } from "sonner"

interface FinData {
  totalRevenue: number
  productRevenue: number
  serviceRevenue: number
  commissionTotal: number
  pendingPayouts: number
  employeeCount: number
  completedAppointments: number
  totalOrders: number
}

export default function FinanzasPage() {
  const [data, setData] = useState<FinData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch("/api/analytics").then((r) => r.json()).catch(() => ({})),
      fetch("/api/employees").then((r) => r.json()).catch(() => []),
    ]).then(([analytics, employees]) => {
      setData({
        totalRevenue: analytics.totalRevenue || 0,
        productRevenue: analytics.productRevenue || analytics.totalRevenue || 0,
        serviceRevenue: analytics.serviceRevenue || 0,
        commissionTotal: 0,
        pendingPayouts: 0,
        employeeCount: employees.length || 0,
        completedAppointments: analytics.completedAppointments || 0,
        totalOrders: analytics.totalOrders || 0,
      })
    }).catch(() => toast.error("Error al cargar datos")).finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="space-y-6 p-6">
      <div className="h-8 w-48 bg-muted rounded-lg animate-pulse" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => <Card key={i} className="rounded-2xl animate-pulse"><CardContent className="p-6"><div className="h-16 bg-muted rounded-xl" /></CardContent></Card>)}
      </div>
    </div>
  )

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-accent">Finanzas</h1>
        <p className="text-sm text-muted-foreground">Panel financiero de tu negocio</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="rounded-2xl border-border/50">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Ingresos por productos</span>
              <div className="flex size-8 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-500"><TrendingUp className="size-4" /></div>
            </div>
            <div className="text-2xl font-black text-foreground">${(data?.productRevenue || 0).toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">{data?.totalOrders || 0} pedidos</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/50">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Ingresos por servicios</span>
              <div className="flex size-8 items-center justify-center rounded-xl bg-purple-50 dark:bg-purple-950/30 text-purple-500"><Calendar className="size-4" /></div>
            </div>
            <div className="text-2xl font-black text-foreground">${(data?.serviceRevenue || 0).toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">{data?.completedAppointments || 0} citas completadas</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/50">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Total facturado</span>
              <div className="flex size-8 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/30 text-blue-500"><Wallet className="size-4" /></div>
            </div>
            <div className="text-2xl font-black text-foreground">${(data?.totalRevenue || 0).toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">Histórico completo</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/50">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Empleados</span>
              <div className="flex size-8 items-center justify-center rounded-xl bg-rose-50 dark:bg-rose-950/30 text-rose-500"><Users className="size-4" /></div>
            </div>
            <div className="text-2xl font-black text-foreground">{data?.employeeCount || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">en el equipo</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="revenue" className="w-full">
        <TabsList className="rounded-xl">
          <TabsTrigger value="revenue" className="rounded-lg">Ingresos</TabsTrigger>
          <TabsTrigger value="commissions" className="rounded-lg">Comisiones</TabsTrigger>
          <TabsTrigger value="payments" className="rounded-lg">Pagos</TabsTrigger>
        </TabsList>

        <TabsContent value="revenue" className="mt-4">
          <Card className="rounded-2xl border-border/50">
            <CardHeader><CardTitle className="text-sm font-bold">Desglose de ingresos</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/20">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600"><TrendingUp className="size-5" /></div>
                    <div><p className="font-bold text-foreground">Ventas de productos</p><p className="text-xs text-muted-foreground">Pedidos online y presenciales</p></div>
                  </div>
                  <span className="text-lg font-black text-emerald-600">${(data?.productRevenue || 0).toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between p-4 rounded-xl bg-purple-50 dark:bg-purple-950/20">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-xl bg-purple-100 dark:bg-purple-900/50 text-purple-600"><Calendar className="size-5" /></div>
                    <div><p className="font-bold text-foreground">Ventas de servicios</p><p className="text-xs text-muted-foreground">Citas y reservas completadas</p></div>
                  </div>
                  <span className="text-lg font-black text-purple-600">${(data?.serviceRevenue || 0).toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between p-4 rounded-xl bg-blue-50 dark:bg-blue-950/20">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/50 text-blue-600"><Wallet className="size-5" /></div>
                    <div><p className="font-bold text-foreground">Total facturado</p><p className="text-xs text-muted-foreground">Suma de todos los ingresos</p></div>
                  </div>
                  <span className="text-lg font-black text-blue-600">${(data?.totalRevenue || 0).toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="commissions" className="mt-4">
          <Card className="rounded-2xl border-border/50">
            <CardHeader><CardTitle className="text-sm font-bold">Comisiones de empleados</CardTitle></CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Percent className="size-12 mb-3 opacity-40" />
                <p className="font-medium">Módulo de comisiones próximamente</p>
                <p className="text-sm">Aquí podrás gestionar las comisiones generadas por servicio y producto.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="mt-4">
          <Card className="rounded-2xl border-border/50">
            <CardHeader><CardTitle className="text-sm font-bold">Pagos a empleados</CardTitle></CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <DollarSign className="size-12 mb-3 opacity-40" />
                <p className="font-medium">Módulo de pagos próximamente</p>
                <p className="text-sm">Aquí podrás registrar y gestionar pagos de salarios, comisiones y alquileres.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
