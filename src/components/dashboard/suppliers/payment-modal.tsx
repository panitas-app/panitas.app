"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { SupplierSummary, PAYMENT_METHODS, money } from "./supplier-types"

interface PaymentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  supplier: SupplierSummary
  onSaved: () => void
}

export function PaymentModal({ open, onOpenChange, supplier, onSaved }: PaymentModalProps) {
  const [amount, setAmount] = useState("")
  const [paidDate, setPaidDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [method, setMethod] = useState<string>("cash")
  const [reference, setReference] = useState("")
  const [notes, setNotes] = useState("")
  const [saving, setSaving] = useState(false)

  const parsed = parseFloat(amount)
  const valid = Number.isFinite(parsed) && parsed > 0 && parsed <= supplier.balance + 0.001

  function reset() {
    setAmount("")
    setPaidDate(new Date().toISOString().slice(0, 10))
    setMethod("cash")
    setReference("")
    setNotes("")
  }

  async function submit() {
    if (!valid) return
    setSaving(true)
    try {
      const res = await fetch(`/api/suppliers/${supplier.id}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parsed,
          date: paidDate,
          paymentMethod: method,
          reference: reference || null,
          notes: notes || null,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Error al registrar el pago")
      }
      toast.success(`Pago de ${money(parsed)} registrado`)
      reset()
      onOpenChange(false)
      onSaved()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al registrar el pago")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { onOpenChange(next); if (!next) reset() }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar pago / abono</DialogTitle>
          <DialogDescription>
            {supplier.name} · Saldo pendiente: <strong className="text-foreground">{money(supplier.balance)}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="sp-amount">Monto del pago</Label>
            <Input
              id="sp-amount"
              type="number"
              min={0.01}
              max={supplier.balance}
              step={0.01}
              placeholder={`Máximo ${money(supplier.balance)}`}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <p className="text-[11px] text-muted-foreground">
              Se aplica en cascada a las facturas pendientes más antiguas. Puedes abonar parcial o completamente.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sp-date">Fecha del pago</Label>
            <Input id="sp-date" type="date" value={paidDate} onChange={(e) => setPaidDate(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label>Método de pago</Label>
            <div className="grid grid-cols-2 gap-2">
              {PAYMENT_METHODS.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setMethod(m.value)}
                  className={`h-9 text-xs font-bold rounded-lg border transition-colors ${method === m.value ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground border-border hover:border-primary/50"}`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sp-ref">Referencia (opcional)</Label>
            <Input id="sp-ref" placeholder="Nº de referencia" value={reference} onChange={(e) => setReference(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sp-notes">Observaciones (opcional)</Label>
            <Textarea id="sp-notes" rows={2} placeholder="Notas del pago..." value={notes} onChange={(e) => setNotes(e.target.value)} />
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
