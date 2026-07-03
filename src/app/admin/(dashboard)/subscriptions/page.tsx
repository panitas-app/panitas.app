"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Card, CardContent,
} from "@/components/ui/card"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Search, CreditCard, CheckCircle2, XCircle, Clock, ExternalLink } from "lucide-react"
import { cn } from "@/lib/utils"

interface Subscription {
  id: string
  plan: string
  status: string
  amount: number
  currency: string
  period: string
  startDate: string | null
  endDate: string | null
  createdAt: string
  store: { name: string; slug: string; plan: string }
}

const planColors: Record<string, string> = {
  basico: "bg-slate-100 text-slate-700",
  negocio: "bg-blue-100 text-blue-700",
  empresarial: "bg-amber-100 text-amber-700",
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  verified: "bg-blue-100 text-blue-700",
  active: "bg-green-100 text-green-700",
  expired: "bg-red-100 text-red-700",
  cancelled: "bg-slate-100 text-slate-500",
  rejected: "bg-red-100 text-red-700",
}

const statusIcons: Record<string, any> = {
  pending: Clock,
  verified: CheckCircle2,
  active: CheckCircle2,
  expired: XCircle,
  cancelled: XCircle,
  rejected: XCircle,
}

export default function AdminSubscriptionsPage() {
  const [tab, setTab] = useState("pending")
  const [data, setData] = useState<Subscription[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [totalPages, setTotalPages] = useState(1)
  const [page, setPage] = useState(1)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ status: tab === "all" ? "" : tab, page: String(page) })
    const res = await fetch(`/api/admin/subscriptions?${params}`)
    const json = await res.json()
    setData(json.data || [])
    setTotalPages(json.totalPages || 1)
    setLoading(false)
  }, [tab, page])

  useEffect(() => { fetchData() }, [fetchData])

  const filtered = search
    ? data.filter((s) => s.store.name.toLowerCase().includes(search.toLowerCase()) || s.store.slug.toLowerCase().includes(search.toLowerCase()))
    : data

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Suscripciones</h1>
          <p className="text-sm text-muted-foreground">Gestiona los pagos y planes de las tiendas</p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => { setTab(v); setPage(1) }}>
        <TabsList>
          <TabsTrigger value="pending" className="gap-2"><Clock className="size-4" /> Pendientes</TabsTrigger>
          <TabsTrigger value="verified" className="gap-2"><CheckCircle2 className="size-4" /> Verificadas</TabsTrigger>
          <TabsTrigger value="active" className="gap-2"><CheckCircle2 className="size-4" /> Activas</TabsTrigger>
          <TabsTrigger value="rejected" className="gap-2"><XCircle className="size-4" /> Rechazadas</TabsTrigger>
          <TabsTrigger value="expired" className="gap-2"><XCircle className="size-4" /> Vencidas</TabsTrigger>
          <TabsTrigger value="all" className="gap-2"><CreditCard className="size-4" /> Todas</TabsTrigger>
        </TabsList>

        {["pending", "verified", "active", "rejected", "expired", "all"].map((t) => (
          <TabsContent key={t} value={t} className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input placeholder="Buscar por tienda..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 max-w-sm" />
            </div>
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tienda</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Monto</TableHead>
                      <TableHead>Período</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead className="text-right">Acción</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Cargando...</TableCell></TableRow>
                    ) : filtered.length === 0 ? (
                      <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Sin resultados</TableCell></TableRow>
                    ) : (
                      filtered.map((sub) => {
                        const StatusIcon = statusIcons[sub.status] || Clock
                        return (
                          <TableRow key={sub.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{sub.store.name}</p>
                                <p className="text-xs text-muted-foreground">{sub.store.slug}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={cn("font-medium", planColors[sub.plan] || planColors.free)}>
                                {sub.plan === "basico" ? "Emprendedor" : sub.plan === "negocio" ? "Negocio" : sub.plan === "empresarial" ? "Empresarial" : sub.plan}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-mono">{sub.currency === "USD" ? "$" : "Bs."}{sub.amount.toFixed(2)}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{sub.period === "yearly" ? "Anual" : "Mensual"}</TableCell>
                            <TableCell>
                              <Badge className={cn("gap-1", statusColors[sub.status])}>
                                <StatusIcon className="size-3" />
                                {sub.status === "pending" ? "Pendiente" : sub.status === "verified" ? "Verificada" : sub.status === "active" ? "Activa" : sub.status === "rejected" ? "Rechazada" : sub.status === "expired" ? "Vencida" : "Cancelada"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {format(new Date(sub.createdAt), "dd/MM/yyyy", { locale: es })}
                            </TableCell>
                            <TableCell className="text-right">
                              <Link href={`/admin/subscriptions/${sub.id}`}>
                                <Button variant="ghost" size="sm"><ExternalLink className="size-4" /></Button>
                              </Link>
                            </TableCell>
                          </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            {totalPages > 1 && (
              <div className="flex justify-center gap-2">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <Button key={p} variant={p === page ? "default" : "outline"} size="sm" onClick={() => setPage(p)}>{p}</Button>
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
