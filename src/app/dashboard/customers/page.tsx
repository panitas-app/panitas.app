"use client"

import { useState, useEffect, useCallback } from "react"
import { useDebounce } from "@/hooks/use-debounce"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Card,
  CardContent,
} from "@/components/ui/card"
import { SearchInput } from "@/components/ui/search-input"
import { EmptyState } from "@/components/ui/empty-state"
import { LoadingState } from "@/components/ui/loading-state"
import { Pagination } from "@/components/ui/pagination"
import { Eye, Users, UserPlus, UserX, DollarSign, Phone, Mail, ArrowUp, ArrowDown, ArrowUpDown, MessageCircleQuestion } from "lucide-react"

type SortKey = "name" | "totalOrders" | "totalSpent" | "lastPurchaseAt"

type Customer = {
  id: string
  name: string
  phone: string
  email: string | null
  documentId: string | null
  totalSpent: number
  totalOrders: number
  lastPurchaseAt: string | null
  createdAt: string
}

type CustomerMetrics = {
  total: number
  newThisMonth: number
  recurrent: number
  inactive: number
  inactiveDays: number
  averageCustomerValue: number
  totalSpent: number
}

function money(n: number): string {
  return "$" + n.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function dateOnly(d: string | null): string {
  if (!d) return "—"
  return new Date(d).toLocaleDateString("es-VE", { day: "2-digit", month: "short", year: "numeric" })
}

function StatCard({
  icon: Icon,
  iconClass,
  value,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>
  iconClass: string
  value: string
  label: string
}) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-1 py-4">
        <Icon className={`size-5 ${iconClass}`} />
        <span className="text-2xl font-black text-accent">{value}</span>
        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{label}</span>
      </CardContent>
    </Card>
  )
}

function SortableHead({
  col,
  label,
  align,
  sort,
  order,
  onToggle,
}: {
  col: SortKey
  label: string
  align?: "right"
  sort: SortKey
  order: string
  onToggle: (col: SortKey) => void
}) {
  const active = sort === col
  const ariaSort = active ? (order === "asc" ? "ascending" : "descending") : "none"
  return (
    <TableHead aria-sort={ariaSort} className={align === "right" ? "text-right" : ""}>
      <button
        type="button"
        onClick={() => onToggle(col)}
        className="inline-flex items-center gap-1 font-medium text-foreground hover:text-primary transition-colors"
      >
        {label}
        {active
          ? (order === "asc" ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />)
          : <ArrowUpDown className="size-3 opacity-40" />}
      </button>
    </TableHead>
  )
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [metrics, setMetrics] = useState<CustomerMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [sort, setSort] = useState<SortKey>("name")
  const [order, setOrder] = useState("asc")
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)

  const debouncedSearch = useDebounce(search, 300)

  const fetchCustomers = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ sort, order, page: String(page) })
      if (debouncedSearch) params.set("q", debouncedSearch)
      const res = await fetch(`/api/customers?${params}`)
      if (res.ok) {
        const json = await res.json()
        setCustomers(json.data || [])
        setTotal(json.total || 0)
        setTotalPages(json.totalPages || 0)
        if (json.metrics) setMetrics(json.metrics)
      }
    } catch (e) { console.error("[unhandled error]", e) } finally {
      setLoading(false)
    }
  }, [debouncedSearch, sort, order, page])

  useEffect(() => { fetchCustomers() }, [fetchCustomers])

  const toggleSort = (col: SortKey) => {
    if (sort === col) setOrder(order === "asc" ? "desc" : "asc")
    else { setSort(col); setOrder("asc") }
    setPage(1)
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-xl font-black flex items-center gap-2">
            <Users className="size-6 text-primary" /> Clientes
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Tu base de clientes, su historial de compras y saldo pendiente.
          </p>
        </div>
        <Link href={`/dashboard/assistant?q=${encodeURIComponent("¿Qué clientes necesitan atención?")}`}>
          <Button variant="outline" className="gap-1.5">
            <MessageCircleQuestion className="size-4" /> Preguntar a Panitas
          </Button>
        </Link>
      </div>

      {metrics && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard icon={Users} iconClass="text-primary" value={String(total)} label="Total" />
          <StatCard icon={UserPlus} iconClass="text-success" value={String(metrics.newThisMonth)} label="Nuevos este mes" />
          <StatCard icon={UserX} iconClass="text-warning" value={String(metrics.inactive)} label={`Inactivos (${metrics.inactiveDays}d)`} />
          <StatCard icon={DollarSign} iconClass="text-info" value={money(metrics.totalSpent)} label="Total gastado" />
        </div>
      )}

      <SearchInput
        value={search}
        onChange={(v) => { setSearch(v); setPage(1) }}
        placeholder="Buscar por nombre, teléfono, email o documento..."
      />

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <LoadingState message="Cargando clientes..." />
          ) : customers.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No hay clientes registrados"
              description="Los clientes aparecerán automáticamente cuando reciban pedidos desde el POS."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableHead col="name" label="Nombre" sort={sort} order={order} onToggle={toggleSort} />
                  <TableHead>Contacto</TableHead>
                  <SortableHead col="totalOrders" label="Órdenes" align="right" sort={sort} order={order} onToggle={toggleSort} />
                  <SortableHead col="totalSpent" label="Total gastado" align="right" sort={sort} order={order} onToggle={toggleSort} />
                  <SortableHead col="lastPurchaseAt" label="Última compra" align="right" sort={sort} order={order} onToggle={toggleSort} />
                  <TableHead className="text-right">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-semibold text-foreground">{c.name}</span>
                        {c.documentId && (
                          <span className="text-[10px] text-muted-foreground">{c.documentId}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Phone className="size-3 text-muted-foreground" /> {c.phone}
                        </span>
                        {c.email && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Mail className="size-3 text-muted-foreground" /> {c.email}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-bold">{c.totalOrders}</TableCell>
                    <TableCell className="text-right font-bold">{money(c.totalSpent)}</TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">
                      {dateOnly(c.lastPurchaseAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/dashboard/customers/${c.id}`}>
                        <Button variant="ghost" size="xs">
                          <Eye className="size-3.5" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <Pagination
            page={page}
            totalPages={totalPages}
            total={total}
            onPageChange={setPage}
          />
        </CardContent>
      </Card>
    </div>
  )
}
