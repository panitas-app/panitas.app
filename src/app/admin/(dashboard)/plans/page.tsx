"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search, Check, X, AlertCircle } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { PLANS, type PlanType } from "@/lib/plans"

interface StoreItem {
  id: string
  name: string
  slug: string
  plan: string
  planType: string
  planStatus: string
  planStartDate: string | null
  planExpirationDate: string | null
  isActive: boolean
  email: string | null
  _count: { products: number; orders: number; members: number }
}

const planColors: Record<string, string> = {
  basico: "bg-slate-100 text-slate-700",
  negocio: "bg-blue-100 text-blue-700",
  empresarial: "bg-amber-100 text-amber-700",
  free: "bg-slate-100 text-slate-400",
}

export default function AdminPlansPage() {
  const [stores, setStores] = useState<StoreItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [saving, setSaving] = useState("")

  useEffect(() => {
    fetchStores()
  }, [])

  async function fetchStores() {
    setLoading(true)
    const res = await fetch("/api/admin/stores")
    const json = await res.json()
    setStores(json.data || [])
    setLoading(false)
  }

  async function updatePlan(storeId: string, planType: string) {
    setSaving(storeId || "")
    try {
      const res = await fetch(`/api/admin/stores/${storeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planType }),
      })
      if (res.ok) {
        toast.success("Plan actualizado")
        fetchStores()
      } else {
        const err = await res.json()
        toast.error(err.error || "Error al actualizar")
      }
    } catch {
      toast.error("Error de conexión")
    } finally { setSaving("") }
  }

  const filtered = search
    ? stores.filter((s) => s.name.toLowerCase().includes(search.toLowerCase()) || s.slug.toLowerCase().includes(search.toLowerCase()))
    : stores

  const counts: Record<string, number> = {
    basico: 0,
    negocio: 0,
    empresarial: 0,
  }
  for (const s of stores) {
    if (s.planType in counts) counts[s.planType]++
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Gestión de Planes</h1>
        <p className="text-sm text-muted-foreground">Asigna y administra planes por tienda</p>
      </div>

      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        {(Object.entries(PLANS) as [PlanType, typeof PLANS[PlanType]][]).map(([key, plan]) => (
          <Card key={key} className={cn("border-l-4", key === "basico" ? "border-l-slate-400" : key === "negocio" ? "border-l-blue-400" : "border-l-amber-400")}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">{plan.label}</p>
              <p className="text-2xl font-bold mt-1">{counts[key]}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">${plan.precioUsd}/mes</p>
            </CardContent>
          </Card>
        ))}
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
                <TableHead>Plan actual</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Cambiar plan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Cargando...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Sin resultados</TableCell></TableRow>
              ) : (
                filtered.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{s.name}</p>
                        <p className="text-xs text-muted-foreground">{s.slug}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={cn("font-medium", planColors[s.planType] || planColors.basico)}>
                        {PLANS[s.planType as PlanType]?.label || s.planType}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {s.planStatus === "active" || s.planStatus === "activo" ? (
                          <Check className="size-3.5 text-green-600" />
                        ) : s.planStatus === "expired" ? (
                          <AlertCircle className="size-3.5 text-red-600" />
                        ) : (
                          <X className="size-3.5 text-slate-400" />
                        )}
                        <span className="text-xs capitalize">{s.planStatus}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Select
                          defaultValue={s.planType}
                          onValueChange={(v) => v && s.id && updatePlan(s.id, v)}
                          disabled={saving === s.id || !s.id}
                        >
                          <SelectTrigger className="w-36 h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {(Object.entries(PLANS) as [PlanType, typeof PLANS[PlanType]][]).map(([key, plan]) => (
                              <SelectItem key={key} value={key}>{plan.label} (${plan.precioUsd})</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
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
