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
import { Trophy, ExternalLink, MessageCircle, Phone } from "lucide-react"

interface Prospect {
  id: string
  nombreNegocio: string
  propietario: string
  telefono: string | null
  whatsapp: string | null
  email: string | null
  ciudad: string | null
  categoria: string
  estadoProspecto: string
  puntuacion: number
  temperatura: string
  createdAt: string
}

export default function GanadosPage() {
  const router = useRouter()
  const [data, setData] = useState<Prospect[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/prospects?estadoProspecto=ganado&limit=500")
      const json = await res.json()
      setData(json.data || [])
    } catch {
      toast.error("Error al cargar datos")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

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
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Trophy className="size-6 text-green-600" />
            Clientes Ganados
          </h1>
          <p className="text-sm text-muted-foreground">{data.length} clientes convertidos</p>
        </div>
        <Badge variant="secondary" className="gap-1.5 bg-green-100 text-green-700">
          <Trophy className="size-3" />
          {data.length}
        </Badge>
      </div>

      {data.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <div className="flex flex-col items-center gap-3">
              <Trophy className="size-10 text-muted-foreground/40" />
              <p>No hay clientes ganados aun</p>
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
                      <TableHead>Nombre</TableHead>
                      <TableHead>Propietario</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Ciudad</TableHead>
                      <TableHead>Puntuacion</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium text-sm">
                          {p.nombreNegocio}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {p.propietario}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {p.categoria}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {p.ciudad || "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="font-mono text-xs">
                            {p.puntuacion}/100
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Link href={`/admin/prospects/${p.id}`}>
                              <Button variant="ghost" size="icon-sm">
                                <ExternalLink className="size-4" />
                              </Button>
                            </Link>
                            {p.whatsapp && (
                              <a
                                href={`https://wa.me/${p.whatsapp.replace(/[^0-9]/g, "")}`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <Button variant="ghost" size="icon-sm">
                                  <MessageCircle className="size-4 text-green-600" />
                                </Button>
                              </a>
                            )}
                            {p.telefono && (
                              <a href={`tel:${p.telefono}`}>
                                <Button variant="ghost" size="icon-sm">
                                  <Phone className="size-4" />
                                </Button>
                              </a>
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
            {data.map((p) => (
              <Card key={p.id}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-sm">{p.nombreNegocio}</p>
                      <p className="text-xs text-muted-foreground">{p.propietario}</p>
                    </div>
                    <Badge variant="secondary" className="font-mono text-xs">
                      {p.puntuacion}/100
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{p.categoria}</span>
                    {p.ciudad && (
                      <>
                        <span>·</span>
                        <span>{p.ciudad}</span>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-1 pt-1">
                    <Link href={`/admin/prospects/${p.id}`}>
                      <Button variant="outline" size="sm" className="gap-1.5">
                        <ExternalLink className="size-3.5" /> Ver
                      </Button>
                    </Link>
                    {p.whatsapp && (
                      <a
                        href={`https://wa.me/${p.whatsapp.replace(/[^0-9]/g, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button variant="outline" size="sm">
                          <MessageCircle className="size-3.5 text-green-600" />
                        </Button>
                      </a>
                    )}
                    {p.telefono && (
                      <a href={`tel:${p.telefono}`}>
                        <Button variant="outline" size="sm">
                          <Phone className="size-3.5" />
                        </Button>
                      </a>
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
