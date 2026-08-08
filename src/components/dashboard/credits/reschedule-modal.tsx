"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CreditSummary, money } from "./credit-types"

interface RescheduleModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  credit: CreditSummary
  onSaved: () => void
}

export function RescheduleModal({ open, onOpenChange, credit, onSaved }: RescheduleModalProps) {
  const [totalAmount, setTotalAmount] = useState("")
  const [count, setCount] = useState("3")
  const [periodDays, setPeriodDays] = useState("15")
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [saving, setSaving] = useState(false)

  const parsedTotal = totalAmount ? parseFloat(totalAmount) : credit.pending
  const parsedCount = parseInt(count, 10)
  const parsedPeriod = parseInt(periodDays, 10)
  const each = parsedCount > 0 ? parsedTotal / parsedCount : 0
  const valid =
    Number.isFinite(parsedTotal) && parsedTotal > 0 &&
    Number.isFinite(parsedCount) && parsedCount >= 1 && parsedCount <= 24 &&
    Number.isFinite(parsedPeriod) && parsedPeriod >= 1 && parsedPeriod <= 120

  function reset() {
    setTotalAmount("")
    setCount("3")
    setPeriodDays("15")
    setStartDate(new Date().toISOString().slice(0, 10))
  }

  async function submit() {
    if (!valid) return
    setSaving(true)
    try {
      const res = await fetch(`/api/creditos/${credit.orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reschedule",
          count: parsedCount,
          totalAmount: parsedTotal,
          periodDays: parsedPeriod,
          startDate,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Error al recalcular las cuotas")
      }
      toast.success("Cuotas recalculadas")
      reset()
      onOpenChange(false)
      onSaved()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al recalcular las cuotas")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { onOpenChange(next); if (!next) reset() }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Recalcular cuotas</DialogTitle>
          <DialogDescription>
            {credit.customerName} · Saldo pendiente: <strong className="text-foreground">{money(credit.pending)}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="rm-total">Monto total del nuevo plan</Label>
            <Input
              id="rm-total"
              type="number"
              min={0.01}
              step={0.01}
              placeholder={money(credit.pending)}
              value={totalAmount}
              onChange={(e) => setTotalAmount(e.target.value)}
            />
            <p className="text-[11px] text-muted-foreground">Por defecto usa el saldo pendiente actual.</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="rm-count">Nº de cuotas</Label>
              <Input id="rm-count" type="number" min={1} max={24} value={count} onChange={(e) => setCount(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rm-period">Periodicidad (días)</Label>
              <Input id="rm-period" type="number" min={1} max={120} value={periodDays} onChange={(e) => setPeriodDays(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="rm-start">Fecha de inicio</Label>
            <Input id="rm-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>

          {valid && (
            <p className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
              {parsedCount} cuotas de <strong className="text-foreground">{money(each)}</strong> cada una, cada {parsedPeriod} días.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={!valid || saving}>
            {saving ? "Guardando..." : "Recalcular"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
