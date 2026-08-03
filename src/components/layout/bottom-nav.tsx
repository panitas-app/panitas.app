"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Bot, Calendar, LayoutDashboard, Package, Settings, Users } from "lucide-react"

interface BottomNavItem {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  featured?: boolean
}

function getBottomNavItems(planType: string): BottomNavItem[] {
  const isAgenda = planType === "agenda" || planType === "reservas"
  if (isAgenda) {
    return [
      { href: "/dashboard", label: "Inicio", icon: LayoutDashboard },
      { href: "/dashboard/agenda", label: "Agenda", icon: Calendar },
      { href: "/dashboard/assistant", label: "Panitas", icon: Bot, featured: true },
      { href: "/dashboard/servicios", label: "Servicios", icon: Package },
      { href: "/dashboard/settings", label: "Más", icon: Settings },
    ]
  }
  return [
    { href: "/dashboard", label: "Inicio", icon: LayoutDashboard },
    { href: "/dashboard/products", label: "Productos", icon: Package },
    { href: "/dashboard/assistant", label: "Panitas", icon: Bot, featured: true },
    { href: "/dashboard/customers", label: "Clientes", icon: Users },
    { href: "/dashboard/settings", label: "Más", icon: Settings },
  ]
}

/** Navegación inferior móvil (Panitas 2.0) — FASE 4F. */
export function BottomNav({ planType }: { planType: string }) {
  const pathname = usePathname()
  const items = getBottomNavItems(planType)

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-border/60 bg-background/95 px-2 pb-1 pt-1 safe-bottom gpu contain-paint lg:hidden">
      <div className="flex items-center justify-around">
        {items.map((item) => {
          const Icon = item.icon
          const isActive =
            item.href === "/dashboard" ? pathname === "/dashboard" : pathname === item.href || pathname.startsWith(item.href + "/")

          if (item.featured) {
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-label={item.label}
                className={cn(
                  "relative flex flex-col items-center justify-center gap-0.5 rounded-xl px-3 py-1.5 min-w-[56px]",
                  isActive ? "text-brand-primary" : "text-muted-foreground",
                )}
              >
                <span
                  className={cn(
                    "flex size-9 items-center justify-center rounded-full brand-gradient text-white shadow-lg shadow-brand-primary/30 transition-transform",
                    isActive && "scale-105",
                  )}
                >
                  <Icon className="size-4.5" />
                </span>
                <span className={cn("text-[10px] leading-tight", isActive ? "font-bold" : "font-medium")}>{item.label}</span>
              </Link>
            )
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex flex-col items-center justify-center gap-0.5 rounded-xl px-3 py-1.5 min-w-[56px]",
                isActive ? "text-brand-primary" : "text-muted-foreground",
              )}
            >
              {isActive && <span className="absolute inset-x-1 -top-1 h-0.5 rounded-full bg-brand-primary" />}
              <Icon className={cn("size-5", isActive && "text-brand-primary")} />
              <span className={cn("text-[10px] leading-tight", isActive ? "font-bold" : "font-medium")}>{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
