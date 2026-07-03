"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import {
  Clock,
  DollarSign,
  Power,
  Trash2,
  Pencil,
  Plus,
  ImageIcon,
  X,
  Hourglass,
  Loader2,
  Sparkles,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import type { Service } from "@prisma/client"

type ServiceWithCategory = Service & { category: { id: string; name: string } | null }

interface AgendaItem {
  id: string
  nombre: string
}

const DURATION_OPTIONS = [
  { value: 20, label: "20 minutos" },
  { value: 30, label: "30 minutos" },
  { value: 45, label: "45 minutos" },
  { value: 60, label: "1 hora" },
  { value: 120, label: "2 horas" },
]

function durationLabel(min: number): string {
  const opt = DURATION_OPTIONS.find((o) => o.value === min)
  if (opt) return opt.label
  if (min >= 60) {
    const h = Math.floor(min / 60)
    const m = min % 60
    return m > 0 ? `${h}h ${m}min` : `${h} horas`
  }
  return `${min} minutos`
}

function ImageUpload({
  value,
  onChange,
}: {
  value: string
  onChange: (url: string) => void
}) {
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const fd = new FormData()
    fd.append("file", file)
    try {
      const res = await fetch("/api/upload", { method: "POST", body: fd })
      if (!res.ok) throw new Error()
      const data = await res.json()
      onChange(data.url)
    } catch {
      toast.error("Error al subir la imagen")
    } finally {
      setUploading(false)
    }
  }

  if (value) {
    return (
      <div className="relative rounded-xl overflow-hidden border border-border group">
        <img
          src={value}
          alt="Vista previa"
          className="w-full h-44 object-cover"
        />
        <button
          type="button"
          onClick={() => onChange("")}
          className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer hover:bg-black/80"
        >
          <X className="size-3.5" />
        </button>
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      disabled={uploading}
      className="w-full rounded-xl border-2 border-dashed border-border p-6 text-center transition-all hover:border-muted-foreground/30 hover:bg-muted/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {uploading ? (
        <Loader2 className="size-8 mx-auto animate-spin text-muted-foreground" />
      ) : (
        <ImageIcon className="size-8 mx-auto text-muted-foreground/50" />
      )}
      <p className="text-sm font-medium text-muted-foreground mt-2">
        {uploading ? "Subiendo..." : "Subir imagen"}
      </p>
      <p className="text-[10px] text-muted-foreground/60 mt-1">
        JPG, PNG, WebP · Máximo 10MB
      </p>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleUpload}
        hidden
      />
    </button>
  )
}

