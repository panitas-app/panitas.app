"use client"

import { useCallback, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { PUBLIC_API_PERMISSIONS } from "@/lib/platform/permissions"
import {
  Copy,
  KeyRound,
  Loader2,
  Plus,
  RefreshCw,
  RotateCcw,
  Trash2,
  Puzzle,
  Webhook,
  Check,
  Pause,
  Play,
} from "lucide-react"

type ApiKeyItem = {
  id: string
  name: string
  keyPrefix: string
  permissions: string[]
  status: string
  lastUsedAt: string | null
  expiresAt: string | null
  createdAt: string
}

type WebhookItem = {
  id: string
  name: string
  endpoint: string
  events: string
  status: string
  failureCount: number
  createdAt: string
}

type DeliveryItem = {
  id: string
  status: string
  attempts: number
  responseStatus: string | null
  error: string | null
  nextRetryAt: string | null
  createdAt: string
}

type ExtensionItem = {
  id: string
  name: string
  description: string | null
  type: string
  status: string
  permissions: string
  createdAt: string
}

const EVENT_GROUPS: { label: string; types: string[] }[] = [
  { label: "Ventas", types: ["sale.created", "sale.completed", "sale.refunded", "sale.cancelled"] },
  { label: "Productos", types: ["product.created", "product.updated", "product.deleted", "product.stock.changed", "inventory.low_stock"] },
  { label: "Clientes", types: ["customer.created", "customer.updated"] },
  { label: "Créditos", types: ["credit.created", "credit.payment.created", "credit.completed", "credit.overdue"] },
  { label: "Proveedores", types: ["supplier.purchase.created", "supplier.payment.created", "supplier.balance.updated"] },
  { label: "Pedidos", types: ["order.created", "order.updated", "order.completed", "order.cancelled"] },
  { label: "Agenda", types: ["appointment.created", "appointment.updated", "appointment.cancelled", "reservation.created"] },
  { label: "Conversaciones", types: ["conversation.started", "conversation.assigned", "conversation.completed"] },
  { label: "Atención", types: ["attention.item.created", "attention.item.acknowledged", "attention.item.resolved", "attention.item.snoozed"] },
]

const PERMISSION_GROUPS = PUBLIC_API_PERMISSIONS.reduce<Record<string, string[]>>((acc, p) => {
  const resource = p.split(":")[0]
  ;(acc[resource] ||= []).push(p)
  return acc
}, {})

const EXTENSION_TYPES = [
  { value: "webhook_integration", label: "Integración por webhooks" },
  { value: "api_integration", label: "Integración por API" },
  { value: "channel_integration", label: "Canal de atención" },
  { value: "automation_integration", label: "Automatización" },
]

function parseJsonList(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : []
  } catch {
    return []
  }
}

function fmtDate(value: string | null | undefined): string {
  if (!value) return "—"
  const d = new Date(value)
  if (isNaN(d.getTime())) return "—"
  return d.toLocaleDateString("es-VE", { day: "2-digit", month: "2-digit", year: "numeric" })
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: "bg-emerald-500/15 text-emerald-600 border-emerald-200 dark:text-emerald-400",
    paused: "bg-amber-500/15 text-amber-600 border-amber-200 dark:text-amber-400",
    dead_letter: "bg-red-500/15 text-red-600 border-red-200 dark:text-red-400",
    revoked: "bg-slate-500/15 text-slate-500 border-slate-200",
    draft: "bg-slate-500/15 text-slate-500 border-slate-200",
    disabled: "bg-amber-500/15 text-amber-600 border-amber-200 dark:text-amber-400",
    success: "bg-emerald-500/15 text-emerald-600 border-emerald-200 dark:text-emerald-400",
    failed: "bg-red-500/15 text-red-600 border-red-200 dark:text-red-400",
    pending: "bg-slate-500/15 text-slate-500 border-slate-200",
    dead: "bg-red-500/15 text-red-600 border-red-200 dark:text-red-400",
  }
  const labels: Record<string, string> = {
    active: "Activo",
    paused: "Pausado",
    dead_letter: "Dead letter",
    revoked: "Revocada",
    draft: "Borrador",
    disabled: "Deshabilitada",
    success: "Entregado",
    failed: "Fallido",
    pending: "Pendiente",
    dead: "Muerto",
  }
  return (
    <Badge className={cn("text-[10px] font-bold border", styles[status] || styles.revoked)}>
      {labels[status] || status}
    </Badge>
  )
}

