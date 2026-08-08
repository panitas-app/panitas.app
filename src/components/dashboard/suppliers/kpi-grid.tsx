"use client"

import { AlertTriangle, CalendarClock, HandCoins, PackageCheck, ReceiptText, Wallet } from "lucide-react"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { SupplierKpis, money } from "./supplier-types"

interface KpiGridProps {
  kpis: SupplierKpis
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
        label="Total por pagar"
        value={money(kpis.totalPayable)}
        sub={`${kpis.activeSuppliers} proveedores activos`}
      />
      <KpiCard
        icon={ReceiptText}
        label="Facturas abiertas"
        value={String(kpis.pendingInvoices)}
        sub="pendientes por cobrar"
      />
      <KpiCard
        icon={AlertTriangle}
        label="Vencidas"
        value={String(kpis.overdueInvoices)}
        sub={money(kpis.overdueAmount)}
      />
      <KpiCard
        icon={CalendarClock}
        label="Vencen en 7 días"
        value={money(kpis.dueNext7Days)}
        sub="próximos vencimientos"
      />
      <KpiCard
        icon={HandCoins}
        label="Pagado este mes"
        value={money(kpis.paidThisMonth)}
        sub="abonos registrados"
      />
      <KpiCard
        icon={PackageCheck}
        label="Proveedores activos"
        value={String(kpis.activeSuppliers)}
        sub="con cuentas por pagar"
      />
    </div>
  )
}
