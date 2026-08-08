"use client"

import { Banknote, HandCoins, ReceiptText, Scale, TrendingDown, TrendingUp, Wallet } from "lucide-react"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { deltaClassName, deltaIcon, deltaLabel, money, moneyCompact, type FinancialIndicators } from "./financial-types"

interface KpiCardProps {
  icon: typeof Wallet
  label: string
  value: string
  sub?: string
  accent?: string
  delta?: number | null
  deltaInverted?: boolean
  deltaPrefix?: string
}

function KpiCard({ icon: Icon, label, value, sub, accent, delta, deltaInverted, deltaPrefix }: KpiCardProps) {
  const DeltaIcon = deltaIcon(delta ?? null)
  return (
    <Card size="sm" className="gap-2">
      <div className="flex items-center gap-2">
        <div className={cn("flex size-8 items-center justify-center rounded-lg bg-muted", accent)}>
          <Icon className="size-4 text-muted-foreground" />
        </div>
        <p className="text-[11px] font-medium text-muted-foreground leading-tight">{label}</p>
      </div>
      <p className="font-heading text-lg font-black leading-none">{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
      {delta !== undefined && (
        <p className={cn("inline-flex items-center gap-1 text-[11px] font-bold", deltaClassName(delta, deltaInverted))}>
          {delta !== null && <DeltaIcon className="size-3" />}
          {deltaPrefix}
          {deltaLabel(delta) ?? "—"}
          <span className="font-normal text-muted-foreground">vs anterior</span>
        </p>
      )}
    </Card>
  )
}

interface KpiGridProps {
  indicators: FinancialIndicators
}

export function KpiGrid({ indicators }: KpiGridProps) {
  const {
    revenue,
    revenueDeltaPct,
    expenses,
    expensesDeltaPct,
    netFlow,
    totalPending,
    totalPayable,
    overdueCredits,
    overdueCreditAmount,
    overdueSupplierInvoices,
    overdueSupplierAmount,
  } = indicators

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      <KpiCard
        icon={TrendingUp}
        label="Ingresos"
        value={money(revenue)}
        sub={`${moneyCompact(revenue)} del período`}
        delta={revenueDeltaPct}
      />
      <KpiCard
        icon={TrendingDown}
        label="Gastos"
        value={money(expenses)}
        sub="registrados en el período"
        delta={expensesDeltaPct}
        deltaInverted
      />
      <KpiCard
        icon={Scale}
        label="Flujo neto"
        value={money(netFlow)}
        sub={netFlow >= 0 ? "ingresos − gastos" : "gastos > ingresos"}
        accent={cn(netFlow >= 0 && "bg-emerald-500/10 text-emerald-500", netFlow < 0 && "bg-red-500/10 text-red-500")}
      />
      <KpiCard
        icon={HandCoins}
        label="Por cobrar"
        value={money(totalPending)}
        sub={overdueCredits > 0 ? `${overdueCredits} crédito(s) vencido(s) por ${money(overdueCreditAmount)}` : "créditos al día"}
        accent="bg-emerald-500/10 text-emerald-500"
      />
      <KpiCard
        icon={Banknote}
        label="Por pagar"
        value={money(totalPayable)}
        sub={overdueSupplierInvoices > 0 ? `${overdueSupplierInvoices} factura(s) vencida(s) por ${money(overdueSupplierAmount)}` : "proveedores al día"}
        accent="bg-sky-500/10 text-sky-500"
      />
      <KpiCard
        icon={ReceiptText}
        label="Cuentas vencidas"
        value={String(overdueCredits + overdueSupplierInvoices)}
        sub={`${money(overdueCreditAmount + overdueSupplierAmount)} por cobrar y pagar`}
        accent="bg-red-500/10 text-red-500"
      />
    </div>
  )
}
