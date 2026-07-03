"use client"

import { useState, useEffect, type FormEvent } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Plus, Search, Pencil, Trash2, UserCircle, Smartphone, Link as LinkIcon, Copy, Check } from "lucide-react"
import { toast } from "sonner"

interface Seller {
  id: string
  name: string
  email: string | null
  phone: string | null
  photo: string | null
  documentId: string | null
  isActive: boolean
  commissionType: string | null
  commissionValue: number | null
}

export default function SellersPage() {
  const [sellers, setSellers] = useState<Seller[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Seller | null>(null)
  const [saving, setSaving] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  function getLoginLink() {
    if (typeof window === "undefined") return ""
    return `${window.location.origin}/seller/login`
  }

  async function copyLink(id: string) {
    try {
      await navigator.clipboard.writeText(getLoginLink())
      setCopiedId(id)
      toast.success("Enlace copiado")
      setTimeout(() => setCopiedId(null), 2000)
    } catch { toast.error("Error al copiar") }
  }
  const [form, setForm] = useState({
    name: "",
    username: "",
    password: "",
    email: "",
    phone: "",
    documentId: "",
    commissionType: "none" as "none" | "percentage" | "fixed",
    commissionValue: "",
  })

  const fetchSellers = async () => {
    try {
      const res = await fetch("/api/sellers")
      if (res.ok) setSellers(await res.json())
    } catch { toast.error("Error al cargar vendedores") }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchSellers() }, [])

  const openCreate = () => {
    setEditing(null)
    setForm({ name: "", username: "", password: "", email: "", phone: "", documentId: "", commissionType: "none", commissionValue: "" })
    setOpen(true)
  }

  const openEdit = (seller: Seller) => {
    setEditing(seller)
    setForm({
      name: seller.name,
      username: (seller as any).username || "",
      password: "",
      email: seller.email || "",
      phone: seller.phone || "",
      documentId: seller.documentId || "",
      commissionType: seller.commissionType as "none" | "percentage" | "fixed" || "none",
      commissionValue: seller.commissionValue ? String(seller.commissionValue) : "",
    })
    setOpen(true)
  }

  const handleSave = async (e: FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) return toast.error("Nombre requerido")
    if (!editing && !form.username.trim()) return toast.error("Usuario requerido")
    if (!editing && (!form.password || form.password.length < 4)) {
      return toast.error("Contraseña debe tener al menos 4 caracteres")
    }

    setSaving(true)
    try {
      const body: any = { name: form.name.trim() }
      if (!editing || form.username.trim()) body.username = form.username.trim()
      if (form.password) body.password = form.password
      if (form.email) body.email = form.email.trim()
      if (form.phone) body.phone = form.phone.trim()
      if (form.documentId) body.documentId = form.documentId.trim()
      body.commissionType = form.commissionType === "none" ? null : form.commissionType
      body.commissionValue = form.commissionValue ? Number(form.commissionValue) : null

      let res: Response
      if (editing) {
        res = await fetch(`/api/sellers/${editing.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      } else {
        res = await fetch("/api/sellers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      }
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Error") }
      toast.success(editing ? "Vendedor actualizado" : "Vendedor creado")
      setOpen(false)
      fetchSellers()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al guardar")
    } finally { setSaving(false) }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`¿Eliminar a ${name}?`)) return
    try {
      const res = await fetch(`/api/sellers/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error()
      toast.success("Vendedor eliminado")
      fetchSellers()
    } catch { toast.error("Error al eliminar") }
  }

  const filtered = sellers.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.phone?.includes(search) ||
    s.documentId?.includes(search)
  )

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between" data-tour="vendedores-title">
        <div>
          <h1 className="text-2xl font-bold text-accent">Vendedores</h1>
          <p className="text-sm text-muted-foreground">Gestiona los vendedores y sus accesos al panel de ventas</p>
        </div>
        <Button data-tour="vendedores-create" onClick={openCreate} className="rounded-xl bg-primary text-accent font-bold gap-2">
          <Plus className="size-4" /> Nuevo vendedor
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input placeholder="Buscar vendedor..." value={search} onChange={(e) => setSearch(e.target.value)}
          className="pl-9 rounded-xl border-border bg-card" />
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => (
            <Card key={i} className="rounded-2xl border-border/50 animate-pulse"><CardContent className="p-6"><div className="h-24 bg-muted rounded-xl" /></CardContent></Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="rounded-2xl border-border/50">
          <CardContent className="p-12 text-center text-muted-foreground">
            <UserCircle className="size-12 mx-auto mb-3 opacity-40" />
            <p className="font-medium">No hay vendedores registrados</p>
            <p className="text-sm">Crea tu primer vendedor para que acceda al panel de ventas</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(seller => (
            <Card key={seller.id} className="rounded-2xl border-border/50 hover:border-primary/20 transition-all">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                      {seller.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold text-accent">{seller.name}</p>
                      <p className="text-xs text-muted-foreground">{seller.documentId || "Sin documento"}</p>
                    </div>
                  </div>
                  <Badge variant={seller.isActive ? "default" : "secondary"} className="text-[10px]">
                    {seller.isActive ? "Activo" : "Inactivo"}
                  </Badge>
                </div>
                <div className="space-y-1.5 text-xs text-muted-foreground">
                  {seller.phone && (
                    <div className="flex items-center gap-1.5">
                      <Smartphone className="size-3" /> {seller.phone}
                    </div>
                  )}
                  {seller.commissionType && seller.commissionValue && (
                    <Badge variant="outline" className="text-[10px]">
                      {seller.commissionType === "percentage" ? `${seller.commissionValue}%` : `$${seller.commissionValue}`}
                    </Badge>
                  )}
                </div>
                <div className="flex gap-2 mt-4 pt-3 border-t border-border/50">
                  <Button variant="outline" size="sm" onClick={() => copyLink(seller.id)} className="rounded-lg gap-1.5 text-xs flex-1">
                    {copiedId === seller.id ? <Check className="size-3" /> : <LinkIcon className="size-3" />}
                    {copiedId === seller.id ? "Copiado" : "Enlace de acceso"}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => openEdit(seller)} className="rounded-lg gap-1.5 text-xs">
                    <Pencil className="size-3" /> Editar
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(seller.id, seller.name)}
                    className="rounded-lg text-xs text-red-500 hover:text-red-600 hover:bg-red-50 gap-1.5">
                    <Trash2 className="size-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleSave}>
            <DialogHeader>
              <DialogTitle>{editing ? "Editar vendedor" : "Nuevo vendedor"}</DialogTitle>
              <DialogDescription>
                {editing ? "Actualiza los datos del vendedor. Deja la contraseña vacía para no cambiarla." : "El vendedor usará usuario y contraseña para iniciar sesión en su panel."}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5 col-span-2">
                  <Label>Nombre *</Label>
                  <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
                </div>
                <div className="space-y-1.5">
                  <Label>Usuario *</Label>
                  <Input value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                    placeholder="usuario para iniciar sesión" />
                </div>
                <div className="space-y-1.5">
                  <Label>Contraseña {editing ? "(dejar vacío = no cambiar)" : "*"}</Label>
                  <Input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    placeholder="mín. 4 caracteres" />
                </div>
                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Teléfono</Label>
                  <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Documento (Cédula/RIF)</Label>
                  <Input value={form.documentId} onChange={e => setForm(f => ({ ...f, documentId: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Tipo comisión</Label>
                  <select value={form.commissionType} onChange={e => setForm(f => ({ ...f, commissionType: e.target.value as any }))}
                    className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-sm">
                    <option value="none">Sin comisión</option>
                    <option value="percentage">Porcentaje (%)</option>
                    <option value="fixed">Monto fijo ($)</option>
                  </select>
                </div>
                {form.commissionType !== "none" && (
                  <div className="space-y-1.5 col-span-2">
                    <Label>{form.commissionType === "percentage" ? "Porcentaje (%)" : "Monto fijo ($)"}</Label>
                    <Input type="number" step="0.01" min="0" value={form.commissionValue}
                      onChange={e => setForm(f => ({ ...f, commissionValue: e.target.value }))} />
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={saving}>{saving ? "Guardando..." : "Guardar"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
