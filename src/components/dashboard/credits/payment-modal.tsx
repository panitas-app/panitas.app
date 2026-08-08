"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { CreditSummary, PAYMENT_METHODS, money } from "./credit-types"

interface PaymentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  credit: CreditSummary
  onSaved: () => void
}

export function PaymentModal({ open, onOpenChange, credit, onSaved }: PaymentModalProps) {
  const [amount, setAmount] = useState("")
  const [paidDate, setPaidDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [method, setMethod] = useState<string>("cash")
  const [reference, setReference] = useState("")
  const [notes, setNotes] = useState("")
  const [saving, setSaving] = useState(false)

  const parsed = parseFloat(amount)
  const valid = Number.isFinite(parsed) && parsed > 0 && parsed <= credit.pending + 0.001

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
      const res = await fetch(`/api/creditos/${credit.orderId}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parsed,
          paidAt: paidDate,
          method,
          reference: reference || null,
          notes: notes || null,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Error al registrar el abono")
      }
      toast.success(`Abono de ${money(parsed)} registrado`)
      reset()
      onOpenChange(false)
      onSaved()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al registrar el abono")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { onOpenChange(next); if (!next) reset() }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar abono</DialogTitle>
          <DialogDescription>
            {credit.customerName} · Saldo pendiente: <strong className="text-foreground">{money(credit.pending)}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="pm-amount">Monto del abono</Label>
            <Input
              id="pm-amount"
              type="number"
              min={0.01}
              max={credit.pending}
              step={0.01}
              placeholder={`Máximo ${money(credit.pending)}`}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <p className="text-[11px] text-muted-foreground">
              Se aplica a las cuotas pendientes más antiguas. Puedes abonar parcial o completamente.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pm-date">Fecha del abono</Label>
            <Input id="pm-date" type="date" value={paidDate} onChange={(e) => setPaidDate(e.target.value)} />
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
            <Label htmlFor="pm-ref">Referencia (opcional)</Label>
            <Input id="pm-ref" placeholder="Nº de referencia" value={reference} onChange={(e) => setReference(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pm-notes">Observaciones (opcional)</Label>
            <Textarea id="pm-notes" rows={2} placeholder="Notas del abono..." value={notes} onChange={(e) => setNotes(e.target.value)} />
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