function SecretDialog({ secret, title, onClose }: { secret: string; title: string; onClose: () => void }) {
  async function copy() {
    try {
      await navigator.clipboard.writeText(secret)
      toast.success("Secreto copiado")
    } catch {
      toast.error("No se pudo copiar")
    }
  }
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Guárdalo ahora: <strong>solo se muestra una vez</strong>.
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-2 rounded-lg bg-muted p-3">
          <code className="flex-1 break-all text-xs">{secret}</code>
          <Button size="icon" variant="outline" onClick={copy} title="Copiar">
            <Copy className="size-4" />
          </Button>
        </div>
        <DialogFooter>
          <Button onClick={onClose}>Listo</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function PermissionPicker({
  selected,
  onToggle,
}: {
  selected: Set<string>
  onToggle: (p: string) => void
}) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {Object.entries(PERMISSION_GROUPS).map(([resource, perms]) => (
        <div key={resource} className="rounded-lg border p-3">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">{resource}</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1.5">
            {perms.map((p) => (
              <label key={p} className="flex cursor-pointer items-center gap-1.5 text-sm">
                <Checkbox checked={selected.has(p)} onCheckedChange={() => onToggle(p)} />
                <span className="text-foreground/80">{p.split(":")[1]}</span>
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export function IntegrationsSettings() {
  const [tab, setTab] = useState("api-keys")

  return (
    <Tabs value={tab} onValueChange={setTab} className="w-full">
      <TabsList className="w-full justify-start overflow-x-auto scrollbar-none">
        <TabsTrigger value="api-keys">API Keys</TabsTrigger>
        <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
        <TabsTrigger value="extensions">Extensiones</TabsTrigger>
      </TabsList>
      <TabsContent value="api-keys" className="mt-4">
        <ApiKeysPanel />
      </TabsContent>
      <TabsContent value="webhooks" className="mt-4">
        <WebhooksPanel />
      </TabsContent>
      <TabsContent value="extensions" className="mt-4">
        <ExtensionsPanel />
      </TabsContent>
    </Tabs>
  )
}

function ApiKeysPanel() {
  const [keys, setKeys] = useState<ApiKeyItem[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [secretDialog, setSecretDialog] = useState<string | null>(null)
  const [name, setName] = useState("")
  const [permissions, setPermissions] = useState<Set<string>>(new Set())
  const [creating, setCreating] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)

  const fetchKeys = useCallback(async () => {
    try {
      const res = await fetch("/api/integrations/api-keys")
      if (res.ok) {
        const data = await res.json()
        setKeys(data.keys || [])
      } else {
        toast.error("No autorizado para ver API keys")
      }
    } catch {
      toast.error("Error al cargar las API keys")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchKeys() }, [fetchKeys])

  function togglePermission(p: string) {
    setPermissions((prev) => {
      const next = new Set(prev)
      if (next.has(p)) next.delete(p)
      else next.add(p)
      return next
    })
  }

  async function handleCreate() {
    if (creating) return
    if (!name.trim()) {
      toast.error("Ponle un nombre a la API key")
      return
    }
    if (permissions.size === 0) {
      toast.error("Selecciona al menos un permiso")
      return
    }
    setCreating(true)
    try {
      const res = await fetch("/api/integrations/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), permissions: [...permissions] }),
      })
      const data = await res.json()
      if (res.ok) {
        setCreateOpen(false)
        setName("")
        setPermissions(new Set())
        setSecretDialog(data.secret)
        toast.success("API key creada")
        fetchKeys()
      } else {
        toast.error(data.error || "Error al crear la API key")
      }
    } catch {
      toast.error("Error al crear la API key")
    } finally {
      setCreating(false)
    }
  }

  async function handleRotate(id: string) {
    if (busy) return
    if (!confirm("¿Rotar esta API key? El secreto anterior dejará de funcionar de inmediato.")) return
    setBusy(id)
    try {
      const res = await fetch(`/api/integrations/api-keys/${id}`, { method: "POST" })
      const data = await res.json()
      if (res.ok) {
        setSecretDialog(data.secret)
        toast.success("API key rotada")
        fetchKeys()
      } else {
        toast.error(data.error || "Error al rotar")
      }
    } catch {
      toast.error("Error al rotar la API key")
    } finally {
      setBusy(null)
    }
  }

  async function handleRevoke(id: string) {
    if (busy) return
    if (!confirm("¿Revocar esta API key? Las integraciones que la usen dejarán de funcionar.")) return
    setBusy(id)
    try {
      const res = await fetch(`/api/integrations/api-keys/${id}`, { method: "DELETE" })
      if (res.ok) {
        toast.success("API key revocada")
        fetchKeys()
      } else {
        const data = await res.json()
        toast.error(data.error || "Error al revocar")
      }
    } catch {
      toast.error("Error al revocar la API key")
    } finally {
      setBusy(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-foreground/80">Claves de la Public API</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Acceso programático a los datos de tu negocio. El secreto se muestra una sola vez al crearlo o rotarlo.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="shrink-0 gap-2">
          <Plus className="size-4" />
          Nueva API key
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>Clave</TableHead>
            <TableHead>Permisos</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Expira</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {keys.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                Aún no tienes API keys.
              </TableCell>
            </TableRow>
          ) : (
            keys.map((k) => (
              <TableRow key={k.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <KeyRound className="size-4 text-muted-foreground" />
                    <span className="text-sm font-semibold text-foreground/80">{k.name}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <code className="text-xs text-muted-foreground">{k.keyPrefix}…</code>
                </TableCell>
                <TableCell>
                  <div className="flex max-w-[220px] flex-wrap gap-1">
                    {k.permissions.slice(0, 3).map((p) => (
                      <Badge key={p} variant="outline" className="text-[10px] font-medium">
                        {p}
                      </Badge>
                    ))}
                    {k.permissions.length > 3 && (
                      <span className="text-[10px] text-muted-foreground">+{k.permissions.length - 3}</span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <StatusBadge status={k.status} />
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{fmtDate(k.expiresAt)}</TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    {k.status === "active" && (
                      <>
                        <Button variant="ghost" size="icon" className="size-8" title="Rotar secreto" disabled={busy === k.id} onClick={() => handleRotate(k.id)}>
                          {busy === k.id ? <Loader2 className="size-4 animate-spin" /> : <RotateCcw className="size-4" />}
                        </Button>
                        <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-red-400" title="Revocar" disabled={busy === k.id} onClick={() => handleRevoke(k.id)}>
                          <Trash2 className="size-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Nueva API key</DialogTitle>
            <DialogDescription>
              Define los permisos de acceso para esta clave.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input placeholder="Ej: Integración con mi ERP" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Permisos</Label>
              <PermissionPicker selected={permissions} onToggle={togglePermission} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Crear API key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {secretDialog && (
        <SecretDialog secret={secretDialog} title="Secreto de la API key" onClose={() => setSecretDialog(null)} />
      )}
    </div>
  )
}

function WebhooksPanel() {
  const [subs, setSubs] = useState<WebhookItem[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [secretDialog, setSecretDialog] = useState<string | null>(null)
  const [name, setName] = useState("")
  const [endpoint, setEndpoint] = useState("")
  const [events, setEvents] = useState<Set<string>>(new Set())
  const [creating, setCreating] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [deliveriesFor, setDeliveriesFor] = useState<string | null>(null)
  const [deliveries, setDeliveries] = useState<DeliveryItem[]>([])
  const [deliveriesLoading, setDeliveriesLoading] = useState(false)
  const [retrying, setRetrying] = useState<string | null>(null)

  const fetchSubs = useCallback(async () => {
    try {
      const res = await fetch("/api/integrations/webhooks")
      if (res.ok) {
        const data = await res.json()
        setSubs(data.subscriptions || [])
      } else {
        toast.error("No autorizado para ver los webhooks")
      }
    } catch {
      toast.error("Error al cargar los webhooks")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchSubs() }, [fetchSubs])

  function toggleEvent(t: string) {
    setEvents((prev) => {
      const next = new Set(prev)
      if (next.has(t)) next.delete(t)
      else next.add(t)
      return next
    })
  }

  async function handleCreate() {
    if (creating) return
    if (!name.trim()) {
      toast.error("Ponle un nombre al webhook")
      return
    }
    if (!endpoint.trim()) {
      toast.error("Indica la URL del endpoint")
      return
    }
    if (events.size === 0) {
      toast.error("Selecciona al menos un evento")
      return
    }
    setCreating(true)
    try {
      const res = await fetch("/api/integrations/webhooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), endpoint: endpoint.trim(), events: [...events] }),
      })
      const data = await res.json()
      if (res.ok) {
        setCreateOpen(false)
        setName("")
        setEndpoint("")
        setEvents(new Set())
        setSecretDialog(data.secret)
        toast.success("Webhook creado")
        fetchSubs()
      } else {
        toast.error(data.error || "Error al crear el webhook")
      }
    } catch {
      toast.error("Error al crear el webhook")
    } finally {
      setCreating(false)
    }
  }

  async function handleToggleStatus(sub: WebhookItem) {
    const next = sub.status === "active" ? "paused" : "active"
    if (busy) return
    setBusy(sub.id)
    try {
      const res = await fetch(`/api/integrations/webhooks/${sub.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      })
      if (res.ok) {
        toast.success(next === "active" ? "Webhook activado" : "Webhook pausado")
        fetchSubs()
      } else {
        const data = await res.json()
        toast.error(data.error || "Error al actualizar")
      }
    } catch {
      toast.error("Error al actualizar el webhook")
    } finally {
      setBusy(null)
    }
  }

  async function handleDelete(sub: WebhookItem) {
    if (busy) return
    if (!confirm(`¿Eliminar el webhook "${sub.name}"?`)) return
    setBusy(sub.id)
    try {
      const res = await fetch(`/api/integrations/webhooks/${sub.id}`, { method: "DELETE" })
      if (res.ok) {
        toast.success("Webhook eliminado")
        fetchSubs()
      } else {
        const data = await res.json()
        toast.error(data.error || "Error al eliminar")
      }
    } catch {
      toast.error("Error al eliminar el webhook")
    } finally {
      setBusy(null)
    }
  }

  async function openDeliveries(id: string) {
    setDeliveriesFor(id)
    setDeliveriesLoading(true)
    setDeliveries([])
    try {
      const res = await fetch(`/api/integrations/webhooks/${id}/deliveries`)
      if (res.ok) {
        const data = await res.json()
        setDeliveries(data.deliveries || [])
      } else {
        toast.error("Error al cargar las entregas")
      }
    } catch {
      toast.error("Error al cargar las entregas")
    } finally {
      setDeliveriesLoading(false)
    }
  }

  async function handleRetry(deliveryId: string) {
    if (retrying) return
    setRetrying(deliveryId)
    try {
      const res = await fetch(`/api/integrations/webhooks/deliveries/${deliveryId}/retry`, { method: "POST" })
      if (res.ok) {
        toast.success("Reintento programado")
        if (deliveriesFor) openDeliveries(deliveriesFor)
        fetchSubs()
      } else {
        const data = await res.json()
        toast.error(data.error || "No se pudo reintentar")
      }
    } catch {
      toast.error("Error al reintentar la entrega")
    } finally {
      setRetrying(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-foreground/80">Suscripciones de webhooks</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Recibe los eventos de tu negocio en tu servidor con firmas HMAC y reintentos automáticos.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="shrink-0 gap-2">
          <Plus className="size-4" />
          Nuevo webhook
        </Button>
      </div>

      <div className="space-y-3">
        {subs.length === 0 ? (
          <div className="rounded-xl border border-dashed py-10 text-center text-sm text-muted-foreground">
            Aún no tienes webhooks configurados.
          </div>
        ) : (
          subs.map((sub) => (
            <div key={sub.id} className="rounded-xl border p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Webhook className="size-4 text-muted-foreground" />
                    <span className="text-sm font-semibold text-foreground/80">{sub.name}</span>
                    <StatusBadge status={sub.status} />
                    {sub.status === "dead_letter" && (
                      <span className="text-[10px] font-bold text-red-500">{sub.failureCount} fallos consecutivos</span>
                    )}
                  </div>
                  <p className="mt-1 break-all font-mono text-xs text-muted-foreground">{sub.endpoint}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {parseJsonList(sub.events).length} evento(s): {parseJsonList(sub.events).slice(0, 4).join(", ")}
                    {parseJsonList(sub.events).length > 4 ? ", …" : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button variant="ghost" size="sm" className="gap-1.5 text-xs" onClick={() => openDeliveries(sub.id)}>
                    Entregas
                  </Button>
                  {sub.status !== "dead_letter" && (
                    <Button variant="ghost" size="icon" className="size-8" title={sub.status === "active" ? "Pausar" : "Activar"} disabled={busy === sub.id} onClick={() => handleToggleStatus(sub)}>
                      {sub.status === "active" ? <Pause className="size-4" /> : <Play className="size-4" />}
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-red-400" title="Eliminar" disabled={busy === sub.id} onClick={() => handleDelete(sub)}>
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Nuevo webhook</DialogTitle>
            <DialogDescription>
              Recibirás un POST firmado con cada evento seleccionado.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input placeholder="Ej: Sincronizar pedidos" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Endpoint</Label>
              <Input placeholder="https://mi-servidor.com/webhooks/panitas" value={endpoint} onChange={(e) => setEndpoint(e.target.value)} />
              <p className="text-xs text-muted-foreground">
                Se valida SSRF: no se permiten IPs privadas ni localhost.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Eventos</Label>
              <div className="max-h-64 space-y-3 overflow-y-auto rounded-lg border p-3">
                {EVENT_GROUPS.map((group) => (
                  <div key={group.label}>
                    <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{group.label}</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                      {group.types.map((t) => (
                        <label key={t} className="flex cursor-pointer items-center gap-1.5 font-mono text-xs text-foreground/80">
                          <Checkbox checked={events.has(t)} onCheckedChange={() => toggleEvent(t)} />
                          {t}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Crear webhook
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deliveriesFor} onOpenChange={(o) => !o && setDeliveriesFor(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Entregas del webhook</DialogTitle>
            <DialogDescription>
              Últimas entregas de eventos. Si una entrega está en dead letter puedes reintentarla.
            </DialogDescription>
          </DialogHeader>
          {deliveriesLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Estado</TableHead>
                  <TableHead>Intentos</TableHead>
                  <TableHead>Respuesta</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deliveries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                      Sin entregas registradas.
                    </TableCell>
                  </TableRow>
                ) : (
                  deliveries.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell><StatusBadge status={d.status} /></TableCell>
                      <TableCell className="text-xs">{d.attempts}</TableCell>
                      <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground" title={d.error || ""}>
                        {d.responseStatus || d.error || "—"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{fmtDate(d.createdAt)}</TableCell>
                      <TableCell className="text-right">
                        {(d.status === "failed" || d.status === "dead") && (
                          <Button variant="ghost" size="sm" className="gap-1.5 text-xs" disabled={retrying === d.id} onClick={() => handleRetry(d.id)}>
                            {retrying === d.id ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
                            Reintentar
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </DialogContent>
      </Dialog>

      {secretDialog && (
        <SecretDialog secret={secretDialog} title="Secreto del webhook" onClose={() => setSecretDialog(null)} />
      )}
    </div>
  )
}

function ExtensionsPanel() {
  const [exts, setExts] = useState<ExtensionItem[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [type, setType] = useState("api_integration")
  const [permissions, setPermissions] = useState<Set<string>>(new Set())
  const [creating, setCreating] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)

  const fetchExts = useCallback(async () => {
    try {
      const res = await fetch("/api/integrations/extensions")
      if (res.ok) {
        const data = await res.json()
        setExts(data.extensions || [])
      } else {
        toast.error("No autorizado para ver las extensiones")
      }
    } catch {
      toast.error("Error al cargar las extensiones")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchExts() }, [fetchExts])

  function togglePermission(p: string) {
    setPermissions((prev) => {
      const next = new Set(prev)
      if (next.has(p)) next.delete(p)
      else next.add(p)
      return next
    })
  }

  async function handleCreate() {
    if (creating) return
    if (!name.trim()) {
      toast.error("Ponle un nombre a la extensión")
      return
    }
    setCreating(true)
    try {
      const res = await fetch("/api/integrations/extensions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          type,
          permissions: [...permissions],
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setCreateOpen(false)
        setName("")
        setDescription("")
        setType("api_integration")
        setPermissions(new Set())
        toast.success("Extensión registrada")
        fetchExts()
      } else {
        toast.error(data.error || "Error al crear la extensión")
      }
    } catch {
      toast.error("Error al crear la extensión")
    } finally {
      setCreating(false)
    }
  }

  async function handleStatus(ext: ExtensionItem, next: string) {
    if (busy) return
    setBusy(ext.id)
    try {
      const res = await fetch(`/api/integrations/extensions/${ext.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      })
      if (res.ok) {
        toast.success("Extensión actualizada")
        fetchExts()
      } else {
        const data = await res.json()
        toast.error(data.error || "Error al actualizar")
      }
    } catch {
      toast.error("Error al actualizar la extensión")
    } finally {
      setBusy(null)
    }
  }

  async function handleDelete(ext: ExtensionItem) {
    if (busy) return
    if (!confirm(`¿Eliminar la extensión "${ext.name}"?`)) return
    setBusy(ext.id)
    try {
      const res = await fetch(`/api/integrations/extensions/${ext.id}`, { method: "DELETE" })
      if (res.ok) {
        toast.success("Extensión eliminada")
        fetchExts()
      } else {
        const data = await res.json()
        toast.error(data.error || "Error al eliminar")
      }
    } catch {
      toast.error("Error al eliminar la extensión")
    } finally {
      setBusy(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-foreground/80">Registro de integraciones</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Declara tus integraciones de terceros. No se ejecuta código externo: combínalas con API keys y webhooks.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="shrink-0 gap-2">
          <Plus className="size-4" />
          Nueva extensión
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Permisos</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {exts.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                Aún no tienes extensiones registradas.
              </TableCell>
            </TableRow>
          ) : (
            exts.map((ext) => (
              <TableRow key={ext.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Puzzle className="size-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-semibold text-foreground/80">{ext.name}</p>
                      {ext.description && <p className="max-w-[220px] truncate text-xs text-muted-foreground">{ext.description}</p>}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {EXTENSION_TYPES.find((t) => t.value === ext.type)?.label || ext.type}
                </TableCell>
                <TableCell>
                  <div className="flex max-w-[200px] flex-wrap gap-1">
                    {parseJsonList(ext.permissions).slice(0, 3).map((p) => (
                      <Badge key={p} variant="outline" className="text-[10px] font-medium">{p}</Badge>
                    ))}
                    {parseJsonList(ext.permissions).length > 3 && (
                      <span className="text-[10px] text-muted-foreground">+{parseJsonList(ext.permissions).length - 3}</span>
                    )}
                  </div>
                </TableCell>
                <TableCell><StatusBadge status={ext.status} /></TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    {ext.status === "active" ? (
                      <Button variant="ghost" size="sm" className="text-xs" disabled={busy === ext.id} onClick={() => handleStatus(ext, "disabled")}>
                        Desactivar
                      </Button>
                    ) : ext.status !== "revoked" ? (
                      <Button variant="ghost" size="sm" className="gap-1.5 text-xs" disabled={busy === ext.id} onClick={() => handleStatus(ext, "active")}>
                        <Check className="size-3.5" />
                        Activar
                      </Button>
                    ) : null}
                    <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-red-400" title="Eliminar" disabled={busy === ext.id} onClick={() => handleDelete(ext)}>
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Nueva extensión</DialogTitle>
            <DialogDescription>
              Registra la integración y los permisos que declararías para ella.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input placeholder="Ej: Mi ERP" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Descripción</Label>
              <Textarea placeholder="Opcional" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={type} onValueChange={(v) => v !== null && setType(v)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXTENSION_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Permisos declarados</Label>
              <PermissionPicker selected={permissions} onToggle={togglePermission} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Registrar extensión
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
