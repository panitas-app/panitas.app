"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ACTIVITY_TYPES } from "@/lib/crm/constants"
import { toast } from "sonner"
import { format, formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"
import {
  MapPin,
  Phone,
  Clock,
  FileText,
  CheckSquare,
  RefreshCw,
  Plus,
  Loader2,
  CalendarClock,
  Timer,
} from "lucide-react"

interface Activity {
  id: string
  tipo: string
  titulo: string
  descripcion: string | null
  fecha: string
  duracionMin: number | null
  fechaProx: string | null
  completado: boolean
  createdAt: string
}

interface ActivityTimelineProps {
  prospectId: string
}

const ACTIVITY_ICONS: Record<string, React.ElementType> = {
  visita: MapPin,
  llamada: Phone,
  seguimiento: Clock,
  nota: FileText,
  tarea: CheckSquare,
  estado: RefreshCw,
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i]
}

export function ActivityTimeline({ prospectId }: ActivityTimelineProps) {
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [form, setForm] = useState({
    tipo: "",
    titulo: "",
    descripcion: "",
    fecha: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    duracionMin: "",
    fechaProx: "",
  })

  const fetchActivities = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/prospects/${prospectId}/activities`)
      if (!res.ok) throw new Error("Error al cargar")
      setActivities(await res.json())
    } catch {
      toast.error("Error al cargar actividades")
    } finally {
      setLoading(false)
    }
  }, [prospectId])

  useEffect(() => {
    fetchActivities()
  }, [fetchActivities])

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!form.tipo || !form.titulo.trim()) {
      toast.error("Tipo y título son requeridos")
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch(`/api/admin/prospects/${prospectId}/activities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo: form.tipo,
          titulo: form.titulo.trim(),
          descripcion: form.descripcion.trim() || null,
          fecha: new Date(form.fecha).toISOString(),
          duracionMin: form.duracionMin ? parseInt(form.duracionMin) : null,
          fechaProx: form.fechaProx ? new Date(form.fechaProx).toISOString() : null,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Error al crear")
      }

      toast.success("Actividad registrada")
      setDialogOpen(false)
      setForm({
        tipo: "",
        titulo: "",
        descripcion: "",
        fecha: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
        duracionMin: "",
        fechaProx: "",
      })
      fetchActivities()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error inesperado")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-heading text-sm font-medium">Actividades</h3>
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="size-3.5" />
          Agregar
        </Button>
      </div>

      {activities.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <div className="rounded-full bg-muted p-3 mb-3">
            <Clock className="size-5 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">Sin actividades registradas</p>
        </div>
      ) : (
        <div className="relative space-y-0">
          <div className="absolute left-[15px] top-0 bottom-0 w-px bg-border" />
          {activities.map((activity) => {
            const Icon = ACTIVITY_ICONS[activity.tipo] || Clock
            return (
              <div key={activity.id} className="relative flex gap-3 pb-5 last:pb-0">
                <div className="relative z-10 flex size-[30px] shrink-0 items-center justify-center rounded-full bg-background ring-2 ring-border">
                  <Icon className="size-3.5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0 pt-0.5">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium leading-none">{activity.titulo}</p>
                    {activity.completado && (
                      <Badge variant="secondary" className="shrink-0 text-[10px]">
                        Completado
                      </Badge>
                    )}
                  </div>
                  {activity.descripcion && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {activity.descripcion}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(activity.fecha), "dd/MM/yyyy HH:mm")}
                    </span>
                    {activity.tipo === "llamada" && activity.duracionMin && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Timer className="size-3" />
                        {activity.duracionMin} min
                      </span>
                    )}
                    {activity.fechaProx && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <CalendarClock className="size-3" />
                        Próximo: {format(new Date(activity.fechaProx), "dd/MM/yyyy")}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nueva actividad</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Tipo *</Label>
                <Select value={form.tipo || undefined} onValueChange={(val) => updateField("tipo", val ?? "")}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    {ACTIVITY_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Título *</Label>
                <Input
                  value={form.titulo}
                  onChange={(e) => updateField("titulo", e.target.value)}
                  placeholder="Ej: Visita de rutina"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label>Fecha</Label>
                <Input
                  type="datetime-local"
                  value={form.fecha}
                  onChange={(e) => updateField("fecha", e.target.value)}
                />
              </div>

              {form.tipo === "llamada" && (
                <div className="space-y-1.5">
                  <Label>Duración (min)</Label>
                  <Input
                    type="number"
                    min="1"
                    value={form.duracionMin}
                    onChange={(e) => updateField("duracionMin", e.target.value)}
                    placeholder="30"
                  />
                </div>
              )}

              {(form.tipo === "seguimiento" || form.tipo === "tarea") && (
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Fecha próximo seguimiento</Label>
                  <Input
                    type="date"
                    value={form.fechaProx}
                    onChange={(e) => updateField("fechaProx", e.target.value)}
                  />
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Descripción</Label>
              <Textarea
                value={form.descripcion}
                onChange={(e) => updateField("descripcion", e.target.value)}
                placeholder="Detalles adicionales..."
                rows={3}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={submitting}>
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="size-4 animate-spin" />}
                Guardar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
