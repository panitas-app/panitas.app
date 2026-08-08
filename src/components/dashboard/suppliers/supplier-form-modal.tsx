"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { SUPPLIER_CATEGORIES, SupplierDetail } from "./supplier-types"

interface SupplierFormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  supplier: SupplierDetail | null
  onSaved: () => void
}

export function SupplierFormModal({ open, onOpenChange, supplier, onSaved }: SupplierFormModalProps) {
  const editing = Boolean(supplier)
  const [name, setName] = useState("")
  const [ruc, setRuc] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [address, setAddress] = useState("")
  const [category, setCategory] = useState("")
  const [notes, setNotes] = useState("")
  const [isActive, setIsActive] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setName(supplier?.name ?? "")
    setRuc(supplier?.ruc ?? "")
    setPhone(supplier?.phone ?? "")
    setEmail(supplier?.email ?? "")
    setAddress(supplier?.address ?? "")
    setCategory(supplier?.category ?? "")
    setNotes(supplier?.notes ?? "")
    setIsActive(supplier?.isActive ?? true)
  }, [open, supplier])

  const valid = name.trim().length > 0

  async function submit() {
    if (!valid) return
    setSaving(true)
    try {
      const res = await fetch(editing ? `/api/suppliers/${supplier!.id}` : "/api/suppliers", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          ruc: ruc.trim() || undefined,
          phone: phone.trim() || undefined,
          email: email.trim() || undefined,
          address: address.trim() || undefined,
          category: category || undefined,
          notes: notes.trim() || null,
          isActive: editing ? isActive : undefined,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || (editing ? "Error al actualizar el proveedor" : "Error al crear el proveedor"))
      }
      toast.success(editing ? "Proveedor actualizado" : "Proveedor creado")
      onOpenChange(false)
      onSaved()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al guardar el proveedor")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar proveedor" : "Nuevo proveedor"}</DialogTitle>
          <DialogDescription>
            {editing ? `Actualiza los datos de ${supplier!.name}.` : "Registra un proveedor para llevar sus cuentas por pagar."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="sf-name">Nombre *</Label>
            <Input id="sf-name" placeholder="Ej: Distribuidora La Central" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label htmlFor="sf-ruc">RIF (opcional)</Label>
              <Input id="sf-ruc" placeholder="J-12345678-9" value={ruc} onChange={(e) => setRuc(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sf-phone">Teléfono (opcional)</Label>
              <Input id="sf-phone" placeholder="0412..." value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label htmlFor="sf-email">Email (opcional)</Label>
              <Input id="sf-email" type="email" placeholder="proveedor@mail.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sf-category">Categoría</Label>
              <select
                id="sf-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
              >
                {SUPPLIER_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sf-address">Dirección (opcional)</Label>
            <Input id="sf-address" placeholder="Dirección del proveedor" value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sf-notes">Notas (opcional)</Label>
            <Textarea id="sf-notes" rows={2} placeholder="Notas sobre el proveedor..." value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          {editing && (
            <label className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
              <span className="text-xs font-semibold">Proveedor activo</span>
              <button
                type="button"
                role="switch"
                aria-checked={isActive}
                onClick={() => setIsActive((v) => !v)}
                className={`relative h-5 w-9 rounded-full transition-colors ${isActive ? "bg-green-500" : "bg-muted"}`}
              >
                <span className={`absolute top-0.5 size-4 rounded-full bg-white shadow transition-transform ${isActive ? "translate-x-4" : "translate-x-0.5"}`} />
              </button>
            </label>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={!valid || saving}>
            {saving ? "Guardando..." : editing ? "Guardar cambios" : "Crear proveedor"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
