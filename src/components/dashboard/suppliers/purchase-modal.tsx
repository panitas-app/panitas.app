"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { SupplierSummary, money } from "./supplier-types"

interface PurchaseModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  supplier: SupplierSummary
  onSaved: () => void
}

export function PurchaseModal({ open, onOpenChange, supplier, onSaved }: PurchaseModalProps) {
  const [amount, setAmount] = useState("")
  const [description, setDescription] = useState("")
  const [invoiceNumber, setInvoiceNumber] = useState("")
  const [purchaseDate, setPurchaseDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [dueDate, setDueDate] = useState("")
  const [paymentMethod, setPaymentMethod] = useState("cash")
  const [notes, setNotes] = useState("")
  const [saving, setSaving] = useState(false)

  const parsed = parseFloat(amount)
  const valid = Number.isFinite(parsed) && parsed > 0 && description.trim().length > 0

  function reset() {
    setAmount("")
    setDescription("")
    setInvoiceNumber("")
    setPurchaseDate(new Date().toISOString().slice(0, 10))
    setDueDate("")
    setPaymentMethod("cash")
    setNotes("")
  }

  async function submit() {
    if (!valid) return
    setSaving(true)
    try {
      const res = await fetch(`/api/suppliers/${supplier.id}/purchases`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parsed,
          description: description.trim(),
          number: invoiceNumber.trim() || undefined,
          date: purchaseDate,
          dueDate: dueDate || null,
          paymentMethod,
          notes: notes.trim() || null,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Error al registrar la compra")
      }
      toast.success(`Compra de ${money(parsed)} registrada`)
      reset()
      onOpenChange(false)
      onSaved()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al registrar la compra")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { onOpenChange(next); if (!next) reset() }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar compra</DialogTitle>
          <DialogDescription>
            {supplier.name} · La factura incrementa el saldo pendiente del proveedor.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="pu-amount">Monto de la compra</Label>
            <Input
              id="pu-amount"
              type="number"
              min={0.01}
              step={0.01}
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pu-desc">Descripción</Label>
            <Input
              id="pu-desc"
              placeholder="Ej: Compra de inventario semanal"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label htmlFor="pu-num">Nº de factura (opcional)</Label>
              <Input id="pu-num" placeholder="F-001" value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pu-method">Método</Label>
              <select
                id="pu-method"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
              >
                <option value="cash">Efectivo</option>
                <option value="bank_transfer">Transferencia</option>
                <option value="pago_movil">Pago Móvil</option>
                <option value="binancepay">Binance Pay</option>
                <option value="credito">Crédito</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label htmlFor="pu-date">Fecha de compra</Label>
              <Input id="pu-date" type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pu-due">Vence (opcional)</Label>
              <Input id="pu-due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pu-notes">Observaciones (opcional)</Label>
            <Textarea id="pu-notes" rows={2} placeholder="Notas de la compra..." value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={!valid || saving}>
            {saving ? "Registrando..." : `Confirmar ${valid ? money(parsed) : ""}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
