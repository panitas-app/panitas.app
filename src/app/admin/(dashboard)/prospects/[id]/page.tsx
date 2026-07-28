"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Checkbox } from "@/components/ui/checkbox"
import { ProspectForm } from "@/components/admin/prospects/prospect-form"
import { ActivityTimeline } from "@/components/admin/prospects/activity-timeline"
import { FileUploadZone } from "@/components/admin/prospects/file-upload-zone"
import { SalesScriptTab } from "@/components/admin/prospects/sales-script-tab"
import {
  PROSPECT_STATUSES,
  getStatusInfo,
  getTemperatureInfo,
} from "@/lib/crm/constants"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import {
  ArrowLeft,
  MessageCircle,
  Phone,
  Mail,
  Pencil,
  MapPin,
  Globe,
  CalendarClock,
  Loader2,
  Check,
} from "lucide-react"

interface ProspectDetail {
  id: string
  nombreNegocio: string
  propietario: string
  telefono: string | null
  whatsapp: string | null
  email: string | null
  instagram: string | null
  facebook: string | null
  paginaWeb: string | null
  ciudad: string | null
  estado: string | null
  pais: string | null
  direccion: string | null
  categoria: string
  lat: number | null
  lng: number | null
  estadoProspecto: string
  puntuacion: number
  temperatura: string
  notas: string | null
  createdAt: string
  reminders: Reminder[]
  _count: { activities: number; files: number; reminders: number; sessions: number }
}

interface Reminder {
  id: string
  titulo: string
  descripcion: string | null
  fecha: string
  completado: boolean
}

