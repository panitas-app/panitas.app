"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard, Users, Store, Layers, TrendingUp, Activity,
  Banknote, Settings2, ChevronDown, ChevronRight, MessageCircle,
  DollarSign, Shield, CreditCard,
} from "lucide-react"

interface NavGroup {
  label: string
  icon: any
  children: { href: string; label: string }[]
}

const groups: NavGroup[] = [
  {
    label: "Usuarios",
    icon: Users,
    children: [
      { href: "/admin/users", label: "Usuarios" },
      { href: "/admin/subscriptions", label: "Suscripciones" },
    ],
  },
  {
    label: "Tiendas",
    icon: Store,
    children: [
      { href: "/admin/stores", label: "Tiendas" },
      { href: "/admin/plans", label: "Planes" },
    ],
  },
  {
    label: "Analytics",
    icon: TrendingUp,
    children: [
      { href: "/admin/analytics", label: "Dashboard" },
    ],
  },
  {
    label: "Sistema",
    icon: Activity,
    children: [
      { href: "/admin/audit", label: "Auditoría" },
      { href: "/admin/bcv", label: "BCV" },
      { href: "/admin/payment-methods", label: "Métodos de pago" },
      { href: "/admin/emails", label: "Emails" },
      { href: "/admin/settings", label: "Configuración" },
    ],
  },
  {
    label: "Soporte",
    icon: MessageCircle,
    children: [
      { href: "/admin/support", label: "Tickets" },
    ],
  },
]

export function AdminSidebar() {
  const pathname = usePathname()
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {}
    for (const g of groups) {
      initial[g.label] = g.children.some((c) => pathname.startsWith(c.href))
    }
    return initial
  })

  function toggle(label: string) {
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }))
  }

  return (
    <aside className="hidden lg:flex w-56 flex-col border-r border-border bg-background min-h-[calc(100vh-3.5rem)]">
      <nav className="flex-1 space-y-1 p-4">
        {/* Dashboard (siempre visible) */}
        <Link
          href="/admin"
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
            pathname === "/admin"
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          <LayoutDashboard className="size-4" />
          Dashboard
        </Link>

        {groups.map((group) => {
          const isOpen = openGroups[group.label]
          const anyActive = group.children.some((c) => pathname.startsWith(c.href))
          return (
            <div key={group.label}>
              <button
                onClick={() => toggle(group.label)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  anyActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <group.icon className="size-4" />
                <span className="flex-1 text-left">{group.label}</span>
                {isOpen ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
              </button>
              {isOpen && (
                <div className="ml-4 space-y-0.5 mt-0.5">
                  {group.children.map((child) => {
                    const isActive = pathname.startsWith(child.href)
                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                          isActive
                            ? "bg-primary/5 text-primary"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground",
                        )}
                      >
                        {child.label}
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </nav>
      <div className="border-t border-border p-4">
        <Link href="/dashboard" className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground">
          <Shield className="size-3" />
          Ir al Dashboard
        </Link>
      </div>
    </aside>
  )
}
