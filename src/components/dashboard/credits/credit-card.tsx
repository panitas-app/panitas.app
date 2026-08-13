"use client"

import Link from "next/link"
import { CalendarClock, History, MessageCircle, ReceiptText } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button, buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { CreditSummary, STATE_META, buildReminderMessage, daysUntil, formatDate, money, whatsappLink } from "./credit-types"

interface CreditCardProps {
  credit: CreditSummary
  onPay: (credit: CreditSummary) => void
  onReschedule: (credit: CreditSummary) => void
}

export function CreditCard({ credit, onPay, onReschedule }: CreditCardProps) {
  const meta = STATE_META[credit.state]
  const Icon = meta.icon
  const canPay = credit.state !== "paid" && credit.state !== "cancelled"
  const nextDays = credit.nextDueDate ? daysUntil(credit.nextDueDate) : null
  const isOverdue = credit.state === "overdue"

  const reminder = buildReminderMessage(credit, canPay)

  return (
    <Card className={cn("gap-0", meta.border)}>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold truncate">{credit.customerName}</span>
              <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold", meta.chip)}>
                <span className={cn("size-1.5 rounded-full", meta.dot)} />
                {meta.label}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {credit.customerPhone} · #{credit.orderNumber}
            </p>
          </div>
          <Icon className={cn("size-5 shrink-0", meta.text)} />
        </div>

        <div className="flex items-end justify-between">
          <div>
            <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Pendiente</p>
            <p className={cn("font-heading text-xl font-black", isOverdue ? "text-red-600 dark:text-red-400" : "")}>
              {money(credit.pending)}
            </p>
          </div>
          <div className="text-right text-[11px] text-muted-foreground">
            <p>
              {credit.paidInstallments}/{credit.installmentsTotal} cuotas · <strong className="text-foreground">{credit.paidPercent}%</strong>
            </p>
            <p>Total: {money(credit.totalCredito)}</p>
          </div>
        </div>

        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div className={cn("h-full rounded-full transition-all", meta.bar)} style={{ width: `${credit.paidPercent}%` }} />
        </div>

        <div className="flex items-center gap-1.5 text-xs">
          <CalendarClock className="size-3.5 text-muted-foreground" />
          {isOverdue ? (
            <span className="text-red-600 dark:text-red-400 font-semibold">
              Vencido hace {credit.overdueDays} día{credit.overdueDays === 1 ? "" : "s"}
            </span>
          ) : nextDays !== null && credit.nextAmount !== null ? (
            <span className="text-muted-foreground">
              Próxima cuota: <strong className="text-foreground">{money(credit.nextAmount)}</strong> ·{" "}
              {nextDays <= 0 ? "hoy" : nextDays === 1 ? "mañana" : `en ${nextDays} días`} ({formatDate(credit.nextDueDate!)})
            </span>
          ) : (
            <span className="text-muted-foreground">Sin cuotas pendientes</span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <Link href={`/dashboard/creditos/${credit.orderId}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
            <ReceiptText /> Ver detalle
          </Link>
          {canPay && (
            <Button size="sm" onClick={() => onPay(credit)}>
              <ReceiptText /> Registrar abono
            </Button>
          )}
          {canPay && (
            <Button size="sm" variant="outline" onClick={() => onReschedule(credit)}>
              <CalendarClock /> Replanificar
            </Button>
          )}
          <Link
            href={whatsappLink(credit.customerPhone, reminder)}
            target="_blank"
            rel="noreferrer"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <MessageCircle /> WhatsApp
          </Link>
          <Link href={`/dashboard/creditos/${credit.orderId}#historial`} className={buttonVariants({ variant: "ghost", size: "sm" })}>
            <History /> Historial
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
