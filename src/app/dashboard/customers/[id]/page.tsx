"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { LoadingState } from "@/components/ui/loading-state"
import { EmptyState } from "@/components/ui/empty-state"
import {
  ArrowLeft, Phone, Mail, MapPin, ShoppingBag, DollarSign, Calendar,
  Hash, FileText, Plus, MessageCircle, CheckCircle, Clock, MessageCircleQuestion, HandCoins,
} from "lucide-react"
import { toast } from "sonner"

type Customer = {
  id: string
  name: string
  phone: string
  email: string | null
  address: string | null
  city: string | null
  state: string | null
  documentId: string | null
  totalSpent: number
  totalOrders: number
  lastPurchaseAt: string | null
  createdAt: string
  creditBalance: number
  activeCredits: number
  orders: Order[]
}

type Order = {
  id: string
  orderNumber: string
  status: string
  total: number
  createdAt: string
}

type CustomerNote = { id: string; content: string; createdAt: string }
type FollowUp = { id: string; type: string; status: string; dueDate: string | null; notes: string | null }

const ORDER_STATUS: Record<string, { label: string; badge: string }> = {
  pending: { label: "Pendiente", badge: "bg-warning-soft text-warning border-warning/30" },
  confirmed: { label: "Confirmado", badge: "bg-success-soft text-success border-success/30" },
  preparing: { label: "Preparando", badge: "bg-info-soft text-info border-info/30" },
  shipped: { label: "Enviado", badge: "bg-primary/10 text-primary border-primary/30" },
  delivered: { label: "Entregado", badge: "bg-muted text-muted-foreground border-border" },
  cancelled: { label: "Cancelado", badge: "bg-destructive-soft text-destructive border-destructive/30" },
}

const FOLLOW_UP_TYPES = [
  { value: "call", label: "Llamada" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "visit", label: "Visita" },
  { value: "email", label: "Email" },
]

const FOLLOW_UP_TYPE_LABEL: Record<string, string> = {
  call: "Llamada",
  whatsapp: "WhatsApp",
  visit: "Visita",
  email: "Email",
}

