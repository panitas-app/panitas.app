"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { ArrowLeft, HandCoins, PackagePlus, Pencil, Power, ReceiptText, Trash2, Truck } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button, buttonVariants } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { LoadingState } from "@/components/ui/loading-state"
import { toast } from "sonner"
import { PaymentModal } from "@/components/dashboard/suppliers/payment-modal"
import { PurchaseModal } from "@/components/dashboard/suppliers/purchase-modal"
import { SupplierFormModal } from "@/components/dashboard/suppliers/supplier-form-modal"
import { Timeline } from "@/components/dashboard/suppliers/timeline"
import {
  INVOICE_STATUS_META,
  SupplierDetail,
  STATE_META,
  daysUntil,
  formatDate,
  methodLabel,
  money,
} from "@/components/dashboard/suppliers/supplier-types"
import { cn } from "@/lib/utils"

export default function SupplierDetailPage() {
  const params = useParams()
  const id = params?.id as string

  const [detail, setDetail] = useState<SupplierDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [paying, setPaying] = useState(false)
  const [purchasing, setPurchasing] = useState(false)
  const [editing, setEditing] = useState(false)
  const [mutating, setMutating] = useState(false)

  const fetchDetail = useCallback(async () => {
    try {
      const res = await fetch(`/api/suppliers/${id}`)
      if (res.status === 404) {
        setNotFound(true)
        return
      }
      if (!res.ok) throw new Error("Error al cargar el proveedor")
      setDetail(await res.json())
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al cargar el proveedor")
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchDetail()
  }, [fetchDetail])

  async function handleToggleActive() {
    if (!detail) return
    const next = !detail.isActive
    setMutating(true)
    try {
      const res = await fetch(`/api/suppliers/${detail.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: next }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Error al actualizar el proveedor")
      }
      toast.success(next ? "Proveedor activado" : "Proveedor desactivado")
      await fetchDetail()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al actualizar el proveedor")
    } finally {
      setMutating(false)
    }
  }

  async function handleDelete() {
    if (!detail) return
    const ok = window.confirm(`¿Eliminar definitivamente a "${detail.name}"? Esta acción no se puede deshacer.`)
    if (!ok) return
    setMutating(true)
    try {
      const res = await fetch(`/api/suppliers/${detail.id}`, { method: "DELETE" })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Error al eliminar el proveedor")
      }
      toast.success("Proveedor eliminado")
      window.location.href = "/dashboard/suppliers"
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al eliminar el proveedor")
    } finally {
      setMutating(false)
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl">
        <LoadingState message="Cargando proveedor..." />
      </div>
    )
  }

  if (notFound || !detail) {
    return (
      <div className="mx-auto max-w-4xl">
        <EmptyState icon={Truck} title="Proveedor no encontrado" action={<Link href="/dashboard/suppliers" className={buttonVariants({ variant: "outline" })}><ArrowLeft /> Volver</Link>} />
      </div>
    )
  }

  const meta = STATE_META[detail.state]
  const canPay = detail.state !== "saldado" && detail.state !== "inactivo"
  const isOverdue = detail.state === "vencido"
  const nextDays = detail.nextDueDate ? daysUntil(detail.nextDueDate) : null
  const paidPercent = detail.totalPurchased > 0 ? Math.min(100, Math.round((detail.totalPaid / detail.totalPurchased) * 100)) : 100

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div>
        <Link href="/dashboard/suppliers" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="size-3.5" /> Centro de Proveedores
        </Link>
        <div className="flex flex-col gap-3 mt-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <h1 className="font-heading text-xl font-black">{detail.name}</h1>
            <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold", meta.chip)}>
              <span className={cn("size-1.5 rounded-full", meta.dot)} />
              {meta.label}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {canPay && (
              <Button size="sm" onClick={() => setPaying(true)}>
                <HandCoins /> Registrar pago
              </Button>
            )}
            {detail.state !== "inactivo" && (
              <Button size="sm" variant="outline" onClick={() => setPurchasing(true)}>
                <PackagePlus /> Registrar compra
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
              <Pencil /> Editar
            </Button>
            <Button size="sm" variant="outline" onClick={handleToggleActive} disabled={mutating}>
              <Power /> {detail.isActive ? "Desactivar" : "Activar"}
            </Button>
            <Button size="sm" variant="destructive" onClick={handleDelete} disabled={mutating}>
              <Trash2 /> Eliminar
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {[detail.category || "Sin categoría", detail.ruc && `RIF: ${detail.ruc}`, detail.phone, detail.email, detail.address]
            .filter(Boolean)
            .join(" · ") || "Sin datos de contacto"}
        </p>
      </div>

      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Saldo pendiente</p>
              <p className={cn("font-heading text-2xl font-black", isOverdue && "text-red-600 dark:text-red-400")}>
                {money(detail.balance)}
              </p>
            </div>
            <div className="grid grid-cols-3 gap-4 text-right text-xs">
              <div>
                <p className="text-muted-foreground">Compras</p>
                <p className="font-bold">{money(detail.totalPurchased)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Pagado</p>
                <p className="font-bold text-green-600 dark:text-green-400">{money(detail.totalPaid)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Facturas</p>
                <p className="font-bold">{detail.invoices.length}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
              <div className={cn("h-full rounded-full transition-all", meta.bar)} style={{ width: `${paidPercent}%` }} />
            </div>
            <span className="text-xs font-bold">{paidPercent}% pagado</span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            <ReceiptText className="size-3.5" />
            {isOverdue ? (
              <span className="font-semibold text-red-600 dark:text-red-400">
                {detail.overdueInvoices} factura{detail.overdueInvoices === 1 ? "" : "s"} vencida{detail.overdueInvoices === 1 ? "" : "s"}
              </span>
            ) : nextDays !== null ? (
              <span>
                Próximo vencimiento:{" "}
                <strong className="text-foreground">
                  {nextDays <= 0 ? "hoy" : nextDays === 1 ? "mañana" : `en ${nextDays} días`}
                </strong>{" "}
                ({formatDate(detail.nextDueDate!)})
              </span>
            ) : (
              <span>Sin vencimientos pendientes</span>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><PackagePlus className="size-4 text-muted-foreground" /> Facturas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {detail.invoices.length === 0 ? (
            <p className="text-xs text-muted-foreground">Todavía no hay compras registradas.</p>
          ) : (
            detail.invoices.map((inv) => {
              const st = INVOICE_STATUS_META[inv.status]
              const isLate = (inv.status === "pending" || inv.status === "partial") && inv.dueDate && new Date(inv.dueDate) < new Date()
              return (
                <div key={inv.id} className={cn("rounded-lg p-2.5 text-xs", isLate ? "bg-red-50 dark:bg-red-950/20" : inv.status === "paid" ? "bg-green-50 dark:bg-green-950/20" : "bg-muted/50")}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold truncate">
                        {inv.description}
                        {inv.number && <span className="text-muted-foreground"> · {inv.number}</span>}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {formatDate(inv.date)}
                        {inv.dueDate ? ` · Vence ${formatDate(inv.dueDate)}` : ""}
                        {inv.documentRef ? ` · Ref: ${inv.documentRef}` : ""}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={cn("font-bold", inv.status === "paid" && "text-green-600 dark:text-green-400")}>
                        {money(inv.amount)}
                      </p>
                      <span className={cn("inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-bold", st.chip)}>
                        {st.label}
                      </span>
                    </div>
                  </div>
                  {inv.status !== "paid" && inv.status !== "cancelled" && inv.paidAmount > 0 && (
                    <div className="mt-1.5 flex items-center gap-1.5">
                      <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
                        <div className={cn("h-full rounded-full", st.bar)} style={{ width: `${inv.paidPercent}%` }} />
                      </div>
                      <span className="text-[10px] text-muted-foreground">
                        {money(inv.paidAmount)} abonado ({inv.paidPercent}%)
                      </span>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </CardContent>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><HandCoins className="size-4 text-muted-foreground" /> Pagos registrados</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {detail.payments.length === 0 ? (
              <p className="text-xs text-muted-foreground">Todavía no hay pagos registrados.</p>
            ) : (
              detail.payments.map((p) => (
                <div key={p.id} className="flex items-start justify-between rounded-lg bg-muted/50 p-2.5 text-xs">
                  <div className="min-w-0">
                    <p className="font-semibold text-green-600 dark:text-green-400">{money(p.amount)}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {methodLabel(p.paymentMethod)}
                      {p.reference ? ` · Ref: ${p.reference}` : ""}
                    </p>
                    {p.notes && <p className="text-[11px] text-muted-foreground italic">“{p.notes}”</p>}
                  </div>
                  <p className="text-[11px] text-muted-foreground shrink-0">{formatDate(p.date, true)}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Truck className="size-4 text-muted-foreground" /> Historial</CardTitle>
          </CardHeader>
          <CardContent>
            <Timeline entries={detail.timeline} />
          </CardContent>
        </Card>
      </div>

      {paying && detail && (
        <PaymentModal open onOpenChange={(open) => !open && setPaying(false)} supplier={detail} onSaved={fetchDetail} />
      )}
      {purchasing && detail && (
        <PurchaseModal open onOpenChange={(open) => !open && setPurchasing(false)} supplier={detail} onSaved={fetchDetail} />
      )}
      <SupplierFormModal open={editing} onOpenChange={setEditing} supplier={detail} onSaved={fetchDetail} />
    </div>
  )
}
