"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Calendar,
  Settings,
  Users,
} from "lucide-react"

interface BottomNavItem {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
}

function getBottomNavItems(planType: string): BottomNavItem[] {
  const isAgenda = planType === "agenda" || planType === "reservas"
  if (isAgenda) {
    return [
      { href: "/dashboard", label: "Inicio", icon: LayoutDashboard },
      { href: "/dashboard/agenda", label: "Agenda", icon: Calendar },
      { href: "/dashboard/customers", label: "Clientes", icon: Users },
      { href: "/dashboard/servicios", label: "Servicios", icon: Package },
      { href: "/dashboard/settings", label: "Ajustes", icon: Settings },
    ]
  }
  return [
    { href: "/dashboard", label: "Inicio", icon: LayoutDashboard },
    { href: "/dashboard/products", label: "Productos", icon: Package },
    { href: "/dashboard/orders", label: "Pedidos", icon: ShoppingCart },
    { href: "/dashboard/customers", label: "Clientes", icon: Users },
    { href: "/dashboard/settings", label: "Ajustes", icon: Settings },
  ]
}

export function BottomNav({ planType }: { planType: string }) {
  const pathname = usePathname()
  const items = getBottomNavItems(planType)

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 lg:hidden safe-bottom bg-background/95 backdrop-blur-xl border-t border-border/50 px-2 pb-1 pt-1">
      <div className="flex items-center justify-around">
        {items.map((item) => {
          const Icon = item.icon
          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname === item.href || pathname.startsWith(item.href + "/")

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex flex-col items-center justify-center gap-0.5 rounded-xl px-3 py-1.5 min-w-[56px]",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              {isActive && (
                <span className="absolute inset-x-1 -top-1 h-0.5 rounded-full bg-primary" />
              )}
              <Icon className={cn("size-5", isActive && "text-primary")} />
              <span className={cn("text-[10px] leading-tight", isActive ? "font-bold" : "font-medium")}>
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
