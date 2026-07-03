"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Search, ExternalLink, UserX, UserCheck, Shield, Lock, ShieldAlert } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

interface UserItem {
  id: string
  name: string | null
  email: string | null
  image: string | null
  role: string
  createdAt: string
  suspendedAt: string | null
  suspensionReason: string | null
  store: { id: string; name: string; slug: string; plan: string; planType: string; planStatus: string } | null
  negocio: { id: string; planId: string; modalidad: string | null; planEstado: string } | null
  _count: { orders: number }
}

export default function AdminUsersPage() {
  const router = useRouter()
  const [data, setData] = useState<UserItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [activateOpen, setActivateOpen] = useState(false)
  const [activateUser, setActivateUser] = useState<UserItem | null>(null)
  const [adminPassword, setAdminPassword] = useState("")
  const [activating, setActivating] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page) })
    if (search) params.set("search", search)
    if (statusFilter !== "all") params.set("status", statusFilter)
    const res = await fetch(`/api/admin/users?${params}`)
    const json = await res.json()
    setData(json.data || [])
    setTotalPages(json.totalPages || 1)
    setLoading(false)
  }, [page, search, statusFilter])

  useEffect(() => { fetchData() }, [fetchData])

  function isPlanPending(u: UserItem): boolean {
    if (u.store && u.store.planStatus !== "activo") return true
    if (u.negocio && u.negocio.planEstado !== "activo") return true
    if (!u.store && !u.negocio) return false
    return false
  }

  async function handleActivatePlan() {
    if (!activateUser || !adminPassword.trim()) { toast.error("Escribe la contraseña"); return }
    setActivating(true)
    const res = await fetch(`/api/admin/users/${activateUser.id}/activate-plan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret: adminPassword }),
    })
    setActivating(false)
    const json = await res.json()
    if (!res.ok) { toast.error(json.error || "Error al activar plan"); return }
    toast.success("Plan activado correctamente")
    setActivateOpen(false)
    setAdminPassword("")
    setActivateUser(null)
    fetchData()
  }

  function getPlanLabel(planType: string): string {
    const map: Record<string, string> = {
      tienda: "Emprendedor", agenda: "Emprendedor", basico: "Emprendedor",
      negocio: "Negocio", empresarial: "Empresarial",
      free: "Gratis", basic: "Básico", advanced: "Avanzado",
    }
    return map[planType] || planType
  }

  function getPlanColor(planType: string): string {
    const map: Record<string, string> = {
      tienda: "bg-slate-100 text-slate-700", agenda: "bg-slate-100 text-slate-700",
      basico: "bg-slate-100 text-slate-700",
      negocio: "bg-blue-100 text-blue-700",
      empresarial: "bg-amber-100 text-amber-700",
    }
    return map[planType] || "bg-slate-100 text-slate-700"
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
                <TableHead className="text-right">Acción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Cargando...</TableCell></TableRow>
              ) : data.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Sin resultados</TableCell></TableRow>
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
                      {u.suspendedAt ? (
                        <Badge variant="destructive" className="text-xs">Suspendido</Badge>
                      ) : (
                        <Badge className="bg-green-100 text-green-700 text-xs">Activo</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(u.createdAt), "dd/MM/yyyy", { locale: es })}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {isPlanPending(u) && (
                          <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8"
                            onClick={() => { setActivateUser(u); setAdminPassword(""); setActivateOpen(true) }}>
                            <ShieldAlert className="size-3.5" /> Activar
                          </Button>
                        )}
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

      <Dialog open={activateOpen} onOpenChange={setActivateOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Lock className="size-4" /> Activar plan sin pago</DialogTitle>
            <DialogDescription>
              Ingresa tu contraseña de Super Admin para activar el plan de <strong>{activateUser?.name || activateUser?.email}</strong> sin necesidad de pago.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Input type="password" placeholder="Contraseña del Super Admin..." value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleActivatePlan()} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setActivateOpen(false); setAdminPassword("") }}>Cancelar</Button>
            <Button onClick={handleActivatePlan} disabled={activating || !adminPassword.trim()}>
              {activating ? "Activando..." : "Activar plan"}
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
