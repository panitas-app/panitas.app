"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { Search, Download } from "lucide-react"
import { toast } from "sonner"

interface AuditItem {
  id: string
  action: string
  entity: string
  entityId: string | null
  metadata: string | null
  userId: string | null
  storeId: string | null
  createdAt: string
}

export default function AdminAuditPage() {
  const [data, setData] = useState<AuditItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page) })
    if (search) params.set("action", search)
    const res = await fetch(`/api/admin/audit?${params}`)
    const json = await res.json()
    setData(json.data || [])
    setTotalPages(json.totalPages || 1)
    setLoading(false)
  }, [page, search])

  useEffect(() => { fetchData() }, [fetchData])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Auditoría</h1>
          <p className="text-sm text-muted-foreground">Registro de todas las acciones del sistema</p>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input placeholder="Buscar por acción..." value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }} className="pl-9" />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Acción</TableHead>
                <TableHead>Entidad</TableHead>
                <TableHead>ID</TableHead>
                <TableHead>Metadata</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Cargando...</TableCell></TableRow>
              ) : data.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Sin resultados</TableCell></TableRow>
              ) : (
                data.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {format(new Date(log.createdAt), "dd/MM/yyyy HH:mm")}
                    </TableCell>
                    <TableCell><span className="font-mono text-xs">{log.action}</span></TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{log.entity}</Badge></TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">{log.entityId?.slice(0, 12) || "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-xs truncate">{log.metadata || "—"}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Button key={p} variant={p === page ? "default" : "outline"} size="sm" onClick={() => setPage(p)}>{p}</Button>
          ))}
        </div>
      )}
    </div>
  )
}
