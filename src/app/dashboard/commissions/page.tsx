"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Search, Filter, Clock, CheckCircle2, XCircle } from "lucide-react"
import { toast } from "sonner"

interface Commission {
  id: string
  type: string
  value: number
  amount: number
  status: string
  createdAt: string
  paidAt: string | null
  seller: { id: string; name: string; photo: string | null }
  order: { id: string; orderNumber: string; total: number; createdAt: string }
}

interface SellerSummary {
  id: string
  name: string
}

export default function CommissionsPage() {
  const [commissions, setCommissions] = useState<Commission[]>([])
  const [sellers, setSellers] = useState<SellerSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [filterSeller, setFilterSeller] = useState("")
  const [filterStatus, setFilterStatus] = useState("")
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const perPage = 20

  const fetchCommissions = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterSeller) params.set("sellerId", filterSeller)
      if (filterStatus) params.set("status", filterStatus)
      params.set("page", String(page))
      params.set("limit", String(perPage))

      const [res, sellersRes] = await Promise.all([
        fetch(`/api/commissions?${params}`),
        fetch("/api/sellers?limit=100"),
      ])

      if (res.ok) {
        const data = await res.json()
        setCommissions(data.data)
        setTotalPages(data.totalPages || 1)
      }
      if (sellersRes.ok) {
        const data = await sellersRes.json()
        setSellers(data.data || data)
      }
    } catch { toast.error("Error al cargar comisiones") }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchCommissions() }, [page, filterSeller, filterStatus])

  const handleStatusChange = async (id: string, status: string) => {
    try {
      const res = await fetch("/api/commissions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      })
      if (!res.ok) throw new Error()
      toast.success(`Comisión ${status === "paid" ? "pagada" : "cancelada"}`)
      fetchCommissions()
    } catch { toast.error("Error al actualizar") }
  }

  const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    pending: { label: "Pendiente", variant: "outline" },
    paid: { label: "Pagada", variant: "default" },
    cancelled: { label: "Cancelada", variant: "destructive" },
  }

  const filtered = commissions.filter(c =>
    c.seller.name.toLowerCase().includes(search.toLowerCase()) ||
    c.order.orderNumber.toLowerCase().includes(search)
  )

  return (
    <div className="space-y-6 p-6">
      <div data-tour="comisiones-title">
        <h1 className="text-2xl font-bold text-accent">Comisiones</h1>
        <p className="text-sm text-muted-foreground">Gestiona las comisiones de vendedores</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input placeholder="Buscar por vendedor o pedido..." value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 rounded-xl border-border bg-card" />
        </div>
        <select value={filterSeller} onChange={e => { setFilterSeller(e.target.value); setPage(1) }}
          className="h-9 rounded-xl border border-input bg-card px-3 text-sm">
          <option value="">Todos los vendedores</option>
          {sellers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1) }}
          className="h-9 rounded-xl border border-input bg-card px-3 text-sm">
          <option value="">Todos los estados</option>
          <option value="pending">Pendiente</option>
          <option value="paid">Pagada</option>
          <option value="cancelled">Cancelada</option>
        </select>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Card key={i} className="rounded-2xl animate-pulse"><CardContent className="p-4"><div className="h-16 bg-muted rounded-xl" /></CardContent></Card>)}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="rounded-2xl">
          <CardContent className="p-12 text-center text-muted-foreground">
            <Clock className="size-12 mx-auto mb-3 opacity-40" />
            <p className="font-medium">No hay comisiones registradas</p>
            <p className="text-sm">Las comisiones se generan automáticamente al crear ventas con vendedor asignado</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(c => {
            const st = statusMap[c.status] || statusMap.pending
            return (
              <Card key={c.id} className="rounded-2xl border-border/50 hover:border-primary/20 transition-all">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0">
                      {c.seller.photo ? <img src={c.seller.photo} alt="" className="size-10 rounded-full object-cover" /> : c.seller.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-accent">{c.seller.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Pedido {c.order.orderNumber} — ${c.order.total.toFixed(2)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(c.createdAt).toLocaleDateString("es-VE")}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-accent">${Number(c.amount).toFixed(2)}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {c.type === "percentage" ? `${Number(c.value)}%` : `$${Number(c.value)}`}
                      </p>
                    </div>
                    <Badge variant={st.variant} className="text-[10px] shrink-0">
                      {st.label}
                    </Badge>
                    {c.status === "pending" && (
                      <div className="flex gap-1 shrink-0">
                        <Button size="xs" variant="outline"
                          onClick={() => handleStatusChange(c.id, "paid")}
                          className="h-7 text-green-600 border-green-200 hover:bg-green-50 gap-1">
                          <CheckCircle2 className="size-3" /> Pagar
                        </Button>
                        <Button size="xs" variant="outline"
                          onClick={() => handleStatusChange(c.id, "cancelled")}
                          className="h-7 text-red-500 border-red-200 hover:bg-red-50 gap-1">
                          <XCircle className="size-3" /> Cancelar
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                Anterior
              </Button>
              <span className="text-sm text-muted-foreground">
                Página {page} de {totalPages}
              </span>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                Siguiente
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
