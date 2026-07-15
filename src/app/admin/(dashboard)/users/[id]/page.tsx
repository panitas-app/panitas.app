"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { toast } from "sonner"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { ArrowLeft, UserX, UserCheck, Store, CreditCard, Activity, RefreshCw, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface UserDetail {
  id: string
  name: string | null
  email: string | null
  image: string | null
  role: string
  emailVerified: string | null
  createdAt: string
  updatedAt: string
  suspendedAt: string | null
  suspensionReason: string | null
  store: {
    id: string; name: string; slug: string; plan: string; planType: string; planStatus: string
    isActive: boolean; createdAt: string
    _count: { products: number; orders: number; members: number }
  } | null
  negocio: { id: string; nombre: string; planId: string; modalidad: string | null; planEstado: string; planVencimiento: string | null } | null
  _count: { orders: number }
  subscriptions: Array<{ id: string; plan: string; status: string; amount: number; period: string; createdAt: string; verifiedAt: string | null; rejectionReason: string | null }>
  auditLogs: Array<{ id: string; action: string; entity: string; createdAt: string }>
}

export default function AdminUserDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params?.id as string

  const [user, setUser] = useState<UserDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [suspendOpen, setSuspendOpen] = useState(false)
  const [suspendReason, setSuspendReason] = useState("")
  const [renewOpen, setRenewOpen] = useState(false)
  const [renewDays, setRenewDays] = useState<30 | 15>(30)
  const [renewing, setRenewing] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteSecret, setDeleteSecret] = useState("")
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/admin/users/${id}`)
      if (!res.ok) { router.push("/admin/users"); return }
      setUser(await res.json())
      setLoading(false)
    }
    load()
  }, [id, router])

  async function handleSuspend() {
    if (!suspendReason.trim()) { toast.error("Escribe un motivo"); return }
    const res = await fetch(`/api/admin/users/${id}/suspend`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: suspendReason }),
    })
    if (!res.ok) { toast.error("Error al suspender"); return }
    toast.success("Usuario suspendido")
    setSuspendOpen(false)
    window.location.reload()
  }

  async function handleRenew() {
    setRenewing(true)
    const res = await fetch(`/api/admin/users/${id}/renew`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ days: renewDays }),
    })
    setRenewing(false)
    if (!res.ok) { toast.error("Error al renovar"); return }
    toast.success(`Suscripción renovada +${renewDays} días`)
    setRenewOpen(false)
    window.location.reload()
  }

  async function handleReactivate() {
    const res = await fetch(`/api/admin/users/${id}/reactivate`, { method: "POST" })
    if (!res.ok) { toast.error("Error al reactivar"); return }
    toast.success("Usuario reactivado")
    window.location.reload()
  }

  async function handleDelete() {
    if (!deleteSecret.trim()) { toast.error("Ingresa la contraseña de administrador"); return }
    setDeleting(true)
    const res = await fetch(`/api/admin/users/${id}/delete`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret: deleteSecret }),
    })
    setDeleting(false)
    if (!res.ok) { const err = await res.json().catch(() => ({})); toast.error(err.error || "Error al eliminar"); return }
    toast.success("Cuenta eliminada permanentemente")
    router.push("/admin/users")
  }

  function getPlanLabel(p: string) {
    const map: Record<string, string> = {
      basico: "Emprendedor", negocio: "Negocio", empresarial: "Empresarial",
      free: "Gratis", basic: "Básico", advanced: "Avanzado",
    }
    return map[p] || p
  }

  function getStatusColor(s: string) {
    const map: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-700",
      active: "bg-green-100 text-green-700",
      verified: "bg-emerald-100 text-emerald-700",
      rejected: "bg-red-100 text-red-700",
      cancelled: "bg-slate-100 text-slate-500",
      expired: "bg-slate-100 text-slate-500",
    }
    return map[s] || "bg-slate-100 text-slate-500"
  }

  if (loading) return <div className="flex items-center justify-center min-h-[60vh] text-muted-foreground">Cargando...</div>
  if (!user) return null

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-4">
        <Link href="/admin/users"><Button variant="ghost" size="icon"><ArrowLeft className="size-4" /></Button></Link>
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
            {(user.name || user.email || "?").charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-bold">{user.name || "Sin nombre"}</h1>
            <p className="text-sm text-muted-foreground">{user.email} · {user.role}</p>
          </div>
        </div>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" className="gap-2" onClick={() => setRenewOpen(true)}>
            <RefreshCw className="size-4" /> Renovar
          </Button>
          {user.suspendedAt ? (
            <Button variant="outline" className="gap-2" onClick={handleReactivate}>
              <UserCheck className="size-4" /> Reactivar
            </Button>
          ) : (
            <Button variant="destructive" className="gap-2" onClick={() => setSuspendOpen(true)}>
              <UserX className="size-4" /> Suspender
            </Button>
          )}
          <Button variant="destructive" className="gap-2" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="size-4" /> Eliminar cuenta
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Store className="size-4" /> Tienda</CardTitle>
            {user.negocio?.planEstado === "activo" && user.negocio?.planVencimiento && (
              <p className="text-xs text-muted-foreground">
                Vence: {format(new Date(user.negocio.planVencimiento), "dd/MM/yyyy", { locale: es })} ·{' '}
                {Math.max(0, Math.ceil((new Date(user.negocio.planVencimiento).getTime() - Date.now()) / 86400000))} días restantes
              </p>
            )}
          </CardHeader>
          <CardContent>
            {user.store ? (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Nombre</span><span className="font-medium">{user.store.name}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Slug</span><span className="font-mono text-xs">{user.store.slug}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Plan</span><Badge className={cn("font-medium", user.store.planType === "negocio" ? "bg-blue-100 text-blue-700" : user.store.planType === "empresarial" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-700")}>{getPlanLabel(user.store.planType)}</Badge></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Productos</span><span>{user.store._count.products}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Órdenes</span><span>{user.store._count.orders}</span></div>
              </div>
            ) : <p className="text-sm text-muted-foreground">Sin tienda</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><CreditCard className="size-4" /> Suscripciones</CardTitle></CardHeader>
          <CardContent>
            {user.subscriptions.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin suscripciones</p>
            ) : (
              <div className="space-y-2">
                {user.subscriptions.map((sub) => (
                  <div key={sub.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                    <div>
                      <p className="text-sm font-medium">{getPlanLabel(sub.plan)}</p>
                      <p className="text-xs text-muted-foreground">${sub.amount.toFixed(2)} · {sub.period === "yearly" ? "Anual" : "Mensual"}</p>
                    </div>
                    <Badge className={cn("text-xs", getStatusColor(sub.status))}>{sub.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Activity className="size-4" /> Actividad reciente</CardTitle></CardHeader>
        <CardContent>
          {user.auditLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin actividad registrada</p>
          ) : (
            <div className="space-y-1">
              {user.auditLogs.slice(0, 10).map((log) => (
                <div key={log.id} className="flex items-center justify-between py-1.5 text-sm border-b border-border/50 last:border-0">
                  <span className="font-mono text-xs">{log.action}</span>
                  <span className="text-xs text-muted-foreground">{format(new Date(log.createdAt), "dd/MM/yyyy HH:mm", { locale: es })}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={renewOpen} onOpenChange={setRenewOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><RefreshCw className="size-4" /> Renovar suscripción</DialogTitle></DialogHeader>
          <div className="py-4 space-y-3">
            <p className="text-sm text-muted-foreground">Selecciona el tipo de renovación para <strong>{user.name || user.email}</strong>:</p>
            <div className="flex gap-3">
              <Button
                variant={renewDays === 30 ? "default" : "outline"}
                className="flex-1"
                onClick={() => setRenewDays(30)}
              >
                Mes completo <br /><span className="text-xs opacity-70">+30 días</span>
              </Button>
              <Button
                variant={renewDays === 15 ? "default" : "outline"}
                className="flex-1"
                onClick={() => setRenewDays(15)}
              >
                Cuota <br /><span className="text-xs opacity-70">+15 días</span>
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenewOpen(false)}>Cancelar</Button>
            <Button onClick={handleRenew} disabled={renewing}>
              {renewing ? "Procesando..." : `Renovar (+${renewDays} días)`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={suspendOpen} onOpenChange={setSuspendOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Suspender usuario</DialogTitle></DialogHeader>
          <div className="py-2">
            <Textarea placeholder="Motivo de la suspensión..." value={suspendReason}
              onChange={(e) => setSuspendReason(e.target.value)} rows={3} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSuspendOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleSuspend}>Suspender</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive"><Trash2 className="size-4" /> Eliminar cuenta</DialogTitle>
          </DialogHeader>
          <div className="py-3 space-y-3">
            <p className="text-sm text-muted-foreground">
              Esta acción eliminará permanentemente la cuenta de <strong>{user.name || user.email}</strong> y todos sus datos asociados (tienda, productos, órdenes, etc.). No se puede deshacer.
            </p>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Ingresa la contraseña de administrador para confirmar:</label>
              <Input type="password" placeholder="Contraseña de administrador" value={deleteSecret}
                onChange={(e) => setDeleteSecret(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDeleteOpen(false); setDeleteSecret("") }}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Eliminando..." : "Eliminar cuenta"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
