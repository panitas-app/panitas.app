"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, Phone, Mail, MapPin, ShoppingBag, DollarSign, Calendar, Hash, FileText, Plus, MessageCircle, CheckCircle, Clock, Tag } from "lucide-react"
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
  notes: string | null
  totalSpent: number
  totalOrders: number
  lastPurchaseAt: string | null
  createdAt: string
  orders: Order[]
}

type Order = {
  id: string
  orderNumber: string
  status: string
  total: number
  createdAt: string
  items: { product: { name: string } }[]
  payments: { status: string; method: string }[]
}

type CustomerNote = { id: string; content: string; createdAt: string; createdBy?: string }
type FollowUp = { id: string; type: string; status: string; dueDate: string | null; notes: string | null }

const statusBadge: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700 border-amber-200",
  confirmed: "bg-emerald-100 text-emerald-700 border-emerald-200",
  preparing: "bg-blue-100 text-blue-700 border-blue-200",
  shipped: "bg-purple-100 text-purple-700 border-purple-200",
  delivered: "bg-teal-100 text-teal-700 border-teal-200",
  cancelled: "bg-rose-100 text-rose-700 border-rose-200",
}

export default function CustomerDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [notes, setNotes] = useState<CustomerNote[]>([])
  const [followUps, setFollowUps] = useState<FollowUp[]>([])
  const [loading, setLoading] = useState(true)
  const [newNote, setNewNote] = useState("")
  const [newFollowUp, setNewFollowUp] = useState("")
  const [addingNote, setAddingNote] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const [cRes, nRes, fRes] = await Promise.all([
          fetch(`/api/customers/${id}`),
          fetch(`/api/crm/notes?customerId=${id}`),
          fetch(`/api/crm/follow-ups?customerId=${id}`),
        ])
        if (cRes.ok) setCustomer(await cRes.json())
        if (nRes.ok) setNotes(await nRes.json())
        if (fRes.ok) setFollowUps(await fRes.json())
      } catch {} finally { setLoading(false) }
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
    }
  }

  async function addFollowUp() {
    if (!newFollowUp.trim()) return
    const res = await fetch("/api/crm/follow-ups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes: newFollowUp.trim(), customerId: id, type: "call", dueDate: new Date(Date.now() + 7 * 86400000).toISOString() }),
    })
    if (res.ok) {
      const fu = await res.json()
      setFollowUps((prev) => [fu, ...prev])
      setNewFollowUp("")
      toast.success("Seguimiento creado")
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

  if (loading) return <div className="flex items-center justify-center py-20 text-sm text-slate-400">Cargando...</div>
  if (!customer) return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <p className="text-slate-500">Cliente no encontrado</p>
      <Button variant="outline" onClick={() => router.back()}>Volver</Button>
    </div>
  )

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="size-4" />
        </Button>
        <div>
          <h1 className="font-heading text-xl font-bold text-accent">{customer.name}</h1>
          {customer.documentId && <p className="text-xs text-slate-400 font-semibold">{customer.documentId}</p>}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-1">
          <CardHeader><CardTitle className="text-sm font-bold">Información</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <Phone className="size-4 text-slate-400" />
              <a href={`tel:${customer.phone}`} className="text-primary hover:underline font-medium">{customer.phone}</a>
            </div>
            {customer.email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="size-4 text-slate-400" />
                <a href={`mailto:${customer.email}`} className="text-primary hover:underline font-medium">{customer.email}</a>
              </div>
            )}
            {(customer.address || customer.city || customer.state) && (
              <div className="flex items-start gap-2 text-sm">
                <MapPin className="size-4 text-slate-400 mt-0.5" />
                <span className="text-slate-700">{[customer.address, customer.city, customer.state].filter(Boolean).join(", ")}</span>
              </div>
            )}
            <Separator />
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="size-4 text-slate-400" />
              <span className="text-slate-500">Cliente desde {new Date(customer.createdAt).toLocaleDateString("es-ES")}</span>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-3 gap-3 md:col-span-2">
          <Card>
            <CardContent className="flex flex-col items-center gap-1 py-5">
              <ShoppingBag className="size-5 text-primary" />
              <span className="text-2xl font-black text-accent">{customer.totalOrders}</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Órdenes</span>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex flex-col items-center gap-1 py-5">
              <DollarSign className="size-5 text-emerald-500" />
              <span className="text-2xl font-black text-accent">${customer.totalSpent.toFixed(0)}</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Gastado</span>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex flex-col items-center gap-1 py-5">
              <Calendar className="size-5 text-amber-500" />
              <span className="text-sm font-black text-accent text-center leading-tight">
                {customer.lastPurchaseAt ? new Date(customer.lastPurchaseAt).toLocaleDateString("es-ES") : "—"}
              </span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Última compra</span>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* CRM: Notes */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <FileText className="size-4" /> Notas ({notes.length})
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
            <p className="text-sm text-slate-400">Sin notas registradas.</p>
          ) : (
            notes.map((n) => (
              <div key={n.id} className="rounded-lg bg-muted/30 p-3">
                <p className="text-sm text-slate-700">{n.content}</p>
                <p className="text-[10px] text-slate-400 mt-1">{new Date(n.createdAt).toLocaleDateString("es-ES")}</p>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* CRM: Follow-ups */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <MessageCircle className="size-4" /> Seguimientos ({followUps.length})
          </CardTitle>
          <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={addFollowUp}>
            <Plus className="size-3" /> Crear
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {followUps.length === 0 ? (
            <p className="text-sm text-slate-400">Sin seguimientos pendientes.</p>
          ) : (
            followUps.map((fu) => (
              <div key={fu.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                <div className="flex items-center gap-3">
                  {fu.status === "completed" ? (
                    <CheckCircle className="size-4 text-green-500" />
                  ) : (
                    <Clock className="size-4 text-amber-500" />
                  )}
                  <div>
                    <p className="text-sm text-slate-700">{fu.notes || "Seguimiento"}</p>
                    <p className="text-[10px] text-slate-400">
                      {fu.type} · {fu.dueDate ? new Date(fu.dueDate).toLocaleDateString("es-ES") : "Sin fecha"}
                    </p>
                  </div>
                </div>
                {fu.status === "pending" && (
                  <Button variant="ghost" size="sm" className="text-xs text-green-600" onClick={() => completeFollowUp(fu.id)}>
                    Completar
                  </Button>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Order history */}
      <Card>
        <CardHeader><CardTitle className="text-sm font-bold">Historial de órdenes ({customer.orders.length})</CardTitle></CardHeader>
        <CardContent className="p-0">
          {customer.orders.length === 0 ? (
            <p className="px-6 pb-6 text-sm text-slate-400">Sin órdenes registradas.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {customer.orders.map((o) => (
                <Link key={o.id} href={`/dashboard/orders/${o.id}`} className="flex items-center justify-between px-6 py-4 transition-colors hover:bg-slate-50/50">
                  <div className="flex items-center gap-4">
                    <Hash className="size-4 text-slate-300" />
                    <div>
                      <span className="text-sm font-bold text-accent">{o.orderNumber}</span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-slate-400">{new Date(o.createdAt).toLocaleDateString("es-ES")}</span>
                        <Badge variant="outline" className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0 border ${statusBadge[o.status] || ""}`}>
                          {o.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <span className="font-black text-accent">${o.total.toFixed(2)}</span>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
