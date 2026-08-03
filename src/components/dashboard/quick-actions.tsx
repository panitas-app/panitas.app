import Link from "next/link"
import type { ComponentType } from "react"
import { Banknote, CalendarPlus, Package, PackagePlus, Share2, ShoppingCart, Users } from "lucide-react"

interface QuickAction {
  href: string
  label: string
  icon: ComponentType<{ className?: string }>
  external?: boolean
}

export interface QuickActionsProps {
  isAgenda: boolean
  hasSales: boolean
  slug: string
}

/** Acciones rápidas del Panitas Home (FASE 4F) — atajos a módulos existentes. */
export function QuickActions({ isAgenda, hasSales, slug }: QuickActionsProps) {
  const actions: QuickAction[] = isAgenda
    ? [
        { href: "/dashboard/agenda/nueva", label: "Nueva cita", icon: CalendarPlus },
        { href: "/dashboard/servicios", label: "Servicios", icon: Package },
        { href: "/dashboard/customers", label: "Clientes", icon: Users },
        { href: `/${slug}`, label: "Ver mi link", icon: Share2, external: true },
      ]
    : [
        ...(hasSales ? [{ href: "/dashboard/pos", label: "Nueva venta", icon: Banknote }] : []),
        { href: "/dashboard/products/new", label: "Agregar producto", icon: PackagePlus },
        { href: "/dashboard/orders", label: "Pedidos", icon: ShoppingCart },
        { href: `/${slug}`, label: "Ver tienda", icon: Share2, external: true },
      ]

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {actions.map((action) => {
        const Icon = action.icon
        return (
          <Link
            key={action.href}
            href={action.href}
            {...(action.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-border/60 bg-surface p-4 text-center shadow-sm transition-all hover:-translate-y-0.5 hover:border-brand-primary/30 hover:shadow-md"
          >
            <span className="flex size-10 items-center justify-center rounded-xl bg-brand-soft text-brand-primary">
              <Icon className="size-4.5" />
            </span>
            <span className="text-xs font-semibold text-foreground/80">{action.label}</span>
          </Link>
        )
      })}
    </div>
  )
}
