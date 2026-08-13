"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { CalendarCheck, CreditCard, Minus, Plus, SplitSquareVertical, X } from "lucide-react"
import type { PaymentSplit } from "./types"

interface PaymentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  total: number
  splitPayments: PaymentSplit[]
  cashReceived: string
  selectedCreditTerm: string
  cuotasCount: number
  downPayment: string
  submitting: boolean
  onAddSplitPayment: () => void
  onUpdateSplitPayment: (index: number, field: "method" | "amount", value: string) => void
  onRemoveSplitPayment: (index: number) => void
  onCashReceivedChange: (value: string) => void
  onCreditTermChange: (term: string) => void
  onCuotasCountChange: (count: number) => void
  onDownPaymentChange: (value: string) => void
  onProcess: () => void
}

export function PaymentModal({
  open,
  onOpenChange,
  total,
  splitPayments,
  cashReceived,
  selectedCreditTerm,
  cuotasCount,
  downPayment,
  submitting,
  onAddSplitPayment,
  onUpdateSplitPayment,
  onRemoveSplitPayment,
  onCashReceivedChange,
  onCreditTermChange,
  onCuotasCountChange,
  onDownPaymentChange,
  onProcess,
}: PaymentModalProps) {
  const totalPaid = splitPayments.reduce((s, p) => s + p.amount, 0)
  const cashAmount = splitPayments.find((p) => p.method === "cash")?.amount || 0
  const changeAmount = Math.max(0, (parseFloat(cashReceived) || 0) - cashAmount)

  const dp = parseFloat(downPayment) || 0
  const n = cuotasCount || 3
  const remaining = total - dp
  const downPaymentAmt = dp
  const eachAmount = n > 0 ? remaining / n : 0
  const count = n

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="size-5" /> Cobrar
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Credit option */}
          <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3 dark:border-amber-800 dark:bg-amber-950/20">
            <Label className="flex items-center gap-2 text-sm font-bold mb-2">
              <CalendarCheck className="size-4 text-amber-600" /> Vender a crédito
            </Label>
            <div className="flex items-center gap-2 mb-2">
              <button onClick={() => onCreditTermChange("")} className={`flex-1 h-8 text-xs font-bold rounded border transition-colors ${!selectedCreditTerm ? "bg-amber-500 text-white border-amber-500" : "bg-background text-muted-foreground border-border"}`}>Pago de contado</button>
              <button onClick={() => onCreditTermChange("cuotas")} className={`flex-1 h-8 text-xs font-bold rounded border transition-colors ${selectedCreditTerm ? "bg-amber-500 text-white border-amber-500" : "bg-background text-muted-foreground border-border"}`}>A crédito</button>
            </div>
            {selectedCreditTerm && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label className="text-xs w-28">Cantidad cuotas:</Label>
                  <Button variant="outline" size="icon" className="size-7" onClick={() => onCuotasCountChange(Math.max(2, cuotasCount - 1))} disabled={cuotasCount <= 2}>
                    <Minus className="size-3" />
                  </Button>
                  <span className="text-sm font-bold w-6 text-center">{cuotasCount}</span>
                  <Button variant="outline" size="icon" className="size-7" onClick={() => onCuotasCountChange(Math.min(12, cuotasCount + 1))} disabled={cuotasCount >= 12}>
                    <Plus className="size-3" />
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-xs w-28">Inicial (opcional):</Label>
                  <Input
                    type="number" min={0} max={total}
                    value={downPayment}
                    onChange={(e) => onDownPaymentChange(e.target.value)}
                    className="h-8 text-sm flex-1"
                    placeholder="0.00"
                  />
                </div>
                {(() => {
                  const dates = Array.from({ length: count }, (_, i) => {
                    const dt = new Date(); dt.setDate(dt.getDate() + (i + 1) * 15)
                    return dt.toLocaleDateString()
                  })
                  return (
                    <div className="text-xs space-y-1 text-muted-foreground bg-amber-100/50 dark:bg-amber-950/20 rounded p-2">
                      {downPaymentAmt > 0 && <p>Inicial: <span className="font-bold text-foreground">${downPaymentAmt.toFixed(2)}</span></p>}
                      <p>{count} cuotas de: <span className="font-bold text-foreground">${eachAmount.toFixed(2)}</span></p>
                      <p className="text-[10px]">Vencen: {dates.join(", ")}</p>
                    </div>
                  )
                })()}
              </div>
            )}
          </div>

          {/* Split payments */}
          <div>
            <Label className="flex items-center gap-1.5 text-sm font-bold mb-2">
              <SplitSquareVertical className="size-4" /> Métodos de pago
            </Label>
            <div className="space-y-2">
              {splitPayments.map((sp, i) => (
                <div key={i} className="flex items-center gap-2">
                  <select
                    value={sp.method}
                    onChange={(e) => onUpdateSplitPayment(i, "method", e.target.value)}
                    className="h-9 rounded-lg border border-border bg-background px-2 text-sm w-32"
                  >
                    <option value="cash">Efectivo</option>
                    <option value="bank_transfer">Transferencia</option>
                    <option value="pago_movil">Pago Móvil</option>
                    <option value="binancepay">Binance Pay</option>
                  </select>
                  <div className="relative flex-1">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
                    <Input
                      type="number" min={0} step="0.01"
                      value={sp.amount}
                      onChange={(e) => onUpdateSplitPayment(i, "amount", e.target.value)}
                      className="h-9 pl-6 text-sm"
                    />
                  </div>
                  {splitPayments.length > 1 && (
                    <Button variant="ghost" size="icon" className="size-8 text-red-500" onClick={() => onRemoveSplitPayment(i)}>
                      <X className="size-4" />
                    </Button>
                  )}
                </div>
              ))}
              {!selectedCreditTerm && (
                <Button variant="outline" size="sm" className="text-xs gap-1" onClick={onAddSplitPayment}>
                  <Plus className="size-3" /> Agregar método de pago
                </Button>
              )}
            </div>
          </div>

          {/* Cash received / change (only for cash payments) */}
          {splitPayments.some((p) => p.method === "cash") && !selectedCreditTerm && (
            <div className="rounded-lg border border-border p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Label className="text-xs w-28">Recibido en efectivo:</Label>
                <Input
                  type="number" min={0} step="0.01"
                  value={cashReceived}
                  onChange={(e) => onCashReceivedChange(e.target.value)}
                  className="h-9 text-sm flex-1"
                  placeholder="0.00"
                />
              </div>
              {parseFloat(cashReceived) > 0 && (
                <div className="flex items-center justify-between text-green-600">
                  <span className="text-sm font-bold">Cambio:</span>
                  <span className="text-lg font-black">${changeAmount.toFixed(2)}</span>
                </div>
              )}
            </div>
          )}

          {/* Summary */}
          <div className="rounded-lg bg-muted/30 p-3 space-y-1 text-sm">
            <div className="flex justify-between">
              <span>Total</span>
              <span className="font-bold">${total.toFixed(2)}</span>
            </div>
            {!selectedCreditTerm && (
              <div className="flex justify-between text-muted-foreground">
                <span>A pagar ahora</span>
                <span className="font-bold text-foreground">
                  ${totalPaid.toFixed(2)}
                </span>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={onProcess} disabled={submitting} className="gap-2 min-w-[160px]">
            <CreditCard className="size-4" />
            {submitting ? "Procesando..." : selectedCreditTerm ? "Crear crédito" : `Cobrar $${totalPaid.toFixed(2)}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