function ServiceModal({
  open,
  onClose,
  onSave,
  editService,
}: {
  open: boolean
  onClose: () => void
  onSave: (data: any) => Promise<void>
  editService: ServiceWithCategory | null
}) {
  const isEditing = !!editService
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [price, setPrice] = useState("")
  const [durationMin, setDurationMin] = useState(30)
  const [image, setImage] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      if (editService) {
        setName(editService.name)
        setDescription(editService.description || "")
        setPrice(editService.price.toString())
        setDurationMin(editService.durationMin)
        setImage(editService.image || "")
      } else {
        setName("")
        setDescription("")
        setPrice("")
        setDurationMin(30)
        setImage("")
      }
    }
  }, [open, editService])

  async function handleSave() {
    if (!name.trim()) {
      toast.error("El nombre del servicio es obligatorio")
      return
    }
    if (!price || parseFloat(price) < 0) {
      toast.error("Ingresa un precio válido")
      return
    }
    setSaving(true)
    try {
      await onSave({
        name: name.trim(),
        description: description.trim() || null,
        price: parseFloat(price),
        durationMin,
        image: image || null,
      })
      onClose()
    } catch {
      toast.error("Error al guardar el servicio")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg flex items-center gap-2">
            {isEditing ? (
              <>
                <Pencil className="size-4" />
                Editar servicio
              </>
            ) : (
              <>
                <Plus className="size-4" />
                Nuevo servicio
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Actualiza la información del servicio."
              : "Completa los datos para ofrecer un nuevo servicio a tus clientes."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Nombre del servicio
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Corte de cabello"
              className="h-10 w-full rounded-lg border border-border bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#102A43]/20 focus:border-[#102A43]"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Descripción{" "}
              <span className="font-normal normal-case text-muted-foreground/60">
                (opcional)
              </span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe brevemente el servicio..."
              rows={3}
              className="h-20 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#102A43]/20 focus:border-[#102A43]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Precio
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-semibold">
                  $
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0.00"
                  className="h-10 w-full rounded-lg border border-border bg-white pl-7 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#102A43]/20 focus:border-[#102A43]"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Duración
              </label>
              <select
                value={durationMin}
                onChange={(e) => setDurationMin(parseInt(e.target.value))}
                className="h-10 w-full rounded-lg border border-border bg-white px-3 text-sm appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#102A43]/20 focus:border-[#102A43]"
              >
                {DURATION_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 p-3">
            <Hourglass className="size-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800">
              Los clientes no podrán reservar en tu agenda durante el tiempo que
              dure este servicio.
            </p>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Imagen del servicio{" "}
              <span className="font-normal normal-case text-muted-foreground/60">
                (opcional)
              </span>
            </label>
            <ImageUpload value={image} onChange={setImage} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="size-4 mr-1.5 animate-spin" />
            ) : (
              <Sparkles className="size-4 mr-1.5" />
            )}
            {saving
              ? "Guardando..."
              : isEditing
                ? "Guardar cambios"
                : "Crear servicio"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function ServiciosPage() {
  const [services, setServices] = useState<ServiceWithCategory[]>([])
  const [agendas, setAgendas] = useState<AgendaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editService, setEditService] = useState<ServiceWithCategory | null>(null)

  useEffect(() => {
    Promise.all([fetchServices(), fetchAgendas()])
  }, [])

  async function fetchServices() {
    try {
      const res = await fetch("/api/services")
      if (res.ok) setServices(await res.json())
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }

  async function fetchAgendas() {
    try {
      const res = await fetch("/api/agendas")
      if (res.ok) {
        const data = await res.json()
        setAgendas(data)
      }
    } catch { /* ignore */ }
  }

  async function handleSave(data: any) {
    const agendaId = agendas[0]?.id
    if (!agendaId) {
      toast.error("No tienes una agenda configurada")
      return
    }

    if (editService) {
      const res = await fetch(`/api/services/${editService.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error()
      toast.success("Servicio actualizado")
    } else {
      const res = await fetch("/api/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, agendaId }),
      })
      if (!res.ok) throw new Error()
      toast.success("Servicio creado")
    }
    await fetchServices()
  }

  function openCreate() {
    setEditService(null)
    setModalOpen(true)
  }

  function openEdit(s: ServiceWithCategory) {
    setEditService(s)
    setModalOpen(true)
  }

  async function toggleActive(s: ServiceWithCategory) {
    await fetch(`/api/services/${s.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !s.isActive }),
    })
    fetchServices()
  }

  async function deleteService(s: ServiceWithCategory) {
    if (!confirm(`¿Eliminar "${s.name}"? Esta acción no se puede deshacer.`)) return
    const res = await fetch(`/api/services/${s.id}`, { method: "DELETE" })
    if (res.ok) {
      toast.success("Servicio eliminado")
      fetchServices()
    }
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-heading font-extrabold text-[#102A43]">
            Servicios
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gestiona los servicios que ofreces a tus clientes.
          </p>
        </div>
        <Button
          size="lg"
          className="gap-2 shadow-sm text-sm font-semibold"
          onClick={openCreate}
        >
          <Plus className="size-4" />
          Crear servicio
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Clock className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : services.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="size-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
            <ImageIcon className="size-7 text-muted-foreground/50" />
          </div>
          <h3 className="text-lg font-bold text-[#102A43] mb-1">
            No hay servicios
          </h3>
          <p className="text-sm text-muted-foreground max-w-sm mb-6">
            Crea tu primer servicio para que tus clientes puedan reservar citas
            desde la página de agenda.
          </p>
          <Button
            size="lg"
            className="gap-2 shadow-sm text-sm font-semibold"
            onClick={openCreate}
          >
            <Plus className="size-4" />
            Crear primer servicio
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {services.map((s) => (
            <div
              key={s.id}
              className="group rounded-xl border border-border bg-white overflow-hidden transition-all hover:shadow-md hover:border-muted-foreground/20"
            >
              <div className="aspect-[16/9] bg-muted/50 relative overflow-hidden">
                {s.image ? (
                  <img
                    src={s.image}
                    alt={s.name}
                    className="size-full object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center size-full">
                    <ImageIcon className="size-8 text-muted-foreground/30" />
                  </div>
                )}
                <div className="absolute top-2 right-2">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold shadow-sm ${
                      s.isActive
                        ? "bg-green-50 text-green-700 ring-1 ring-green-200"
                        : "bg-slate-100 text-slate-500 ring-1 ring-slate-200"
                    }`}
                  >
                    <span
                      className={`size-1.5 rounded-full ${
                        s.isActive ? "bg-green-500" : "bg-slate-400"
                      }`}
                    />
                    {s.isActive ? "Activo" : "Inactivo"}
                  </span>
                </div>
              </div>

              <div className="p-4">
                <h3 className="font-bold text-[#102A43] text-sm leading-tight mb-2">
                  {s.name}
                </h3>

                {s.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                    {s.description}
                  </p>
                )}

                <div className="flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1 font-semibold text-[#102A43]">
                    <DollarSign className="size-3.5 text-muted-foreground" />
                    {s.price.toFixed(2)}
                  </span>
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="size-3.5" />
                    {durationLabel(s.durationMin)}
                  </span>
                </div>

                {s.category && (
                  <div className="mt-2">
                    <span className="inline-block rounded-md bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                      {s.category.name}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between border-t border-border px-4 py-2 bg-muted/20">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className={`size-7 ${s.isActive ? "text-green-600" : "text-slate-300"}`}
                  onClick={() => toggleActive(s)}
                >
                  <Power className="size-3.5" />
                </Button>
                <div className="flex items-center gap-0.5">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="size-7 text-muted-foreground hover:text-foreground"
                    onClick={() => openEdit(s)}
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="size-7 text-red-400 hover:text-red-600 hover:bg-red-50"
                    onClick={() => deleteService(s)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ServiceModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        editService={editService}
      />
    </div>
  )
}
