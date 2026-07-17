"use client"

import { useState, useEffect, useCallback } from "react"
import { useDebounce } from "@/hooks/use-debounce"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Search, ExternalLink, Lock } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { planDisplayLabel, planColor } from "@/lib/plans"

interface UserItem {
  id: string
  name: string | null
  email: string | null
  image: string | null
  role: string
  createdAt: string
  suspendedAt: string | null
  suspensionReason: string | null
  store: { id: string; name: string; slug: string; plan: string; planType: string; planStatus: string; subscriptions: { status: string }[] } | null
  negocio: { id: string; planId: string; modalidad: string | null; planEstado: string; planVencimiento: string | null } | null
  _count: { orders: number }
  daysRemaining: number | null
}

export default function AdminUsersPage() {
  const router = useRouter()
  const [data, setData] = useState<UserItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [toggleOpen, setToggleOpen] = useState(false)
  const [toggleUser, setToggleUser] = useState<UserItem | null>(null)
  const [toggleTarget, setToggleTarget] = useState(false)
  const [adminPassword, setAdminPassword] = useState("")
  const [toggling, setToggling] = useState(false)

  const debouncedSearch = useDebounce(search, 300)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page) })
    if (debouncedSearch) params.set("search", debouncedSearch)
    if (statusFilter !== "all") params.set("status", statusFilter)
    const res = await fetch(`/api/admin/users?${params}`)
    const json = await res.json()
    setData(json.data || [])
    setTotalPages(json.totalPages || 1)
    setLoading(false)
  }, [page, debouncedSearch, statusFilter])

  useEffect(() => { fetchData() }, [fetchData])

  function isActive(u: UserItem): boolean {
    return (u.store?.planStatus === "activo" || u.negocio?.planEstado === "activo") && !u.suspendedAt
  }

  async function handleToggle() {
    if (!toggleUser || !adminPassword.trim()) { toast.error("Escribe la contraseña"); return }
    setToggling(true)
    const res = await fetch(`/api/admin/users/${toggleUser.id}/toggle-activation`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: toggleTarget, secret: adminPassword }),
    })
    setToggling(false)
    const json = await res.json()
    if (!res.ok) { toast.error(json.error || "Error al cambiar estado"); return }
    toast.success(toggleTarget ? "Cuenta activada" : "Cuenta desactivada")
    setToggleOpen(false)
    setAdminPassword("")
    setToggleUser(null)
    fetchData()
  }

  function getPlanLabel(planType: string): string {
    return planDisplayLabel(planType)
  }

  function getStatusInfo(u: UserItem): { label: string; color: string } {
    if (u.suspendedAt) return { label: "Suspendido", color: "bg-red-100 text-red-700" }

    const planStatus = u.store?.planStatus || u.negocio?.planEstado || null
    const hasPendingSub = u.store?.subscriptions?.some(s => s.status === "pending") ?? false

    if (planStatus === "activo") return { label: "Activo", color: "bg-green-100 text-green-700" }
    if (hasPendingSub) return { label: "Suscripción Pendiente", color: "bg-amber-100 text-amber-700" }

    if (planStatus) return { label: "Pendiente", color: "bg-gray-100 text-gray-500" }
    return { label: "Pendiente", color: "bg-gray-100 text-gray-500" }
  }

  function getPlanColor(planType: string): string {
    return planColor(planType)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Usuarios</h1>
          <p className="text-sm text-muted-foreground">{data.length} usuarios</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input placeholder="Buscar por nombre o email..." value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v ?? "all"); setPage(1) }}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Activos</SelectItem>
            <SelectItem value="suspended">Suspendidos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuario</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Órdenes</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Registro</TableHead>
                <TableHead className="text-right">Días</TableHead>
                <TableHead className="text-right">Acción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Cargando...</TableCell></TableRow>
              ) : data.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Sin resultados</TableCell></TableRow>
              ) : (
                data.map((u) => (
                  <TableRow key={u.id} className={u.suspendedAt ? "opacity-60" : ""}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                          {(u.name || u.email || "?").charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{u.name || "Sin nombre"}</p>
                          <p className="text-xs text-muted-foreground">{u.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {u.store ? (
                        <Badge className={cn("font-medium text-xs", getPlanColor(u.store.planType))}>
                          {getPlanLabel(u.store.planType)}
                        </Badge>
                      ) : u.negocio ? (
                        <Badge className={cn("font-medium text-xs", getPlanColor(u.negocio.planId))}>
                          {getPlanLabel(u.negocio.planId)}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">{u._count.orders}</TableCell>
                    <TableCell>
                      <Badge className={cn("font-medium text-xs", getStatusInfo(u).color)}>
                        {getStatusInfo(u).label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(u.createdAt), "dd/MM/yyyy", { locale: es })}
                    </TableCell>
                    <TableCell className="text-right">
                      {u.daysRemaining !== null && u.daysRemaining !== undefined ? (
                        <span className={cn(
                          "inline-flex items-center justify-center size-8 rounded-full text-xs font-bold",
                          u.daysRemaining <= 0 ? "bg-red-100 text-red-700" :
                          u.daysRemaining <= 3 ? "bg-red-50 text-red-600" :
                          u.daysRemaining <= 7 ? "bg-amber-50 text-amber-600" :
                          "bg-green-50 text-green-600"
                        )}>
                          {u.daysRemaining}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          role="switch"
                          aria-checked={isActive(u)}
                          disabled={!!u.suspendedAt}
                          onClick={() => {
                            setToggleUser(u)
                            setToggleTarget(!isActive(u))
                            setAdminPassword("")
                            setToggleOpen(true)
                          }}
                          className={cn(
                            "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                            isActive(u) ? "bg-green-500" : "bg-gray-300",
                            u.suspendedAt && "opacity-40 cursor-not-allowed"
                          )}
                        >
                          <span
                            className={cn(
                              "pointer-events-none block size-3.5 rounded-full bg-white shadow-sm ring-0 transition-transform",
                              isActive(u) ? "translate-x-[18px]" : "translate-x-[3px]"
                            )}
                          />
                        </button>
                        <Button variant="ghost" size="sm" onClick={() => router.push(`/admin/users/${u.id}`)}>
                          <ExternalLink className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={toggleOpen} onOpenChange={setToggleOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Lock className="size-4" /> Confirmar cambio</DialogTitle>
            <DialogDescription>
              Ingresa tu contraseña de Super Admin para {toggleTarget ? "activar" : "desactivar"} la cuenta de <strong>{toggleUser?.name || toggleUser?.email}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Input type="password" placeholder="Contraseña del Super Admin..." value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleToggle()} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setToggleOpen(false); setAdminPassword("") }}>Cancelar</Button>
            <Button onClick={handleToggle} disabled={toggling || !adminPassword.trim()}>
              {toggling ? "Procesando..." : toggleTarget ? "Activar" : "Desactivar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Button key={p} variant={p === page ? "default" : "outline"} size="sm" onClick={() => setPage(p)}>{p}</Button>
          ))}
        </div>
      )}
    </div>
  )
}
