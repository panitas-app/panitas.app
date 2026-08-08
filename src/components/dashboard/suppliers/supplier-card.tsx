"use client"

import Link from "next/link"
import { CalendarClock, HandCoins, PackagePlus, ReceiptText, Truck } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button, buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { SupplierSummary, STATE_META, daysUntil, formatDate, initialsOf, money } from "./supplier-types"

interface SupplierCardProps {
  supplier: SupplierSummary
  onPay: (supplier: SupplierSummary) => void
  onPurchase: (supplier: SupplierSummary) => void
}

export function SupplierCard({ supplier, onPay, onPurchase }: SupplierCardProps) {
  const meta = STATE_META[supplier.state]
  const Icon = meta.icon
  const canPay = supplier.state !== "saldado" && supplier.state !== "inactivo"
  const nextDays = supplier.nextDueDate ? daysUntil(supplier.nextDueDate) : null
  const isOverdue = supplier.state === "vencido"
  const paidPercent = supplier.totalPurchased > 0 ? Math.min(100, Math.round((supplier.totalPaid / supplier.totalPurchased) * 100)) : 100

  return (
    <Card className={cn("gap-0", meta.border)}>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className={cn("flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-black", meta.chip)}>
              {initialsOf(supplier.name)}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="truncate text-sm font-bold">{supplier.name}</span>
                <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold", meta.chip)}>
                  <span className={cn("size-1.5 rounded-full", meta.dot)} />
                  {meta.label}
                </span>
              </div>
              <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                <Truck className="mr-1 inline size-3 align-[-1px]" />
                {supplier.category || "Sin categoría"}
                {supplier.ruc ? ` · RIF: ${supplier.ruc}` : ""}
              </p>
            </div>
          </div>
          <Icon className={cn("size-5 shrink-0", meta.text)} />
        </div>

        <div className="flex items-end justify-between">
          <div>
            <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Saldo pendiente</p>
            <p className={cn("font-heading text-xl font-black", isOverdue ? "text-red-600 dark:text-red-400" : "")}>
              {money(supplier.balance)}
            </p>
          </div>
          <div className="text-right text-[11px] text-muted-foreground">
            <p>
              Compras <strong className="text-foreground">{money(supplier.totalPurchased)}</strong>
            </p>
            <p>
              Pagado <strong className="text-foreground text-green-600 dark:text-green-400">{money(supplier.totalPaid)}</strong>
            </p>
          </div>
        </div>

        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div className={cn("h-full rounded-full transition-all", meta.bar)} style={{ width: `${paidPercent}%` }} />
        </div>

        <div className="flex items-center gap-1.5 text-xs">
          <CalendarClock className="size-3.5 text-muted-foreground" />
          {isOverdue ? (
            <span className="font-semibold text-red-600 dark:text-red-400">
              {supplier.overdueInvoices} factura{supplier.overdueInvoices === 1 ? "" : "s"} vencida{supplier.overdueInvoices === 1 ? "" : "s"}
            </span>
          ) : nextDays !== null ? (
            <span className="text-muted-foreground">
              Próximo vencimiento:{" "}
              <strong className="text-foreground">
                {nextDays <= 0 ? "hoy" : nextDays === 1 ? "mañana" : `en ${nextDays} días`}
              </strong>{" "}
              ({formatDate(supplier.nextDueDate!)})
            </span>
          ) : (
            <span className="text-muted-foreground">Sin vencimientos pendientes</span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <Link href={`/dashboard/suppliers/${supplier.id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
            <ReceiptText /> Ver detalle
          </Link>
          {canPay && (
            <Button size="sm" onClick={() => onPay(supplier)}>
              <HandCoins /> Registrar pago
            </Button>
          )}
          {supplier.state !== "inactivo" && (
            <Button size="sm" variant="outline" onClick={() => onPurchase(supplier)}>
              <PackagePlus /> Registrar compra
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
