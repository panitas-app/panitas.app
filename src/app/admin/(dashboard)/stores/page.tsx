"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Search, ExternalLink, Eye } from "lucide-react"
import { cn } from "@/lib/utils"

interface StoreItem {
  id: string
  name: string
  slug: string
  plan: string
  isActive: boolean
  createdAt: string
  email: string | null
  phone: string | null
  _count: { products: number; orders: number; members: number }
}

const planColors: Record<string, string> = { basico: "bg-slate-100 text-slate-700", negocio: "bg-blue-100 text-blue-700", empresarial: "bg-amber-100 text-amber-700" }

export default function AdminStoresPage() {
  const [data, setData] = useState<StoreItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  const fetchData = useCallback(async () => {
    setLoading(true)
    const res = await fetch("/api/admin/stores")
    const json = await res.json()
    setData(json.data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const filtered = search
    ? data.filter((s) => s.name.toLowerCase().includes(search.toLowerCase()) || s.slug.toLowerCase().includes(search.toLowerCase()))
    : data

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tiendas</h1>
          <p className="text-sm text-muted-foreground">{data.length} tiendas registradas</p>
        </div>
      </div>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input placeholder="Buscar tienda..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 max-w-sm" />
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tienda</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Productos</TableHead>
                <TableHead>Órdenes</TableHead>
                <TableHead>Miembros</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Registro</TableHead>
                <TableHead className="text-right">Acción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Cargando...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Sin resultados</TableCell></TableRow>
              ) : (
                filtered.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{s.name}</p>
                        <p className="text-xs text-muted-foreground">{s.slug}</p>
                      </div>
                    </TableCell>
                    <TableCell>                    <Badge className={cn("font-medium", planColors[s.plan] || "bg-slate-100 text-slate-700")}>{s.plan === "basico" ? "Emprendedor" : s.plan === "negocio" ? "Negocio" : s.plan === "empresarial" ? "Empresarial" : s.plan}</Badge></TableCell>
                    <TableCell>{s._count.products}</TableCell>
                    <TableCell>{s._count.orders}</TableCell>
                    <TableCell>{s._count.members}</TableCell>
                    <TableCell><Badge className={s.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}>{s.isActive ? "Activa" : "Inactiva"}</Badge></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{format(new Date(s.createdAt), "dd/MM/yyyy", { locale: es })}</TableCell>
                    <TableCell className="text-right flex gap-1 justify-end">
                      <Link href={`/admin/stores/${s.id}`}>
                        <Button variant="ghost" size="sm"><Eye className="size-4" /></Button>
                      </Link>
                      <Link href={`/store/${s.slug}`} target="_blank">
                        <Button variant="ghost" size="sm"><ExternalLink className="size-4" /></Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
