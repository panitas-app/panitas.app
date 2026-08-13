"use client"

import { useState, useEffect, useCallback } from "react"
import { useDebounce } from "@/hooks/use-debounce"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { SearchInput } from "@/components/ui/search-input"
import { FilterChip } from "@/components/ui/filter-chip"
import { EmptyState } from "@/components/ui/empty-state"
import { LoadingState } from "@/components/ui/loading-state"
import { Pagination } from "@/components/ui/pagination"
import { formatDate } from "@/lib/utils"
import {
  ShoppingCart,
  Receipt,
  Banknote,
  CreditCard,
  Eye,
  Plus,
  MessageCircleQuestion,
} from "lucide-react"

type OrderRow = {
  id: string
  orderNumber: string
  customerId: string | null
  customerName: string
  customerPhone: string
  createdAt: string
  total: number
  status: string
  paymentStatus: string
}

export type OrderMetrics = {
  todayCount: number
  todayTotal: number
  avgTicket: number
  pendingPayment: number
  credit: number
}

function money(n: number): string {
  return "$" + n.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const STATUS_OPTIONS = [
  { value: "", label: "Todas" },
  { value: "pending", label: "Pendiente" },
  { value: "confirmed", label: "Confirmado" },
  { value: "preparing", label: "Preparando" },
  { value: "shipped", label: "Enviado" },
  { value: "delivered", label: "Entregado" },
  { value: "cancelled", label: "Cancelado" },
]

const PAYMENT_OPTIONS = [
  { value: "", label: "Todos los pagos" },
  { value: "paid", label: "Pagado" },
  { value: "pending", label: "Pago pendiente" },
  { value: "credit", label: "Crédito" },
  { value: "partial", label: "Parcial" },
  { value: "cancelled", label: "Cancelado" },
]

type BadgeStyle = { variant: "default" | "secondary" | "outline" | "destructive"; className?: string; label: string }

const statusStyles: Record<string, BadgeStyle> = {
  pending: { variant: "secondary", label: "Pendiente" },
  confirmed: { variant: "default", label: "Confirmado" },
  preparing: { variant: "outline", className: "border-info/40 bg-info/10 text-info", label: "Preparando" },
  shipped: { variant: "outline", className: "border-info/60 bg-info/10 text-info", label: "Enviado" },
  delivered: { variant: "outline", className: "border-transparent bg-success/10 text-success", label: "Entregado" },
  cancelled: { variant: "destructive", label: "Cancelado" },
}

const paymentStyles: Record<string, BadgeStyle> = {
  paid: { variant: "outline", className: "border-transparent bg-success/10 text-success", label: "Pagado" },
  pending: { variant: "secondary", label: "Pago pendiente" },
  credit: { variant: "outline", className: "border-primary/40 bg-primary/10 text-primary", label: "Crédito" },
  partial: { variant: "outline", className: "border-warning/40 bg-warning/10 text-warning", label: "Parcial" },
  cancelled: { variant: "outline", className: "border-transparent bg-muted text-muted-foreground", label: "Cancelado" },
  failed: { variant: "destructive", label: "Fallido" },
  refunded: { variant: "destructive", label: "Reembolsado" },
}

function StatCard({
  icon: Icon,
  iconClass,
  value,
  label,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>
  iconClass: string
  value: string
  label: string
  description?: string
}) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-1 py-4">
        <Icon className={`size-5 ${iconClass}`} />
        <span className="text-xl font-black text-accent">{value}</span>
        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{label}</span>
        {description && <span className="text-[10px] text-muted-foreground">{description}</span>}
      </CardContent>
    </Card>
  )
}

