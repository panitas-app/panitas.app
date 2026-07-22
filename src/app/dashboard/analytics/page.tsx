"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { BarChart3, TrendingUp, TrendingDown, Minus, Package, Receipt, Download, CalendarCheck, Banknote, ChevronRight, Phone, Search, Store, ShoppingCart, Target } from "lucide-react"
import { downloadCsv } from "@/lib/export-csv"
import GastosPage from "@/components/dashboard/gastos-page"
import PuntoEquilibrioTab from "@/components/dashboard/punto-equilibrio-tab"
import { formatBCV } from "@/lib/bcv/format"

const ALL_TABS = [
  { key: "balance", label: "Balance", icon: BarChart3 },
  { key: "inventario", label: "Valor Inventario", icon: Package },
  { key: "gastos", label: "Gastos", icon: Receipt },
  { key: "punto-equilibrio", label: "Punto de Equilibrio", icon: Target },
  { key: "cierres", label: "Cierres", icon: CalendarCheck },
]

interface BalanceData {
  todayRevenue: number
  weekRevenue: number
  monthRevenue: number
  totalRevenue: number
  todayExpenses: number
  weekExpenses: number
  monthExpenses: number
  totalExpenses: number
  rate: number
  topProducts: { name: string; qty: number; revenue: number }[]
  statusCounts: Record<string, number>
  recentActivity: { id: string; orderNumber: string; customerName: string; status: string; total: number; createdAt: string }[]
  totalOrders: number
}

interface InventarioData {
  totalCostValue: number
  totalSellValue: number
  totalProfit: number
  totalExpenses: number
  profitMargin: number
  productCount: number
  products: {
    id: string
    name: string
    stock: number
    costPrice: number
    price: number
    marginPerUnit: number
    marginPercent: number
  }[]
}

type Period = "today" | "week" | "month" | "total"

const PERIOD_LABELS: Record<Period, string> = {
  today: "Hoy",
  week: "Esta semana",
  month: "Este mes",
  total: "Total",
}

const PLAN_TYPES_SIN_INVENTARIO = ["agenda", "reservas"]

