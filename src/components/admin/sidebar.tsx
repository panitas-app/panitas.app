"use client"

import { useState, useCallback, memo } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard, Users, Store, Layers, TrendingUp, Activity,
  Banknote, Settings2, ChevronDown, ChevronRight, MessageCircle,
  DollarSign, Shield, CreditCard, Menu, X, Target,
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

interface NavGroup {
  label: string
  icon: any
  children: { href: string; label: string }[]
}

const groups: NavGroup[] = [
  {
    label: "Clientes Potenciales",
    icon: Target,
    children: [
      { href: "/admin/prospects", label: "Dashboard" },
      { href: "/admin/prospects/lista", label: "Prospectos" },
      { href: "/admin/prospects/seguimientos", label: "Seguimientos" },
      { href: "/admin/prospects/ganados", label: "Clientes Ganados" },
      { href: "/admin/prospects/perdidos", label: "Clientes Perdidos" },
      { href: "/admin/prospects/reportes", label: "Reportes" },
      { href: "/admin/prospects/configuracion", label: "Configuracion" },
    ],
  },
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

const AdminSidebarContent = memo(function AdminSidebarContent() {
  const pathname = usePathname()
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {}
    for (const g of groups) {
      initial[g.label] = g.children.some((c) => pathname.startsWith(c.href))
    }
    return initial
  })

  const toggle = useCallback((label: string) => {
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }))
  }, [])

  return (
    <nav className="flex-1 space-y-1 p-4">
      <Link
        href="/admin"
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors min-h-[44px]",
          pathname === "/admin"
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
        )}
      >
        <LayoutDashboard className="size-4 shrink-0" />
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
                "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors min-h-[44px]",
                anyActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <group.icon className="size-4 shrink-0" />
              <span className="flex-1 text-left">{group.label}</span>
              {isOpen ? <ChevronDown className="size-3.5 shrink-0" /> : <ChevronRight className="size-3.5 shrink-0" />}
            </button>
            {isOpen && (
              <div className="ml-4 space-y-0.5 mt-0.5 pl-3 border-l border-border">
                {group.children.map((child) => {
                  const isActive = pathname.startsWith(child.href)
                  return (
                    <Link
                      key={child.href}
                      href={child.href}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium transition-colors min-h-[36px]",
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
      <div className="border-t border-border pt-4 mt-4">
        <Link href="/dashboard" className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground min-h-[36px] px-1">
          <Shield className="size-3 shrink-0" />
          Ir al Dashboard
        </Link>
      </div>
    </nav>
  )
})

export function AdminSidebar() {
  const [mobileOpen, setMobileOpen] = useState(false)

  const closeMobile = useCallback(() => setMobileOpen(false), [])
  const openMobile = useCallback(() => setMobileOpen(true), [])

  return (
    <>
      <aside className="hidden lg:flex w-56 flex-col border-r border-border bg-background min-h-[calc(100vh-3.5rem)] sticky top-14 self-start">
        <AdminSidebarContent />
      </aside>

      <button
        onClick={openMobile}
        className="fixed top-16 left-3 z-40 lg:hidden touch-target rounded-xl bg-background/90 border border-border shadow-xs text-foreground"
        aria-label="Abrir menú admin"
      >
        <Menu className="size-5" />
      </button>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={closeMobile}
              className="fixed inset-0 z-40 perf-overlay lg:hidden"
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed inset-y-0 left-0 z-50 w-[75vw] max-w-[300px] lg:hidden overflow-y-auto bg-background shadow-2xl gpu will-change-transform"
            >
              <div className="flex items-center justify-between p-4 border-b border-border">
                <span className="text-sm font-bold">Panel Admin</span>
                <button
                  onClick={closeMobile}
                  className="touch-target rounded-full bg-muted text-foreground"
                  aria-label="Cerrar"
                >
                  <X className="size-4" />
                </button>
              </div>
              <AdminSidebarContent />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}