export function OrdersList({
  metrics,
  initialOrderId,
}: {
  metrics: OrderMetrics
  initialOrderId?: string
}) {
  const router = useRouter()
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState("")
  const [paymentStatus, setPaymentStatus] = useState("")
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)

  const debouncedSearch = useDebounce(search, 300)

  const hasFilters = Boolean(search || status || paymentStatus || from || to)

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page) })
      if (debouncedSearch) params.set("q", debouncedSearch)
      if (status) params.set("status", status)
      if (paymentStatus) params.set("paymentStatus", paymentStatus)
      if (from) params.set("from", from)
      if (to) params.set("to", to)
      const res = await fetch(`/api/orders?${params}`)
      if (res.ok) {
        const json = await res.json()
        setOrders(json.data || [])
        setTotal(json.total || 0)
        setTotalPages(json.totalPages || 0)
      }
    } catch (e) {
      console.error("[orders list]", e)
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch, status, paymentStatus, from, to, page])

  useEffect(() => { fetchOrders() }, [fetchOrders])

  useEffect(() => {
    if (initialOrderId) router.replace(`/dashboard/orders/${initialOrderId}`)
  }, [initialOrderId, router])

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-xl font-semibold">Ventas</h1>
          <p className="text-sm text-muted-foreground">
            Central de ventas: cobra, da seguimiento y gestiona pedidos.
          </p>
        </div>
        <Link href="/dashboard/pos">
          <Button>
            <Plus className="size-4" />
            Vender en tienda
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          icon={ShoppingCart}
          iconClass="text-primary"
          value={money(metrics.todayTotal)}
          label="Ventas de hoy"
          description={`${metrics.todayCount} pedidos`}
        />
        <StatCard
          icon={Receipt}
          iconClass="text-info"
          value={money(metrics.avgTicket)}
          label="Ticket promedio"
          description="hoy"
        />
        <StatCard
          icon={Banknote}
          iconClass="text-warning"
          value={String(metrics.pendingPayment)}
          label="Pagos por verificar"
        />
        <StatCard
          icon={CreditCard}
          iconClass="text-primary"
          value={String(metrics.credit)}
          label="Pedidos a crédito"
        />
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {STATUS_OPTIONS.map((opt) => (
          <FilterChip
            key={opt.value || "all-statuses"}
            label={opt.label}
            active={opt.value === status}
            onClick={() => { setStatus(opt.value); setPage(1) }}
          />
        ))}
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="flex-1">
          <SearchInput
            value={search}
            onChange={(v) => { setSearch(v); setPage(1) }}
            placeholder="Buscar por número, cliente o teléfono..."
          />
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <select
            aria-label="Filtrar por estado de pago"
            value={paymentStatus}
            onChange={(e) => { setPaymentStatus(e.target.value); setPage(1) }}
            className="h-10 w-full sm:w-auto rounded-xl border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            {PAYMENT_OPTIONS.map((opt) => (
              <option key={opt.value || "all-payments"} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <input
            type="date"
            aria-label="Fecha desde"
            value={from}
            onChange={(e) => { setFrom(e.target.value); setPage(1) }}
            className="h-10 rounded-xl border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <input
            type="date"
            aria-label="Fecha hasta"
            value={to}
            onChange={(e) => { setTo(e.target.value); setPage(1) }}
            className="h-10 rounded-xl border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <LoadingState message="Cargando pedidos..." />
          ) : orders.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title={hasFilters ? "Sin resultados" : "No hay pedidos aún"}
              description={
                hasFilters
                  ? "Prueba con otra búsqueda o cambia los filtros."
                  : "Los pedidos aparecerán aquí al vender desde el Punto de venta o la tienda online."
              }
              action={
                !hasFilters ? (
                  <Link href="/dashboard/pos">
                    <Button>
                      <Plus className="size-4" />
                      Vender en tienda
                    </Button>
                  </Link>
                ) : undefined
              }
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pedido</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Pago</TableHead>
                    <TableHead className="text-right">Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((o) => {
                    const st = statusStyles[o.status] || { variant: "secondary" as const, label: o.status }
                    const ps = paymentStyles[o.paymentStatus] || { variant: "secondary" as const, label: o.paymentStatus }
                    return (
                      <TableRow key={o.id}>
                        <TableCell data-label="Pedido">
                          <Link
                            href={`/dashboard/orders/${o.id}`}
                            className="font-semibold text-foreground hover:text-primary transition-colors"
                          >
                            {o.orderNumber}
                          </Link>
                        </TableCell>
                        <TableCell data-label="Cliente">
                          <span className="font-medium">{o.customerName}</span>
                          {o.customerPhone && (
                            <span className="block text-[10px] text-muted-foreground">{o.customerPhone}</span>
                          )}
                        </TableCell>
                        <TableCell data-label="Fecha">
                          <span className="text-xs text-muted-foreground">{formatDate(o.createdAt)}</span>
                        </TableCell>
                        <TableCell data-label="Total" className="text-right">
                          <span className="font-semibold tabular-nums">{money(o.total)}</span>
                        </TableCell>
                        <TableCell data-label="Estado">
                          <Badge variant={st.variant} className={st.className}>{st.label}</Badge>
                        </TableCell>
                        <TableCell data-label="Pago">
                          <Badge variant={ps.variant} className={ps.className}>{ps.label}</Badge>
                        </TableCell>
                        <TableCell data-label="Acción" className="text-right">
                          <Link href={`/dashboard/orders/${o.id}`}>
                            <Button variant="ghost" size="xs">
                              <Eye className="size-3.5" /> Ver
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
              <div className="border-t border-border px-2">
                <Pagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-center">
        <Link
          href={`/dashboard/assistant?q=${encodeURIComponent("¿Qué pedidos necesitan atención hoy?")}`}
          className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-semibold text-foreground hover:text-primary hover:border-primary/40 transition-colors"
        >
          <MessageCircleQuestion className="size-4 text-primary" />
          Preguntar a Panitas
        </Link>
      </div>
    </div>
  )
}