export default function AnalyticsPage() {
  const [tab, setTab] = useState("balance")
  const [balance, setBalance] = useState<BalanceData | null>(null)
  const [inventario, setInventario] = useState<InventarioData | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<Period>("month")
  const [hideInventario, setHideInventario] = useState(false)

  const tabs = hideInventario
    ? ALL_TABS.filter((t) => t.key !== "inventario")
    : ALL_TABS

  useEffect(() => {
    Promise.all([
      fetch("/api/analytics").then((r) => r.ok ? r.json() : null),
      fetch("/api/analytics/finanzas").then((r) => r.ok ? r.json() : null),
      fetch("/api/stores").then((r) => r.ok ? r.json() : null),
    ]).then(([a, f, store]) => {
      setBalance(a)
      setInventario(f)
      if (store && PLAN_TYPES_SIN_INVENTARIO.includes(store.planType)) {
        setHideInventario(true)
      }
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <div className="flex min-h-[40vh] items-center justify-center"><div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 border-b pb-1">
        {tabs.map((t) => {
          const Icon = t.icon
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-3 py-3 text-sm font-medium border-b-2 transition-colors ${
                tab === t.key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="size-4" />
              {t.label}
            </button>
          )
        })}
      </div>

      {tab === "balance" && balance && <BalanceTab data={balance} period={period} setPeriod={setPeriod} />}
      {tab === "inventario" && inventario && <InventarioTab data={inventario} />}
      {tab === "gastos" && <GastosPage />}
      {tab === "punto-equilibrio" && <PuntoEquilibrioTab />}
      {tab === "cierres" && <CierresTab />}
    </div>
  )
}

function getPeriodData(data: BalanceData, period: Period) {
  const labels = { revenue: "Ventas", expenses: "Gastos" }

  const revenue =
    period === "today" ? data.todayRevenue :
    period === "week" ? data.weekRevenue :
    period === "month" ? data.monthRevenue :
    data.totalRevenue

  const expenseTotal =
    period === "today" ? data.todayExpenses :
    period === "week" ? data.weekExpenses :
    period === "month" ? data.monthExpenses :
    data.totalExpenses

  const balance = revenue - expenseTotal

  return { revenue, expenseTotal, balance, revenueLabel: labels.revenue, expenseLabel: labels.expenses }
}

function BalanceTab({ data, period, setPeriod }: { data: BalanceData; period: Period; setPeriod: (p: Period) => void }) {
  const statusLabels: Record<string, string> = {
    pending: "Pendiente", confirmed: "Confirmado", preparing: "Preparando",
    shipped: "Enviado", delivered: "Entregado", cancelled: "Cancelado",
  }
  const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline" | "ghost" | "link"> = {
    pending: "secondary", confirmed: "default", preparing: "outline",
    shipped: "ghost", delivered: "ghost", cancelled: "destructive",
  }

  const { revenue, expenseTotal, balance } = getPeriodData(data, period)

  return (
    <div className="space-y-6">
      {/* Period selector + export */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-1.5 text-xs font-medium rounded-full transition-colors ${
                period === p
                  ? "bg-primary text-white"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const revenue = period === "today" ? data.todayRevenue : period === "week" ? data.weekRevenue : period === "month" ? data.monthRevenue : data.totalRevenue
            const expenseTotal = period === "today" ? data.todayExpenses : period === "week" ? data.weekExpenses : period === "month" ? data.monthExpenses : data.totalExpenses
            downloadCsv("ventas", [
              "Indicador", "Valor (USD)", "Valor (Bs.)",
            ], [
              ["Ventas", revenue.toFixed(2), (revenue * data.rate).toFixed(2)],
              ["Gastos", expenseTotal.toFixed(2), (expenseTotal * data.rate).toFixed(2)],
              ["Balance", (revenue - expenseTotal).toFixed(2), ((revenue - expenseTotal) * data.rate).toFixed(2)],
            ])
          }}
        >
          <Download className="size-4 mr-1" /> Exportar CSV
        </Button>
      </div>

      {/* Balance hero card */}
      <Card className={`overflow-hidden border-2 ${
        balance > 0 ? "border-green-300" : balance < 0 ? "border-red-300" : "border-muted"
      }`}>
        <div className={`h-1.5 w-full ${
          balance > 0 ? "bg-green-500" : balance < 0 ? "bg-red-500" : "bg-muted"
        }`} />
        <CardContent className="p-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            {balance > 0 ? (
              <TrendingUp className="size-5 text-green-600" />
            ) : balance < 0 ? (
              <TrendingDown className="size-5 text-red-600" />
            ) : (
              <Minus className="size-5 text-muted-foreground" />
            )}
            <p className={`text-xs font-semibold uppercase tracking-wider ${
              balance > 0 ? "text-green-600" : balance < 0 ? "text-red-600" : "text-muted-foreground"
            }`}>
              {balance > 0 ? "Ganancia" : balance < 0 ? "Pérdida" : "Punto de equilibrio"}
            </p>
          </div>
          <p className="font-heading text-4xl font-extrabold">
            <span className={balance >= 0 ? "text-green-600" : "text-red-600"}>
              {balance >= 0 ? "+" : ""}${balance.toFixed(2)}
            </span>
          </p>
          <p className="text-xs text-muted-foreground mt-1">Balance general ({PERIOD_LABELS[period].toLowerCase()})</p>
          <p className="text-xs text-muted-foreground">Tasa BCV: Bs. {formatBCV(data.rate)}</p>
        </CardContent>
      </Card>

      {/* Revenue vs Expenses grid */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ventas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-heading text-2xl font-bold text-green-600">+${revenue.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">Bs. {(revenue * data.rate).toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Gastos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-heading text-2xl font-bold text-red-600">-${expenseTotal.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">Bs. {(expenseTotal * data.rate).toFixed(2)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue breakdown */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Desglose de ventas</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {(["today", "week", "month", "total"] as Period[]).map((p) => {
              const r = p === "today" ? data.todayRevenue : p === "week" ? data.weekRevenue : p === "month" ? data.monthRevenue : data.totalRevenue
              const e = p === "today" ? data.todayExpenses : p === "week" ? data.weekExpenses : p === "month" ? data.monthExpenses : data.totalExpenses
              const b = r - e
              const maxVal = Math.max(data.totalRevenue, data.totalExpenses, 1)
              return (
                <div key={p} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{PERIOD_LABELS[p]}</span>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-green-600">+${r.toFixed(2)}</span>
                      <span className="text-red-600">-${e.toFixed(2)}</span>
                      <span className={`font-semibold ${b >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {b >= 0 ? "+" : ""}${b.toFixed(2)}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-0.5 h-2">
                    <div
                      className="rounded-l-full bg-green-500 transition-all"
                      style={{ width: `${(r / maxVal) * 50}%` }}
                    />
                    <div
                      className="rounded-r-full bg-red-500 transition-all"
                      style={{ width: `${(e / maxVal) * 50}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Top products + status */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card><CardHeader><CardTitle>Productos más vendidos</CardTitle></CardHeader>
          <CardContent>{data.topProducts.length === 0 ? <p className="text-sm text-muted-foreground">Sin datos</p> : (
            <div className="space-y-3">{data.topProducts.map((p, i) => (
              <div key={p.name} className="flex items-center justify-between text-sm"><span className="flex items-center gap-2"><span className="text-xs text-muted-foreground">{i + 1}.</span><span className="truncate max-w-[200px]">{p.name}</span></span><span className="text-muted-foreground">{p.qty} uds - ${p.revenue.toFixed(2)}</span></div>
            ))}</div>
          )}</CardContent></Card>
        <Card><CardHeader><CardTitle>Pedidos por estado</CardTitle></CardHeader>
          <CardContent>{Object.keys(data.statusCounts).length === 0 ? <p className="text-sm text-muted-foreground">Sin datos</p> : (
            <div className="space-y-3">{Object.entries(data.statusCounts).map(([status, count]) => {
              const pct = data.totalOrders > 0 ? Math.round((count / data.totalOrders) * 100) : 0
              return (<div key={status} className="space-y-1"><div className="flex items-center justify-between text-sm"><Badge variant={statusColors[status] || "secondary"}>{statusLabels[status] || status}</Badge><span className="text-muted-foreground">{count} ({pct}%)</span></div><div className="h-2 w-full rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} /></div></div>)
            })}</div>
          )}</CardContent></Card>
      </div>

      {/* Recent activity */}
      <Card><CardHeader><CardTitle>Actividad reciente</CardTitle></CardHeader>
        <CardContent>{data.recentActivity.length === 0 ? <p className="text-sm text-muted-foreground">Sin actividad</p> : (
          <div className="space-y-3">{data.recentActivity.map((o) => (
            <div key={o.id} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2"><Badge variant={statusColors[o.status] || "secondary"} className="h-5">{statusLabels[o.status] || o.status}</Badge><span className="font-medium">{o.orderNumber}</span><span className="text-muted-foreground">{o.customerName}</span></div>
              <span className="text-xs text-muted-foreground">{o.createdAt} - ${o.total.toFixed(2)}</span>
            </div>
          ))}</div>
        )}</CardContent></Card>
    </div>
  )
}

function InventarioTab({ data }: { data: InventarioData }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div />
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            downloadCsv("inventario", [
              "Producto", "Stock", "Costo", "Precio", "Margen $", "Margen %",
            ], data.products.map(p => [
              p.name, String(p.stock), p.costPrice.toFixed(2), p.price.toFixed(2),
              p.marginPerUnit.toFixed(2), p.marginPercent.toFixed(1) + "%",
            ]))
          }}
        >
          <Download className="size-4 mr-1" /> Exportar CSV
        </Button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Valor Inv. (Costo)</CardTitle></CardHeader>
          <CardContent><p className="font-heading text-2xl font-bold">${data.totalCostValue.toFixed(2)}</p><p className="text-xs text-muted-foreground">{data.productCount} productos</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Valor Inv. (Venta)</CardTitle></CardHeader>
          <CardContent><p className="font-heading text-2xl font-bold">${data.totalSellValue.toFixed(2)}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Ganancia Potencial</CardTitle></CardHeader>
          <CardContent><p className="font-heading text-2xl font-bold text-green-600">${data.totalProfit.toFixed(2)}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Gastos Totales</CardTitle></CardHeader>
          <CardContent><p className="font-heading text-2xl font-bold text-red-600">${data.totalExpenses.toFixed(2)}</p></CardContent></Card>
      </div>
      <Card><CardHeader><CardTitle>Margen por Producto</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b text-left text-muted-foreground">
                <th className="px-4 py-3 font-medium">Producto</th><th className="px-4 py-3 font-medium">Stock</th><th className="px-4 py-3 font-medium">Costo</th><th className="px-4 py-3 font-medium">Precio</th><th className="px-4 py-3 font-medium">Margen $</th><th className="px-4 py-3 font-medium">Margen %</th>
              </tr></thead>
              <tbody>{data.products.map((p) => (
                <tr key={p.id} className="border-b last:border-0">
                  <td className="px-4 py-3 font-medium">{p.name}</td><td className="px-4 py-3">{p.stock}</td><td className="px-4 py-3">${p.costPrice.toFixed(2)}</td><td className="px-4 py-3">${p.price.toFixed(2)}</td><td className="px-4 py-3 font-medium">${p.marginPerUnit.toFixed(2)}</td>
                  <td className="px-4 py-3"><span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${p.marginPercent >= 50 ? "bg-green-100 text-green-700" : p.marginPercent >= 30 ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"}`}>{p.marginPercent.toFixed(1)}%</span></td>
                </tr>
              ))}{data.products.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No hay productos</td></tr>}</tbody>
            </table>
          </div>
        </CardContent></Card>
    </div>
  )
}

function formatDate(d: string | Date) {
  return new Date(d).toLocaleDateString("es-VE", { day: "2-digit", month: "2-digit", year: "numeric" })
}

function formatTime(d: string | Date) {
  return new Date(d).toLocaleTimeString("es-VE", { hour: "2-digit", minute: "2-digit" })
}

function CierresTab() {
  const [orders, setOrders] = useState<any[]>([])
  const [summary, setSummary] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0])
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/reports/daily?date=${selectedDate}`)
      .then(r => r.json())
      .then(data => {
        setOrders(data.orders || [])
        setSummary(data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [selectedDate])

  const totalPaid = orders.reduce((s, o) => s + o.total, 0)
  const totalCredit = orders.filter(o => o.creditTerm).reduce((s, o) => s + o.total, 0)

  if (loading) return <div className="flex min-h-[40vh] items-center justify-center"><div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>

  return (
    <div className="space-y-4">
      {/* Date selector */}
      <div className="flex items-center gap-3">
        <Input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="w-fit h-9 text-sm"
        />
        <span className="text-xs text-muted-foreground">
          {orders.length} ventas · Total: ${totalPaid.toFixed(2)}
        </span>
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="grid gap-3 sm:grid-cols-4">
          <Card><CardContent className="p-3 text-center"><p className="text-[10px] text-muted-foreground uppercase">Ventas</p><p className="text-lg font-bold">${summary.totalRevenue.toFixed(2)}</p></CardContent></Card>
          <Card><CardContent className="p-3 text-center"><p className="text-[10px] text-muted-foreground uppercase">Órdenes</p><p className="text-lg font-bold">{summary.totalOrders}</p></CardContent></Card>
          <Card><CardContent className="p-3 text-center"><p className="text-[10px] text-muted-foreground uppercase">Tienda online</p><p className="text-lg font-bold">{summary.storeSales}</p></CardContent></Card>
          <Card><CardContent className="p-3 text-center"><p className="text-[10px] text-muted-foreground uppercase">POS / Tienda</p><p className="text-lg font-bold">{summary.posSales}</p></CardContent></Card>
        </div>
      )}

      {/* Payment methods breakdown */}
      {summary?.paymentsBreakdown && Object.keys(summary.paymentsBreakdown).length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Desglose por método de pago</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {Object.entries(summary.paymentsBreakdown).map(([method, amount]) => {
                const labels: Record<string, string> = {
                  cash: "Efectivo", bank_transfer: "Transferencia", pago_movil: "Pago Móvil",
                  binancepay: "Binance Pay",
                }
                const colors: Record<string, string> = {
                  cash: "bg-green-100 text-green-700", bank_transfer: "bg-blue-100 text-blue-700",
                  pago_movil: "bg-purple-100 text-purple-700", binancepay: "bg-orange-100 text-orange-700",
                }
                return (
                  <Badge key={method} className={`${colors[method] || "bg-gray-100"} text-xs px-3 py-1`}>
                    {labels[method] || method}: ${(amount as number).toFixed(2)}
                  </Badge>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Credit summary */}
      {totalCredit > 0 && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="p-3 text-sm flex items-center gap-2">
            <span>Ventas a crédito:</span>
            <strong className="text-amber-700">${totalCredit.toFixed(2)}</strong>
            <span className="text-muted-foreground">({orders.filter(o => o.creditTerm).length} órdenes)</span>
          </CardContent>
        </Card>
      )}

      {/* Orders list */}
      {orders.length === 0 ? (
        <Card><CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <CalendarCheck className="size-12 mb-3" />
          <p className="text-sm">No hay ventas en esta fecha</p>
        </CardContent></Card>
      ) : (
        orders.map((o) => {
          const isExpanded = expanded === o.id
          const isPos = o.posPin || o.shippingMethod === "pickup_store" || o.shippingMethod === "store"
          const isCredit = !!o.creditTerm
          return (
            <Card key={o.id} className={`overflow-hidden ${isCredit ? "border-amber-200" : ""}`}>
              <button onClick={() => setExpanded(isExpanded ? null : o.id)} className="w-full text-left">
                <CardContent className="p-3 flex items-center gap-3 hover:bg-muted/20 transition-colors">
                  <div className={`flex size-8 items-center justify-center rounded-full ${isPos ? "bg-indigo-100 text-indigo-600" : "bg-sky-100 text-sky-600"}`}>
                    {isPos ? <Store className="size-4" /> : <ShoppingCart className="size-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold truncate">{o.customerName}</p>
                      {isCredit && <Badge className="bg-amber-100 text-amber-700 text-[9px]">Crédito</Badge>}
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      #{o.orderNumber} · {new Date(o.createdAt).toLocaleTimeString("es-VE", { hour: "2-digit", minute: "2-digit" })}
                      {isPos ? " · POS" : " · Tienda"}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold">${o.total.toFixed(2)}</p>
                    <p className={`text-[10px] ${o.paymentStatus === "paid" ? "text-green-600" : o.paymentStatus === "credit" ? "text-amber-600" : "text-muted-foreground"}`}>
                      {o.paymentStatus === "paid" ? "Pagado" : o.paymentStatus === "credit" ? "Crédito" : o.paymentStatus}
                    </p>
                  </div>
                  <ChevronRight className={`size-4 text-muted-foreground shrink-0 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                </CardContent>
              </button>

              {isExpanded && (
                <div className="border-t border-border p-3 space-y-2 text-xs">
                  {o.items && o.items.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Productos</p>
                      {o.items.map((item: any) => (
                        <div key={item.id} className="flex justify-between text-muted-foreground">
                          <span>{item.productName || "Producto"} x{item.quantity}</span>
                          <span>${(item.price * item.quantity).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {o.payments && o.payments.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Pagos</p>
                      <div className="flex flex-wrap gap-1">
                        {o.payments.map((p: any) => (
                          <span key={p.id} className={`px-1.5 py-0.5 rounded font-medium ${
                            p.method === "cash" ? "bg-green-100 text-green-700" :
                            p.method === "bank_transfer" ? "bg-blue-100 text-blue-700" :
                            p.method === "pago_movil" ? "bg-purple-100 text-purple-700" :
                            p.method === "binancepay" ? "bg-orange-100 text-orange-700" : "bg-gray-100"
                          }`}>
                            {p.method === "cash" ? "Efectivo" : p.method === "bank_transfer" ? "Transfer" : p.method === "pago_movil" ? "Pago Móvil" : p.method === "binancepay" ? "Binance Pay" : p.method} ${p.amount.toFixed(2)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {o.installments && o.installments.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Cuotas</p>
                      {o.installments.map((inst: any) => (
                        <div key={inst.id} className="flex justify-between">
                          <span className="text-muted-foreground">#{inst.number} — {inst.status === "paid" ? "Pagada" : "Pendiente"}</span>
                          <span className={inst.status === "paid" ? "text-green-600" : "text-amber-600"}>${inst.amount.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </Card>
          )
        })
      )}
    </div>
  )
}



