"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useDebounce } from "@/hooks/use-debounce"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { ProspectForm } from "@/components/admin/prospects/prospect-form"
import { PROSPECT_STATUSES, PROSPECT_CATEGORIES, getStatusInfo } from "@/lib/crm/constants"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import {
  Search,
  Plus,
  ExternalLink,
  Pencil,
  Trash2,
  MessageCircle,
  Phone,
  Users,
} from "lucide-react"

interface Prospect {
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
}

export default function ProspectsListPage() {
  const router = useRouter()
  const [data, setData] = useState<Prospect[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [estadoFilter, setEstadoFilter] = useState("all")
  const [categoriaFilter, setCategoriaFilter] = useState("all")
  const [ciudadFilter, setCiudadFilter] = useState("")
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingProspect, setEditingProspect] = useState<Prospect | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deletingProspect, setDeletingProspect] = useState<Prospect | null>(null)
  const [deleting, setDeleting] = useState(false)

  const debouncedSearch = useDebounce(search, 300)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), limit: "20" })
    if (debouncedSearch) params.set("search", debouncedSearch)
    if (estadoFilter !== "all") params.set("estadoProspecto", estadoFilter)
    if (categoriaFilter !== "all") params.set("categoria", categoriaFilter)
    if (ciudadFilter.trim()) params.set("ciudad", ciudadFilter.trim())

    const res = await fetch(`/api/admin/prospects?${params}`)
    const json = await res.json()
    setData(json.data || [])
    setTotalPages(json.totalPages || 1)
    setLoading(false)
  }, [page, debouncedSearch, estadoFilter, categoriaFilter, ciudadFilter])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  function openEdit(p: Prospect) {
    setEditingProspect(p)
    setSheetOpen(true)
  }

  function openDelete(p: Prospect) {
    setDeletingProspect(p)
    setDeleteOpen(true)
  }

  async function handleDelete() {
    if (!deletingProspect) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/admin/prospects/${deletingProspect.id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Error al eliminar")
      toast.success("Prospecto eliminado")
      setDeleteOpen(false)
      setDeletingProspect(null)
      fetchData()
    } catch {
      toast.error("Error al eliminar prospecto")
    } finally {
      setDeleting(false)
    }
  }

  function resetFilters() {
    setSearch("")
    setEstadoFilter("all")
    setCategoriaFilter("all")
    setCiudadFilter("")
    setPage(1)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Prospectos</h1>
          <p className="text-sm text-muted-foreground">{data.length} prospectos en esta pagina</p>
        </div>
        <Link href="/admin/prospects/nuevo">
          <Button className="gap-2">
            <Plus className="size-4" />
            <span className="hidden sm:inline">Nuevo Prospecto</span>
          </Button>
        </Link>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre o propietario..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            className="pl-9"
          />
        </div>
        <Select
          value={estadoFilter}
          onValueChange={(v) => {
            setEstadoFilter(v ?? "all")
            setPage(1)
          }}
        >
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            {PROSPECT_STATUSES.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={categoriaFilter}
          onValueChange={(v) => {
            setCategoriaFilter(v ?? "all")
            setPage(1)
          }}
        >
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las categorias</SelectItem>
            {PROSPECT_CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          placeholder="Ciudad..."
          value={ciudadFilter}
          onChange={(e) => {
            setCiudadFilter(e.target.value)
            setPage(1)
          }}
          className="w-36"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[40vh] text-muted-foreground">
          Cargando...
        </div>
      ) : data.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <div className="flex flex-col items-center gap-3">
              <Users className="size-10 text-muted-foreground/40" />
              <p>No hay prospectos registrados</p>
              <Button variant="outline" onClick={resetFilters}>
                Limpiar filtros
              </Button>
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
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.map((p) => {
                      const status = getStatusInfo(p.estadoProspecto)
                      return (
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
                            <Badge className={cn("text-xs", status.color)}>
                              {status.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Link href={`/admin/prospects/${p.id}`}>
                                <Button variant="ghost" size="icon-sm">
                                  <ExternalLink className="size-4" />
                                </Button>
                              </Link>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => openEdit(p)}
                              >
                                <Pencil className="size-4" />
                              </Button>
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
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                className="text-destructive hover:text-destructive"
                                onClick={() => openDelete(p)}
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          <div className="md:hidden space-y-3">
            {data.map((p) => {
              const status = getStatusInfo(p.estadoProspecto)
              return (
                <Card key={p.id}>
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-sm">{p.nombreNegocio}</p>
                        <p className="text-xs text-muted-foreground">{p.propietario}</p>
                      </div>
                      <Badge className={cn("text-xs", status.color)}>{status.label}</Badge>
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
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                        onClick={() => openEdit(p)}
                      >
                        <Pencil className="size-3.5" /> Editar
                      </Button>
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
              )
            })}
          </div>
        </>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Anterior
          </Button>
          <span className="flex items-center px-3 text-sm text-muted-foreground">
            Pagina {page} de {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Siguiente
          </Button>
        </div>
      )}

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {editingProspect ? "Editar Prospecto" : "Nuevo Prospecto"}
            </SheetTitle>
          </SheetHeader>
          <div className="p-4">
            <ProspectForm
              initialData={editingProspect || undefined}
              onSuccess={() => {
                setSheetOpen(false)
                fetchData()
              }}
              onCancel={() => setSheetOpen(false)}
            />
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Eliminar prospecto</DialogTitle>
            <DialogDescription>
              Se eliminara <strong>{deletingProspect?.nombreNegocio}</strong> y todos sus datos
              asociados. Esta accion no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={deleting}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Eliminando..." : "Eliminar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