function money(n: number): string {
  return "$" + n.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function dateOnly(d: string | null | Date): string {
  if (!d) return "—"
  return new Date(d).toLocaleDateString("es-VE", { day: "2-digit", month: "short", year: "numeric" })
}

function daysFromNow(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString()
}

export default function CustomerDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [notes, setNotes] = useState<CustomerNote[]>([])
  const [followUps, setFollowUps] = useState<FollowUp[]>([])
  const [loading, setLoading] = useState(true)
  const [newNote, setNewNote] = useState("")
  const [addingNote, setAddingNote] = useState(false)
  const [addingFollowUp, setAddingFollowUp] = useState(false)
  const [followUpType, setFollowUpType] = useState("call")
  const [followUpDue, setFollowUpDue] = useState(daysFromNow(7).slice(0, 10))
  const [followUpNotes, setFollowUpNotes] = useState("")

  useEffect(() => {
    async function load() {
      try {
        const [cRes, nRes, fRes] = await Promise.all([
          fetch(`/api/customers/${id}`),
          fetch(`/api/crm/notes?customerId=${id}`),
          fetch(`/api/crm/follow-ups?customerId=${id}`),
        ])
        if (cRes.ok) setCustomer(await cRes.json())
        if (nRes.ok) {
          const data = await nRes.json()
          setNotes(Array.isArray(data) ? data : data.data || [])
        }
        if (fRes.ok) {
          const data = await fRes.json()
          setFollowUps(Array.isArray(data) ? data : data.data || [])
        }
      } catch (e) { console.error("[unhandled error]", e) } finally { setLoading(false) }
    }
    load()
  }, [id])

  async function addNote() {
    if (!newNote.trim()) return
    const res = await fetch("/api/crm/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: newNote.trim(), customerId: id }),
    })
    if (res.ok) {
      const note = await res.json()
      setNotes((prev) => [note, ...prev])
      setNewNote("")
      setAddingNote(false)
      toast.success("Nota agregada")
    } else {
      toast.error("No se pudo agregar la nota")
    }
  }

  async function addFollowUp() {
    if (!followUpNotes.trim()) return
    const res = await fetch("/api/crm/follow-ups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        notes: followUpNotes.trim(),
        customerId: id,
        type: followUpType,
        dueDate: followUpDue ? new Date(`${followUpDue}T12:00:00`).toISOString() : null,
      }),
    })
    if (res.ok) {
      const fu = await res.json()
      setFollowUps((prev) => [fu, ...prev])
      setFollowUpNotes("")
      setAddingFollowUp(false)
      toast.success("Seguimiento creado")
    } else {
      toast.error("No se pudo crear el seguimiento")
    }
  }

  async function completeFollowUp(fuId: string) {
    const res = await fetch(`/api/crm/follow-ups/${fuId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "completed" }),
    })
    if (res.ok) {
      setFollowUps((prev) => prev.map((f) => f.id === fuId ? { ...f, status: "completed" } : f))
      toast.success("Seguimiento completado")
    }
  }

  if (loading) return <LoadingState message="Cargando cliente..." />
  if (!customer) return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <p className="text-muted-foreground">Cliente no encontrado</p>
      <Button variant="outline" onClick={() => router.back()}>Volver</Button>
    </div>
  )

  const waLink = customer.phone
    ? `https://wa.me/${customer.phone.replace(/\D/g, "")}?text=${encodeURIComponent(`Hola ${customer.name}, te saluda tu tienda.`)}`
    : null

  const pending = customer.creditBalance > 0

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header + acciones */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="icon" onClick={() => router.back()} aria-label="Volver">
            <ArrowLeft className="size-4" />
          </Button>
          <div className="min-w-0">
            <h1 className="font-heading text-xl font-bold text-foreground truncate">{customer.name}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              {customer.documentId && <span className="text-xs text-muted-foreground font-semibold">{customer.documentId}</span>}
              {pending && (
                <Badge variant="outline" className="bg-warning-soft text-warning border-warning/30 text-[9px] font-bold uppercase tracking-wider">
                  Con saldo pendiente
                </Badge>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/dashboard/assistant?q=${encodeURIComponent(`Resume el historial y saldo de ${customer.name}`)}`}>
            <Button variant="outline" size="sm" className="gap-1.5">
              <MessageCircleQuestion className="size-3.5" /> Preguntar a Panitas
            </Button>
          </Link>
          {waLink && (
            <a href={waLink} target="_blank" rel="noopener noreferrer">
              <Button size="sm" className="gap-1.5">
                <MessageCircle className="size-3.5" /> Contactar por WhatsApp
              </Button>
            </a>
          )}
        </div>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card>
          <CardContent className="flex flex-col items-center gap-1 py-5">
            <ShoppingBag className="size-5 text-primary" />
            <span className="text-2xl font-black text-accent">{customer.totalOrders}</span>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Órdenes</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col items-center gap-1 py-5">
            <DollarSign className="size-5 text-success" />
            <span className="text-2xl font-black text-accent">{money(customer.totalSpent)}</span>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Total gastado</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col items-center gap-1 py-5">
            <HandCoins className={`size-5 ${pending ? "text-warning" : "text-success"}`} />
            <span className={`text-2xl font-black ${pending ? "text-warning" : "text-success"}`}>{money(customer.creditBalance)}</span>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              {customer.activeCredits > 0 ? `${customer.activeCredits} crédito${customer.activeCredits === 1 ? "" : "s"} activo${customer.activeCredits === 1 ? "" : "s"}` : "Saldo pendiente"}
            </span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col items-center gap-1 py-5">
            <Calendar className="size-5 text-info" />
            <span className="text-sm font-black text-accent text-center leading-tight">{dateOnly(customer.lastPurchaseAt)}</span>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Última compra</span>
          </CardContent>
        </Card>
      </div>

      {pending && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-warning/30 bg-warning-soft/60 px-4 py-3">
          <p className="text-sm text-foreground">
            Este cliente tiene <strong className="text-warning">{money(customer.creditBalance)}</strong> pendiente por cobrar.
          </p>
          <Link href="/dashboard/creditos">
            <Button variant="outline" size="sm" className="gap-1.5 shrink-0">
              <HandCoins className="size-3.5" /> Ir a Créditos
            </Button>
          </Link>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        {/* Información */}
        <Card className="md:col-span-1">
          <CardHeader><CardTitle className="text-sm font-bold">Información</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <Phone className="size-4 text-muted-foreground" />
              <a href={`tel:${customer.phone}`} className="text-primary hover:underline font-medium">{customer.phone}</a>
            </div>
            {customer.email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="size-4 text-muted-foreground" />
                <a href={`mailto:${customer.email}`} className="text-primary hover:underline font-medium truncate">{customer.email}</a>
              </div>
            )}
            {(customer.address || customer.city || customer.state) && (
              <div className="flex items-start gap-2 text-sm">
                <MapPin className="size-4 text-muted-foreground mt-0.5" />
                <span className="text-foreground">{[customer.address, customer.city, customer.state].filter(Boolean).join(", ")}</span>
              </div>
            )}
            <Separator />
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="size-4 text-muted-foreground" />
              <span className="text-muted-foreground">Cliente desde {dateOnly(customer.createdAt)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Actividad */}
        <div className="md:col-span-2">
          <Tabs defaultValue="orders">
            <TabsList className="w-full">
              <TabsTrigger value="orders">Órdenes ({customer.orders.length})</TabsTrigger>
              <TabsTrigger value="notes">Notas ({notes.length})</TabsTrigger>
              <TabsTrigger value="followups">Seguimientos ({followUps.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="orders" className="mt-4">
              <Card>
                <CardContent className="p-0">
                  {customer.orders.length === 0 ? (
                    <EmptyState icon={ShoppingBag} title="Sin órdenes registradas" description="Las órdenes de este cliente aparecerán aquí." />
                  ) : (
                    <div className="divide-y divide-border">
                      {customer.orders.map((o) => {
                        const st = ORDER_STATUS[o.status] || { label: o.status, badge: "bg-muted text-muted-foreground border-border" }
                        return (
                          <Link key={o.id} href={`/dashboard/orders/${o.id}`} className="flex items-center justify-between px-4 py-4 transition-colors hover:bg-muted/50">
                            <div className="flex items-center gap-4 min-w-0">
                              <Hash className="size-4 text-muted-foreground" />
                              <div className="min-w-0">
                                <span className="text-sm font-bold text-foreground">{o.orderNumber}</span>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-xs text-muted-foreground">{dateOnly(o.createdAt)}</span>
                                  <Badge variant="outline" className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0 border ${st.badge}`}>
                                    {st.label}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                            <span className="font-black text-accent">{money(o.total)}</span>
                          </Link>
                        )
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="notes" className="mt-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <FileText className="size-4" /> Notas
                  </CardTitle>
                  <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={() => setAddingNote(!addingNote)}>
                    <Plus className="size-3" /> Agregar
                  </Button>
                </CardHeader>
                <CardContent className="space-y-3">
                  {addingNote && (
                    <div className="space-y-2">
                      <Textarea value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder="Escribe una nota..." rows={2} className="text-sm" />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={addNote}>Guardar</Button>
                        <Button variant="ghost" size="sm" onClick={() => { setAddingNote(false); setNewNote("") }}>Cancelar</Button>
                      </div>
                    </div>
                  )}
                  {notes.length === 0 && !addingNote ? (
                    <p className="text-sm text-muted-foreground">Sin notas registradas.</p>
                  ) : (
                    notes.map((n) => (
                      <div key={n.id} className="rounded-lg bg-muted/30 p-3">
                        <p className="text-sm text-foreground">{n.content}</p>
                        <p className="text-[10px] text-muted-foreground mt-1">{dateOnly(n.createdAt)}</p>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="followups" className="mt-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <MessageCircle className="size-4" /> Seguimientos
                  </CardTitle>
                  <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={() => setAddingFollowUp(!addingFollowUp)}>
                    <Plus className="size-3" /> Crear
                  </Button>
                </CardHeader>
                <CardContent className="space-y-3">
                  {addingFollowUp && (
                    <div className="space-y-2 rounded-lg border border-border p-3">
                      <div className="grid grid-cols-2 gap-2">
                        <Select value={followUpType} onValueChange={(v) => v !== null && setFollowUpType(v)}>
                          <SelectTrigger size="sm" aria-label="Tipo de seguimiento">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {FOLLOW_UP_TYPES.map((t) => (
                              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input type="date" value={followUpDue} onChange={(e) => setFollowUpDue(e.target.value)} aria-label="Fecha de vencimiento" />
                      </div>
                      <Textarea value={followUpNotes} onChange={(e) => setFollowUpNotes(e.target.value)} placeholder="Describe el seguimiento..." rows={2} className="text-sm" />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={addFollowUp}>Guardar</Button>
                        <Button variant="ghost" size="sm" onClick={() => { setAddingFollowUp(false); setFollowUpNotes("") }}>Cancelar</Button>
                      </div>
                    </div>
                  )}
                  {followUps.length === 0 && !addingFollowUp ? (
                    <p className="text-sm text-muted-foreground">Sin seguimientos registrados.</p>
                  ) : (
                    followUps.map((fu) => (
                      <div key={fu.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                        <div className="flex items-center gap-3 min-w-0">
                          {fu.status === "completed" ? (
                            <CheckCircle className="size-4 text-success shrink-0" />
                          ) : (
                            <Clock className="size-4 text-warning shrink-0" />
                          )}
                          <div className="min-w-0">
                            <p className="text-sm text-foreground truncate">{fu.notes || "Seguimiento"}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {FOLLOW_UP_TYPE_LABEL[fu.type] || fu.type} · {fu.dueDate ? dateOnly(fu.dueDate) : "Sin fecha"}
                              {fu.status === "completed" ? " · Completado" : ""}
                            </p>
                          </div>
                        </div>
                        {fu.status === "pending" && (
                          <Button variant="ghost" size="sm" className="text-xs text-success shrink-0" onClick={() => completeFollowUp(fu.id)}>
                            Completar
                          </Button>
                        )}
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
