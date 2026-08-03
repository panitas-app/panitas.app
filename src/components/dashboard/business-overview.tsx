import Link from "next/link"
import type { ComponentType, ReactNode } from "react"
import { AlertTriangle, CalendarClock, Package, ShoppingCart, Users, Wallet } from "lucide-react"
import { cn } from "@/lib/utils"

interface OverviewTileProps {
  label: string
  value: ReactNode
  sub?: ReactNode
  icon: ComponentType<{ className?: string }>
  tone: "brand" | "neutral" | "warn"
  href?: string
}

function OverviewTile({ label, value, sub, icon: Icon, tone, href }: OverviewTileProps) {
  const iconTone = {
    brand: "bg-brand-primary/10 text-brand-primary",
    neutral: "bg-muted text-muted-foreground",
    warn: "bg-amber-500/10 text-amber-600",
  }[tone]

  const inner = (
    <div className="flex h-full flex-col gap-2.5 rounded-2xl border border-border/60 bg-surface p-4 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
        <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-xl", iconTone)}>
          <Icon className="size-4" />
        </span>
      </div>
      <div className="font-heading text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">{value}</div>
      {sub ? <div className="text-xs text-muted-foreground">{sub}</div> : null}
    </div>
  )

  if (href) {
    return (
      <Link href={href} className="block h-full">
        {inner}
      </Link>
    )
  }
  return inner
}

export interface BusinessOverviewProps {
  mode: "sales" | "agenda"
  /** Ventas */
  todayRevenue?: number
  rate?: number | null
  todayOrders?: number
  productCount?: number
  lowStockCount?: number
  newCustomers?: number
  pendingOrders?: number
  /** Agenda */
  todayAppointments?: number
  pendingAppointments?: number
  serviceCount?: number
}

function formatMoney(value: number): string {
  return value.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/**
 * Estado del negocio en 4 cifras (Panitas Home) — FASE 4F.
 * Compacto, sin saturar: Ventas · Pedidos · Inventario · Clientes (o agenda).
 */
export function BusinessOverview({
  mode,
  todayRevenue = 0,
  rate = null,
  todayOrders = 0,
  productCount = 0,
  lowStockCount = 0,
  newCustomers = 0,
  pendingOrders = 0,
  todayAppointments = 0,
  pendingAppointments = 0,
  serviceCount = 0,
}: BusinessOverviewProps) {
  if (mode === "agenda") {
    return (
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <OverviewTile
          label="Citas hoy"
          value={todayAppointments}
          icon={CalendarClock}
          tone="brand"
          href="/dashboard/agenda"
        />
        <OverviewTile
          label="Pendientes"
          value={pendingAppointments}
          icon={AlertTriangle}
          tone={pendingAppointments > 0 ? "warn" : "neutral"}
          href="/dashboard/agenda"
        />
        <OverviewTile label="Servicios activos" value={serviceCount} icon={Package} tone="neutral" href="/dashboard/servicios" />
        <OverviewTile label="Clientes nuevos" value={newCustomers} icon={Users} tone="neutral" href="/dashboard/customers" />
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <OverviewTile
        label="Ventas hoy"
        value={
          <span className="flex flex-wrap items-baseline gap-x-1.5">
            ${formatMoney(todayRevenue)}
            {rate != null && rate > 0 && (
              <span className="font-body text-xs font-semibold text-muted-foreground">Bs. {formatMoney(todayRevenue * rate)}</span>
            )}
          </span>
        }
        sub={`${todayOrders} pedido${todayOrders === 1 ? "" : "s"} hoy`}
        icon={Wallet}
        tone="brand"
        href="/dashboard/pos"
      />
      <OverviewTile
        label="Pedidos pendientes"
        value={pendingOrders}
        sub={pendingOrders > 0 ? "por atender" : "todo al día"}
        icon={ShoppingCart}
        tone={pendingOrders > 0 ? "warn" : "neutral"}
        href="/dashboard/orders"
      />
      <OverviewTile
        label="Inventario"
        value={productCount}
        sub={
          lowStockCount > 0 ? (
            <span className="flex items-center gap-1 font-semibold text-amber-600">
              <AlertTriangle className="size-3" /> {lowStockCount} con stock bajo
            </span>
          ) : (
            "productos registrados"
          )
        }
        icon={Package}
        tone={lowStockCount > 0 ? "warn" : "neutral"}
        href="/dashboard/products"
      />
      <OverviewTile
        label="Clientes nuevos"
        value={newCustomers}
        sub="clientes de hoy"
        icon={Users}
        tone="neutral"
        href="/dashboard/customers"
      />
    </div>
  )
}