export default function ProspectDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params?.id as string

  const [prospect, setProspect] = useState<ProspectDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [editSheetOpen, setEditSheetOpen] = useState(false)
  const [reminderDialogOpen, setReminderDialogOpen] = useState(false)
  const [reminderForm, setReminderForm] = useState({ titulo: "", descripcion: "", fecha: "" })
  const [reminderSaving, setReminderSaving] = useState(false)

  const fetchProspect = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/prospects/${id}`)
      if (!res.ok) {
        router.push("/admin/prospects/lista")
        return
      }
      setProspect(await res.json())
    } catch {
      toast.error("Error al cargar prospecto")
    } finally {
      setLoading(false)
    }
  }, [id, router])

  useEffect(() => {
    fetchProspect()
  }, [fetchProspect])

  async function toggleReminder(reminder: Reminder) {
    try {
      const res = await fetch(`/api/admin/prospects/${id}/reminders/${reminder.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completado: !reminder.completado }),
      })
      if (!res.ok) throw new Error("Error")
      setProspect((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          reminders: prev.reminders.map((r) =>
            r.id === reminder.id ? { ...r, completado: !r.completado } : r
          ),
        }
      })
      toast.success(reminder.completado ? "Recordatorio reabierto" : "Recordatorio completado")
    } catch {
      toast.error("Error al actualizar recordatorio")
    }
  }

  async function createReminder() {
    if (!reminderForm.titulo.trim() || !reminderForm.fecha) {
      toast.error("Titulo y fecha son requeridos")
      return
    }
    setReminderSaving(true)
    try {
      const res = await fetch(`/api/admin/prospects/${id}/reminders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titulo: reminderForm.titulo.trim(),
          descripcion: reminderForm.descripcion.trim() || null,
          fecha: new Date(reminderForm.fecha).toISOString(),
        }),
      })
      if (!res.ok) throw new Error("Error")
      toast.success("Recordatorio creado")
      setReminderDialogOpen(false)
      setReminderForm({ titulo: "", descripcion: "", fecha: "" })
      fetchProspect()
    } catch {
      toast.error("Error al crear recordatorio")
    } finally {
      setReminderSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-muted-foreground">
        Cargando...
      </div>
    )
  }

  if (!prospect) return null

  const status = getStatusInfo(prospect.estadoProspecto)
  const temp = getTemperatureInfo(prospect.temperatura)

  const whatsappNumber = prospect.whatsapp?.replace(/[^0-9]/g, "") || ""

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3 flex-wrap">
        <Link href="/admin/prospects/lista">
          <Button variant="ghost" size="icon-sm">
            <ArrowLeft className="size-4" />
          </Button>
        </Link>
        <h1 className="text-xl font-bold">{prospect.nombreNegocio}</h1>
        <Badge className={cn("text-xs", status.color)}>{status.label}</Badge>
        <Badge className={cn("text-xs", temp.color)}>{temp.label}</Badge>
        <div className="ml-auto flex items-center gap-1">
          {whatsappNumber && (
            <a
              href={`https://wa.me/${whatsappNumber}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline" size="sm" className="gap-1.5">
                <MessageCircle className="size-3.5 text-green-600" /> WhatsApp
              </Button>
            </a>
          )}
          {prospect.telefono && (
            <a href={`tel:${prospect.telefono}`}>
              <Button variant="outline" size="sm" className="gap-1.5">
                <Phone className="size-3.5" /> Llamar
              </Button>
            </a>
          )}
          {prospect.email && (
            <a href={`mailto:${prospect.email}`}>
              <Button variant="outline" size="sm" className="gap-1.5">
                <Mail className="size-3.5" /> Email
              </Button>
            </a>
          )}
        </div>
      </div>

      <Tabs defaultValue="info">
        <TabsList variant="line" className="overflow-x-auto scrollbar-none">
          <TabsTrigger value="info">Informacion</TabsTrigger>
          <TabsTrigger value="activities">Actividades</TabsTrigger>
          <TabsTrigger value="files">Archivos</TabsTrigger>
          <TabsTrigger value="reminders">Recordatorios</TabsTrigger>
          <TabsTrigger value="sales-script">Guion de Venta</TabsTrigger>
        </TabsList>

        <TabsContent value="info">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Informacion del prospecto</CardTitle>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => setEditSheetOpen(true)}
              >
                <Pencil className="size-3.5" /> Editar
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Nombre del negocio</p>
                  <p className="font-medium">{prospect.nombreNegocio}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Propietario</p>
                  <p className="font-medium">{prospect.propietario}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Telefono</p>
                  <p className="font-medium">{prospect.telefono || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">WhatsApp</p>
                  <p className="font-medium">{prospect.whatsapp || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Email</p>
                  <p className="font-medium">{prospect.email || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Categoria</p>
                  <p className="font-medium">{prospect.categoria}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Ciudad</p>
                  <p className="font-medium">{prospect.ciudad || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Estado</p>
                  <p className="font-medium">{prospect.estado || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Pais</p>
                  <p className="font-medium">{prospect.pais || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Puntuacion</p>
                  <p className="font-medium">{prospect.puntuacion}/100</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Instagram</p>
                  <p className="font-medium">{prospect.instagram || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Facebook</p>
                  <p className="font-medium">{prospect.facebook || "—"}</p>
                </div>
                {prospect.paginaWeb && (
                  <div>
                    <p className="text-muted-foreground text-xs">Pagina web</p>
                    <a
                      href={prospect.paginaWeb}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-primary hover:underline"
                    >
                      {prospect.paginaWeb}
                    </a>
                  </div>
                )}
                {prospect.lat && prospect.lng && (
                  <div>
                    <p className="text-muted-foreground text-xs">Ubicacion</p>
                    <a
                      href={`https://www.google.com/maps?q=${prospect.lat},${prospect.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-primary hover:underline inline-flex items-center gap-1"
                    >
                      <MapPin className="size-3" /> Ver en Google Maps
                    </a>
                  </div>
                )}
                {prospect.direccion && (
                  <div className="sm:col-span-2">
                    <p className="text-muted-foreground text-xs">Direccion</p>
                    <p className="font-medium">{prospect.direccion}</p>
                  </div>
                )}
                {prospect.notas && (
                  <div className="sm:col-span-2">
                    <p className="text-muted-foreground text-xs">Notas</p>
                    <p className="font-medium whitespace-pre-wrap">{prospect.notas}</p>
                  </div>
                )}
                <div className="sm:col-span-2">
                  <p className="text-muted-foreground text-xs">Creado</p>
                  <p className="font-medium">
                    {format(new Date(prospect.createdAt), "dd/MM/yyyy 'a las' HH:mm", { locale: es })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activities">
          <Card>
            <CardContent className="pt-6">
              <ActivityTimeline prospectId={id} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="files">
          <Card>
            <CardContent className="pt-6">
              <FileUploadZone prospectId={id} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reminders">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-sm">Recordatorios</h3>
              <Button size="sm" onClick={() => setReminderDialogOpen(true)}>
                <CalendarClock className="size-3.5" /> Nuevo Recordatorio
              </Button>
            </div>

            {prospect.reminders.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  Sin recordatorios
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {prospect.reminders.map((r) => (
                  <Card key={r.id} className={cn(r.completado && "opacity-60")}>
                    <CardContent className="p-4 flex items-start gap-3">
                      <Checkbox
                        checked={r.completado}
                        onCheckedChange={() => toggleReminder(r)}
                      />
                      <div className="flex-1 min-w-0">
                        <p className={cn("text-sm font-medium", r.completado && "line-through")}>
                          {r.titulo}
                        </p>
                        {r.descripcion && (
                          <p className="text-xs text-muted-foreground mt-0.5">{r.descripcion}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(r.fecha), "dd/MM/yyyy HH:mm")}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="sales-script">
          <Card>
            <CardContent className="pt-6">
              <SalesScriptTab
                prospectId={id}
                prospect={{
                  nombreNegocio: prospect.nombreNegocio,
                  propietario: prospect.propietario,
                  categoria: prospect.categoria,
                  estadoProspecto: prospect.estadoProspecto,
                  telefono: prospect.telefono,
                  whatsapp: prospect.whatsapp,
                  email: prospect.email,
                  instagram: prospect.instagram,
                  facebook: prospect.facebook,
                  paginaWeb: prospect.paginaWeb,
                  ciudad: prospect.ciudad,
                  estado: prospect.estado,
                  direccion: prospect.direccion,
                  notas: prospect.notas,
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Sheet open={editSheetOpen} onOpenChange={setEditSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Editar Prospecto</SheetTitle>
          </SheetHeader>
          <div className="p-4">
            <ProspectForm
              initialData={prospect}
              onSuccess={() => {
                setEditSheetOpen(false)
                fetchProspect()
              }}
              onCancel={() => setEditSheetOpen(false)}
            />
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={reminderDialogOpen} onOpenChange={setReminderDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nuevo Recordatorio</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Titulo *</Label>
              <Input
                value={reminderForm.titulo}
                onChange={(e) =>
                  setReminderForm((prev) => ({ ...prev, titulo: e.target.value }))
                }
                placeholder="Ej: Llamar para seguimiento"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Descripcion</Label>
              <Textarea
                value={reminderForm.descripcion}
                onChange={(e) =>
                  setReminderForm((prev) => ({ ...prev, descripcion: e.target.value }))
                }
                placeholder="Detalles adicionales..."
                rows={2}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Fecha y hora *</Label>
              <Input
                type="datetime-local"
                value={reminderForm.fecha}
                onChange={(e) =>
                  setReminderForm((prev) => ({ ...prev, fecha: e.target.value }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setReminderDialogOpen(false)}
              disabled={reminderSaving}
            >
              Cancelar
            </Button>
            <Button onClick={createReminder} disabled={reminderSaving}>
              {reminderSaving && <Loader2 className="size-4 animate-spin mr-1.5" />}
              Crear Recordatorio
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
