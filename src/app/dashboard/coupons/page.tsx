"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { Plus, Copy, Trash2, Percent, DollarSign, Loader2, Tag, Calendar } from "lucide-react"

type Coupon = {
  id: string
  code: string
  type: string
  value: number
  minPurchase: number
  maxUses: number
  usedCount: number
  startsAt: string
  expiresAt: string | null
  isActive: boolean
  createdAt: string
}

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  // Form state
  const [code, setCode] = useState("")
  const [type, setType] = useState<"percentage" | "fixed">("percentage")
  const [value, setValue] = useState("")
  const [minPurchase, setMinPurchase] = useState("")
  const [maxUses, setMaxUses] = useState("")
  const [expiresAt, setExpiresAt] = useState("")

  const fetchCoupons = useCallback(async () => {
    try {
      const res = await fetch("/api/coupons")
      if (res.ok) setCoupons(await res.json())
    } catch {} finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchCoupons() }, [fetchCoupons])

  async function handleCreate() {
    if (!code.trim() || !value) return
    setSaving(true)
    try {
      const res = await fetch("/api/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: code.trim(),
          type,
          value,
          minPurchase,
          maxUses,
          expiresAt: expiresAt || null,
        }),
      })
      if (res.ok) {
        toast.success("Cupón creado")
        setCreateOpen(false)
        resetForm()
        fetchCoupons()
      } else {
        const data = await res.json()
        toast.error(data.error || "Error al crear")
      }
    } catch {
      toast.error("Error al crear cupón")
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleActive(coupon: Coupon) {
    try {
      const res = await fetch(`/api/coupons/${coupon.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !coupon.isActive }),
      })
      if (res.ok) {
        toast.success(coupon.isActive ? "Cupón desactivado" : "Cupón activado")
        fetchCoupons()
      }
    } catch {
      toast.error("Error al actualizar")
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Estás seguro? Esta acción no se puede deshacer.")) return
    try {
      const res = await fetch(`/api/coupons/${id}`, { method: "DELETE" })
      if (res.ok) {
        toast.success("Cupón eliminado")
        setConfirmDelete(null)
        fetchCoupons()
      }
    } catch {
      toast.error("Error al eliminar")
    }
  }

  function resetForm() {
    setCode("")
    setType("percentage")
    setValue("")
    setMinPurchase("")
    setMaxUses("")
    setExpiresAt("")
  }

  function generateCode() {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
    let result = ""
    for (let i = 0; i < 8; i++) result += chars.charAt(Math.floor(Math.random() * chars.length))
    setCode(result)
  }

  function getMinDate() {
    return new Date().toISOString().split("T")[0]
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-xl font-semibold">Cupones de descuento</h1>
        <Button onClick={() => setCreateOpen(true)} className="gap-2">
          <Plus className="size-4" /> Nuevo cupón
        </Button>
      </div>

      {/* Empty state or table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="size-6 animate-spin text-slate-400" />
            </div>
          ) : coupons.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Tag className="size-12 text-slate-300 mb-3" />
              <p className="text-sm font-semibold text-slate-500">No hay cupones</p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">
                Crea cupones de descuento para promover tus productos. Pueden ser porcentajes o montos fijos.
              </p>
              <Button variant="outline" className="mt-4" onClick={() => setCreateOpen(true)}>
                <Plus className="size-4 mr-2" /> Crear primer cupón
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Descuento</TableHead>
                  <TableHead>Usos</TableHead>
                  <TableHead>Vence</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {coupons.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <span className="font-mono font-bold text-primary text-sm">{c.code}</span>
                      {c.minPurchase > 0 && (
                        <p className="text-[10px] text-slate-400 mt-0.5">Mín. ${c.minPurchase.toFixed(2)}</p>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        {c.type === "percentage" ? (
                          <Percent className="size-3.5 text-emerald-500" />
                        ) : (
                          <DollarSign className="size-3.5 text-blue-500" />
                        )}
                        <span className="font-bold">
                          {c.type === "percentage" ? `${c.value}%` : `$${c.value.toFixed(2)}`}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{c.usedCount}{c.maxUses > 0 ? ` / ${c.maxUses}` : ""}</span>
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {c.expiresAt ? new Date(c.expiresAt).toLocaleDateString("es-VE") : "—"}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={c.isActive}
                        onCheckedChange={() => handleToggleActive(c)}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-slate-400 hover:text-red-500"
                        onClick={() => setConfirmDelete(c.id)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={(o) => { setCreateOpen(o); if (!o) resetForm() }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nuevo cupón</DialogTitle>
            <DialogDescription>Crea un código de descuento para tus clientes</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Código</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="EJ: VERANO2026"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className="font-mono font-bold uppercase"
                />
                <Button variant="outline" size="icon" onClick={generateCode} title="Generar código aleatorio">
                  <Copy className="size-4" />
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={type} onValueChange={(v) => v !== null && setType(v as "percentage" | "fixed")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Porcentaje (%)</SelectItem>
                    <SelectItem value="fixed">Monto fijo ($)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Valor</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder={type === "percentage" ? "10" : "5.00"}
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Compra mínima ($)</Label>
                <Input type="number" step="0.01" min="0" placeholder="0" value={minPurchase} onChange={(e) => setMinPurchase(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Usos máximos (0 = ilimitado)</Label>
                <Input type="number" min="0" placeholder="0" value={maxUses} onChange={(e) => setMaxUses(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Fecha de expiración (opcional)</Label>
              <Input type="date" min={getMinDate()} value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCreateOpen(false); resetForm() }}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={saving || !code.trim() || !value}>
              {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Crear cupón
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm delete */}
      <Dialog open={!!confirmDelete} onOpenChange={() => setConfirmDelete(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>¿Eliminar cupón?</DialogTitle>
            <DialogDescription>Esta acción no se puede deshacer.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => confirmDelete && handleDelete(confirmDelete)}>Eliminar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
