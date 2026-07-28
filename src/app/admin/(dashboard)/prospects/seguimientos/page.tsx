"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import {
  MessageCircle,
  Phone,
  CheckCircle,
  Clock,
  ClipboardCheck,
} from "lucide-react"

interface PendingItem {
  prospectId: string
  prospectName: string
  tipo: string
  titulo: string
  fecha: string
  whatsapp: string | null
  telefono: string | null
  completado: boolean
  reminderId?: string
}

export default function SeguimientosPage() {
  const router = useRouter()
  const [items, setItems] = useState<PendingItem[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/prospects?limit=500")
      const json = await res.json()
      const prospects = json.data || []
      const now = new Date()

      const pending: PendingItem[] = []

      for (const p of prospects) {
        if (p.reminders) {
          for (const r of p.reminders) {
            if (!r.completado && new Date(r.fecha) <= now) {
              pending.push({
                prospectId: p.id,
                prospectName: p.nombreNegocio,
                tipo: "recordatorio",
                titulo: r.titulo,
                fecha: r.fecha,
                whatsapp: p.whatsapp,
                telefono: p.telefono,
                completado: false,
                reminderId: r.id,
              })
            }
          }
        }
        if (p.activities) {
          for (const a of p.activities) {
            if (
              (a.tipo === "seguimiento" || a.tipo === "tarea") &&
              !a.completado
            ) {
              pending.push({
                prospectId: p.id,
                prospectName: p.nombreNegocio,
                tipo: a.tipo,
                titulo: a.titulo,
                fecha: a.fecha,
                whatsapp: p.whatsapp,
                telefono: p.telefono,
                completado: false,
              })
            }
          }
        }
      }

      pending.sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())
      setItems(pending)
    } catch {
      toast.error("Error al cargar seguimientos")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  async function markCompleted(item: PendingItem) {
    if (!item.reminderId) return
    try {
      const res = await fetch(
        `/api/admin/prospects/${item.prospectId}/reminders/${item.reminderId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ completado: true }),
        }
      )
      if (!res.ok) throw new Error("Error")
      toast.success("Completado")
      setItems((prev) => prev.filter((i) => i !== item))
    } catch {
      toast.error("Error al completar seguimiento")
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-muted-foreground">
        Cargando...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Seguimientos Pendientes</h1>
          <p className="text-sm text-muted-foreground">{items.length} seguimientos pendientes</p>
        </div>
        <Badge variant="secondary" className="gap-1.5">
          <Clock className="size-3" />
          {items.length}
        </Badge>
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <div className="flex flex-col items-center gap-3">
              <CheckCircle className="size-10 text-green-500/40" />
              <p>No hay seguimientos pendientes</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="hidden md:block">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Prospecto</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Titulo</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium text-sm">
                          {item.prospectName}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs capitalize">
                            {item.tipo}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {item.titulo}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(item.fecha), "dd/MM/yyyy HH:mm", { locale: es })}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Link href={`/admin/prospects/${item.prospectId}`}>
                              <Button variant="ghost" size="icon-sm">
                                <ClipboardCheck className="size-4" />
                              </Button>
                            </Link>
                            {item.whatsapp && (
                              <a
                                href={`https://wa.me/${item.whatsapp.replace(/[^0-9]/g, "")}`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <Button variant="ghost" size="icon-sm">
                                  <MessageCircle className="size-4 text-green-600" />
                                </Button>
                              </a>
                            )}
                            {item.telefono && (
                              <a href={`tel:${item.telefono}`}>
                                <Button variant="ghost" size="icon-sm">
                                  <Phone className="size-4" />
                                </Button>
                              </a>
                            )}
                            {item.reminderId && (
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                className="text-green-600 hover:text-green-700"
                                onClick={() => markCompleted(item)}
                              >
                                <CheckCircle className="size-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          <div className="md:hidden space-y-3">
            {items.map((item, idx) => (
              <Card key={idx}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-sm">{item.prospectName}</p>
                      <p className="text-xs text-muted-foreground">{item.titulo}</p>
                    </div>
                    <Badge variant="outline" className="text-xs capitalize">
                      {item.tipo}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(item.fecha), "dd/MM/yyyy HH:mm")}
                  </p>
                  <div className="flex items-center gap-1 pt-1">
                    <Link href={`/admin/prospects/${item.prospectId}`}>
                      <Button variant="outline" size="sm" className="gap-1.5">
                        <ClipboardCheck className="size-3.5" /> Ver
                      </Button>
                    </Link>
                    {item.whatsapp && (
                      <a
                        href={`https://wa.me/${item.whatsapp.replace(/[^0-9]/g, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button variant="outline" size="sm">
                          <MessageCircle className="size-3.5 text-green-600" />
                        </Button>
                      </a>
                    )}
                    {item.telefono && (
                      <a href={`tel:${item.telefono}`}>
                        <Button variant="outline" size="sm">
                          <Phone className="size-3.5" />
                        </Button>
                      </a>
                    )}
                    {item.reminderId && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 text-green-600"
                        onClick={() => markCompleted(item)}
                      >
                        <CheckCircle className="size-3.5" /> Completar
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
