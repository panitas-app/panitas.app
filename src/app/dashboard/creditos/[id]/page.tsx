"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { ArrowLeft, CalendarClock, MessageCircle, MessageCircleQuestion, Package, ReceiptText, Wallet } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button, buttonVariants } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { EmptyState } from "@/components/ui/empty-state"
import { LoadingState } from "@/components/ui/loading-state"
import { toast } from "sonner"
import { PaymentModal } from "@/components/dashboard/credits/payment-modal"
import { RescheduleModal } from "@/components/dashboard/credits/reschedule-modal"
import { Timeline } from "@/components/dashboard/credits/timeline"
import {
  CreditDetail,
  STATE_META,
  buildReminderMessage,
  daysUntil,
  formatDate,
  methodLabel,
  money,
  whatsappLink,
} from "@/components/dashboard/credits/credit-types"
import { cn } from "@/lib/utils"

export default function CreditDetailPage() {
  const params = useParams()
  const id = params?.id as string

  const [detail, setDetail] = useState<CreditDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [paying, setPaying] = useState(false)
  const [rescheduling, setRescheduling] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState("")
  const [cancelling, setCancelling] = useState(false)

  const fetchDetail = useCallback(async () => {
    try {
      const res = await fetch(`/api/creditos/${id}`)
      if (res.status === 404) {
        setNotFound(true)
        return
      }
      if (!res.ok) throw new Error("Error al cargar el crédito")
      setDetail(await res.json())
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al cargar el crédito")
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchDetail()
  }, [fetchDetail])

  async function confirmCancel() {
    if (!detail) return
    setCancelling(true)
    try {
      const res = await fetch(`/api/creditos/${detail.orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel", reason: cancelReason.trim() || null }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Error al cancelar el crédito")
      }
      toast.success("Crédito cancelado")
      setCancelOpen(false)
      setCancelReason("")
      await fetchDetail()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al cancelar el crédito")
    } finally {
      setCancelling(false)
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl">
        <LoadingState message="Cargando crédito..." />
      </div>
    )
  }

  if (notFound || !detail) {
    return (
      <div className="mx-auto max-w-4xl">
        <EmptyState icon={Wallet} title="Crédito no encontrado" action={<Link href="/dashboard/creditos" className={buttonVariants({ variant: "outline" })}><ArrowLeft /> Volver</Link>} />
      </div>
    )
  }

  const meta = STATE_META[detail.state]
  const canPay = detail.state !== "paid" && detail.state !== "cancelled"
  const isOverdue = detail.state === "overdue"
  const nextDays = detail.nextDueDate ? daysUntil(detail.nextDueDate) : null

  const reminder = buildReminderMessage(detail, canPay)

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div>
        <Link href="/dashboard/creditos" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="size-3.5" /> Centro de Cobranza
        </Link>
        <div className="flex flex-col gap-3 mt-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <h1 className="font-heading text-xl font-black">
              {detail.customerId ? (
                <Link href={`/dashboard/customers/${detail.customerId}`} className="hover:text-primary transition-colors">
                  {detail.customerName}
                </Link>
              ) : (
                detail.customerName
              )}
            </h1>
            <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold", meta.chip)}>
              <span className={cn("size-1.5 rounded-full", meta.dot)} />
              {meta.label}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {canPay && (
              <Button size="sm" onClick={() => setPaying(true)}>
                <ReceiptText /> Registrar abono
              </Button>
            )}
            {canPay && (
              <Button size="sm" variant="outline" onClick={() => setRescheduling(true)}>
                <CalendarClock /> Replanificar
              </Button>
            )}
            <Link href={whatsappLink(detail.customerPhone, reminder)} target="_blank" rel="noreferrer" className={buttonVariants({ variant: "outline", size: "sm" })}>
              <MessageCircle /> WhatsApp
            </Link>
            {canPay && (
              <Button size="sm" variant="destructive" onClick={() => setCancelOpen(true)}>
                Cancelar
              </Button>
            )}
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {detail.customerPhone} ·{" "}
          <Link href={`/dashboard/orders/${detail.orderId}`} className="font-semibold text-foreground hover:text-primary transition-colors">
            Orden #{detail.orderNumber}
          </Link>{" "}
          · Creado el {formatDate(detail.createdAt)}
        </p>
      </div>

      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Saldo pendiente</p>
              <p className={cn("font-heading text-2xl font-black", isOverdue && "text-red-600 dark:text-red-400")}>
                {money(detail.pending)}
              </p>
            </div>
            <div className="grid grid-cols-3 gap-4 text-right text-xs">
              <div>
                <p className="text-muted-foreground">Total</p>
                <p className="font-bold">{money(detail.totalCredito)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Pagado</p>
                <p className="font-bold text-green-600 dark:text-green-400">{money(detail.paid)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Inicial</p>
                <p className="font-bold">{money(detail.downPayment)}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
              <div className={cn("h-full rounded-full transition-all", meta.bar)} style={{ width: `${detail.paidPercent}%` }} />
            </div>
            <span className="text-xs font-bold">{detail.paidPercent}%</span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            <CalendarClock className="size-3.5" />
            {isOverdue ? (
              <span className="text-red-600 dark:text-red-400 font-semibold">
                Vencido hace {detail.overdueDays} día{detail.overdueDays === 1 ? "" : "s"}
              </span>
            ) : nextDays !== null && detail.nextAmount !== null ? (
              <span>
                Próxima cuota: <strong className="text-foreground">{money(detail.nextAmount)}</strong> ·{" "}
                {nextDays <= 0 ? "hoy" : nextDays === 1 ? "mañana" : `en ${nextDays} días`} ({formatDate(detail.nextDueDate!)})
              </span>
            ) : (
              <span>Sin cuotas pendientes</span>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Package className="size-4 text-muted-foreground" /> Productos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {detail.items.length === 0 ? (
              <p className="text-xs text-muted-foreground">Sin productos registrados.</p>
            ) : (
              detail.items.map((item, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <span className="font-medium truncate">{item.productName ?? "Producto"} × {item.quantity}</span>
                  <span className="text-muted-foreground shrink-0">{money(item.subtotal)}</span>
                </div>
              ))
            )}
            <div className="border-t pt-2 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Total de la venta</span>
              <span className="font-bold">{money(detail.total)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><CalendarClock className="size-4 text-muted-foreground" /> Cuotas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {detail.installments.map((inst) => {
              const isPaid = inst.status === "paid"
              const isLate = !isPaid && new Date(inst.dueDate) < new Date()
              const partial = !isPaid && inst.paidAmount > 0
              return (
                <div key={inst.id} className={cn("flex items-center justify-between rounded-lg p-2.5 text-xs", isPaid ? "bg-green-50 dark:bg-green-950/20" : isLate ? "bg-red-50 dark:bg-red-950/20" : "bg-muted/50")}>
                  <div>
                    <p className="font-semibold">Cuota #{inst.number}</p>
                    <p className="text-[11px] text-muted-foreground">Vence {formatDate(inst.dueDate)}</p>
                  </div>
                  <div className="text-right">
                    <p className={cn("font-bold", isPaid && "text-green-600 dark:text-green-400")}>
                      {money(inst.amount)}
                      {partial && <span className="text-amber-600 dark:text-amber-400"> · pagado {money(inst.paidAmount)}</span>}
                    </p>
                    <p className="text-[11px]">
                      {isPaid ? <span className="text-green-600 font-semibold">Pagada</span>
                        : isLate ? <span className="text-red-600 font-semibold">Vencida</span>
                        : partial ? <span className="text-amber-600 font-semibold">Parcial</span>
                        : <span className="text-muted-foreground">Pendiente</span>}
                    </p>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ReceiptText className="size-4 text-muted-foreground" /> Abonos registrados</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {detail.payments.length === 0 ? (
            <p className="text-xs text-muted-foreground">Todavía no hay abonos registrados.</p>
          ) : (
            detail.payments.map((p) => (
              <div key={p.id} className="flex items-start justify-between rounded-lg bg-muted/50 p-2.5 text-xs">
                <div className="min-w-0">
                  <p className="font-semibold text-green-600 dark:text-green-400">{money(p.amount)}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {methodLabel(p.method)}
                    {p.reference ? ` · Ref: ${p.reference}` : ""}
                  </p>
                  {p.notes && <p className="text-[11px] text-muted-foreground italic">“{p.notes}”</p>}
                </div>
                <p className="text-[11px] text-muted-foreground shrink-0">{formatDate(p.paidAt ?? p.createdAt, true)}</p>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader id="historial">
          <CardTitle className="flex items-center gap-2"><Wallet className="size-4 text-muted-foreground" /> Historial</CardTitle>
        </CardHeader>
        <CardContent>
          <Timeline entries={detail.timeline} />
        </CardContent>
      </Card>

      <div className="flex justify-center">
        <Link
          href={`/dashboard/assistant?q=${encodeURIComponent(`¿Cuál es el estado del crédito de ${detail.customerName} en la orden #${detail.orderNumber}?`)}`}
          className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-semibold text-foreground hover:text-primary hover:border-primary/40 transition-colors"
        >
          <MessageCircleQuestion className="size-4 text-primary" />
          Preguntar a Panitas
        </Link>
      </div>

      {paying && detail && (
        <PaymentModal open onOpenChange={(open) => !open && setPaying(false)} credit={detail} onSaved={fetchDetail} />
      )}
      {rescheduling && detail && (
        <RescheduleModal open onOpenChange={(open) => !open && setRescheduling(false)} credit={detail} onSaved={fetchDetail} />
      )}

      <Dialog open={cancelOpen} onOpenChange={(open) => { setCancelOpen(open); if (!open && !cancelling) setCancelReason("") }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Cancelar crédito de {detail.customerName}</DialogTitle>
            <DialogDescription>
              El crédito de la orden #{detail.orderNumber} quedará marcado como cancelado y ya no podrás registrar abonos. Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Textarea
              rows={3}
              placeholder="Motivo de la cancelación (opcional)"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelOpen(false)} disabled={cancelling}>
              Volver
            </Button>
            <Button variant="destructive" onClick={confirmCancel} disabled={cancelling}>
              {cancelling ? "Cancelando..." : "Cancelar crédito"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
