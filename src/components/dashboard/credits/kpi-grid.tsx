"use client"

import { AlertTriangle, CalendarClock, HandCoins, Percent, ReceiptText, Wallet } from "lucide-react"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { CreditKpis, money } from "./credit-types"

interface KpiGridProps {
  kpis: CreditKpis
}

function KpiCard({ icon: Icon, label, value, sub, accent }: { icon: typeof Wallet; label: string; value: string; sub?: string; accent?: string }) {
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
    </Card>
  )
}

export function KpiGrid({ kpis }: KpiGridProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      <KpiCard
        icon={Wallet}
        label="Total por cobrar"
        value={money(kpis.totalPending)}
        sub={`${kpis.activeCredits} créditos activos`}
      />
      <KpiCard
        icon={ReceiptText}
        label="Créditos activos"
        value={String(kpis.activeCredits)}
        sub="con saldo pendiente"
      />
      <KpiCard
        icon={AlertTriangle}
        label="Vencidos"
        value={String(kpis.overdueCredits)}
        sub={money(kpis.overdueAmount)}
      />
      <KpiCard
        icon={CalendarClock}
        label="Vencen en 7 días"
        value={money(kpis.dueNext7Days)}
        sub="cuotas próximas"
      />
      <KpiCard
        icon={HandCoins}
        label="Cobrado este mes"
        value={money(kpis.recoveredThisMonth)}
        sub="abonos verificados"
      />
      <KpiCard
        icon={Percent}
        label="% recuperación"
        value={`${Math.round(kpis.recoveryRate * 100)}%`}
        sub="cobrado vs cartera"
      />
    </div>
  )
}
