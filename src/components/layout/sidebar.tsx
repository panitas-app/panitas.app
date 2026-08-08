"use client"

import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@/lib/utils"
import { playNotificationSound } from "@/lib/notification-sound"
import {
  Banknote,
  BookOpen,
  Bot,
  Briefcase,
  Calendar,
  CalendarCheck,
  CalendarPlus,
  Clock,
  Crown,
  ExternalLink,
  FileBarChart,
  MessageCircle,
  Megaphone,
  Package,
  Palette,
  PanelLeftClose,
  PanelLeftOpen,
  Receipt,
  Settings,
  ShoppingCart,
  Store,
  Tag,
  Truck,
  UserCircle,
  Users,
  Zap,
} from "lucide-react"
import type { Store as PrismaStore } from "@prisma/client"
import type { Role } from "@/lib/roles"
import { PLAN_DEFINITIONS } from "@/lib/plans"
import { isPlusPlan } from "@/lib/feature-flags"

export interface NavItem {
  href: string
  label: string
  icon: ComponentType<{ className?: string }>
  badge?: boolean
  plusBadge?: boolean
  roles?: Role[]
}

export interface NavSection {
  id: string
  title: string
  items: NavItem[]
}

/**
 * Estructura de navegación FASE 4F (Panitas 2.0):
 * Inicio → Panitas IA → Módulos administrativos → Configuración.
 * Mantiene el gating por plan y rol del sidebar legacy.
 */
export function getNavSections(planType: string): NavSection[] {
  const isEnterprise = planType === "empresa" || planType === "empresarial"
  const isAgenda = planType === "agenda" || planType === "reservas"
  const allRoles: Role[] = ["admin", "manager", "seller", "viewer"]

  const panitas: NavItem[] = [
    { href: "/dashboard", label: "Asistente", icon: Bot, roles: allRoles },
    { href: "/dashboard/conversaciones", label: "Conversaciones", icon: MessageCircle, plusBadge: true, roles: ["admin", "manager"] },
  ]

  const gestion: NavItem[] = []
  if (!isAgenda) {
    gestion.push({ href: "/dashboard/products", label: "Inventario", icon: Package, roles: allRoles })
  }
  if (planType === "negocio" || isEnterprise || planType === "tienda" || planType === "emprendedor") {
    gestion.push({ href: "/dashboard/pos", label: "Ventas", icon: Banknote, roles: ["admin", "manager", "seller"] })
  }
  if (!isAgenda) {
    gestion.push({ href: "/dashboard/orders", label: "Pedidos", icon: ShoppingCart, badge: true, roles: allRoles })
  }
  if (planType === "tienda" || planType === "emprendedor") {
    gestion.push({ href: "/dashboard/coupons", label: "Cupones", icon: Tag, roles: ["admin", "manager"] })
  }
  gestion.push({ href: "/dashboard/customers", label: "Clientes", icon: Users, roles: allRoles })
  gestion.push({ href: "/dashboard/knowledge", label: "Documentos", icon: BookOpen, roles: allRoles })
  if (!isAgenda) {
    gestion.push({ href: "/dashboard/creditos", label: "Créditos", icon: CalendarCheck, roles: ["admin", "manager"] })
  }
  if (!isAgenda) {
    gestion.push({ href: "/dashboard/collection", label: "Cobranza IA", icon: Megaphone, roles: ["admin", "manager"] })
  }
  if (!isAgenda) {
    gestion.push({ href: "/dashboard/suppliers", label: "Proveedores", icon: Truck, roles: ["admin", "manager"] })
  }
  if (planType === "negocio") {
    gestion.push({ href: "/dashboard/employees", label: "Empleados", icon: Briefcase, roles: ["admin", "manager"] })
  }
  if (isEnterprise) {
    gestion.push(
      { href: "/dashboard/sellers", label: "Vendedores", icon: Users, roles: ["admin", "manager"] },
      { href: "/dashboard/commissions", label: "Comisiones", icon: Receipt, roles: ["admin", "manager"] },
    )
  }
  if (isAgenda) {
    gestion.push(
      { href: "/dashboard/agenda", label: "Agenda", icon: Calendar, roles: allRoles },
      { href: "/dashboard/agenda/nueva", label: "Nueva cita", icon: CalendarPlus, roles: ["admin", "manager"] },
      { href: "/dashboard/horarios", label: "Horarios", icon: Clock, roles: ["admin", "manager"] },
      { href: "/dashboard/servicios", label: "Servicios", icon: Package, roles: ["admin", "manager"] },
    )
  } else if (planType !== "emprendedor" && planType !== "tienda" && !isEnterprise) {
    gestion.push(
      { href: "/dashboard/agenda", label: "Agenda", icon: Calendar, roles: allRoles },
      { href: "/dashboard/horarios", label: "Horarios", icon: Clock, roles: ["admin", "manager"] },
      { href: "/dashboard/servicios", label: "Servicios", icon: Package, roles: ["admin", "manager"] },
    )
  }
  gestion.push({
    href: "/dashboard/analytics",
    label: "Reportes",
    icon: FileBarChart,
    roles: ["admin", "manager", "viewer", "accountant"],
  })
  if (planType === "negocio" || isEnterprise) {
    gestion.push({ href: "/dashboard/finanzas", label: "Finanzas", icon: FileBarChart, roles: ["admin", "manager", "accountant"] })
  }

  const config: NavItem[] = []
  if (!isEnterprise) {
    config.push({
      href: "/dashboard/edit-profile",
      label: isAgenda ? "Editar perfil" : "Editar tienda",
      icon: isAgenda ? UserCircle : Palette,
      roles: ["admin", "manager"],
    })
  }
  config.push({ href: "/dashboard/settings", label: "Configuración", icon: Settings, roles: ["admin", "manager", "viewer"] })
  if (!isEnterprise) {
    config.push({ href: "/pricing", label: "Ver Planes", icon: Crown, roles: ["admin"] })
  }

  return [
    { id: "panitas", title: "Panitas IA", items: panitas },
    { id: "gestion", title: "Módulos", items: gestion },
    { id: "config", title: "Configuración", items: config },
  ]
}

function isItemActive(pathname: string, item: NavItem): boolean {
  if (item.href === "/dashboard") return pathname === "/dashboard"
  return pathname === item.href || pathname.startsWith(item.href + "/") || pathname.startsWith(item.href + "?")
}

function sidebarPlanLabel(planId: string, modalidad: string | null | undefined): string {
  if (modalidad === "agenda") return "Agenda"
  if (planId === "negocio") return "Negocio"
  if (planId === "empresarial") return "Empresarial"
  return PLAN_DEFINITIONS[planId as keyof typeof PLAN_DEFINITIONS]?.label || "Emprendedor"
}

/** Badge de pedidos pendientes (mismo comportamiento que el sidebar legacy). */
function useOrdersBadge(storeId: string, isOnOrders: boolean) {
  const [pendingCount, setPendingCount] = useState(0)
  const lastViewedRef = useRef<string | null>(null)
  const prevCountRef = useRef(0)
  const soundCooldownRef = useRef(false)
  const lastViewedKey = `panitas:lastViewed:${storeId}`

  const markViewed = useCallback(() => {
    const now = new Date().toISOString()
    lastViewedRef.current = now
    try {
      localStorage.setItem(lastViewedKey, now)
    } catch {}
  }, [lastViewedKey])

  const fetchPending = useCallback(async () => {
    try {
      if (!lastViewedRef.current) {
        try {
          lastViewedRef.current = localStorage.getItem(lastViewedKey)
        } catch {}
      }
      const params = new URLSearchParams({ status: "pending", excludePos: "true" })
      if (lastViewedRef.current) params.set("after", lastViewedRef.current)
      const res = await fetch(`/api/orders/count?${params}`)
      if (res.ok) {
        const data = await res.json()
        const newCount = data.count || 0
        if (newCount > prevCountRef.current && prevCountRef.current > 0 && !soundCooldownRef.current) {
          playNotificationSound()
          soundCooldownRef.current = true
          setTimeout(() => {
            soundCooldownRef.current = false
          }, 5000)
        }
        prevCountRef.current = newCount
        setPendingCount(newCount)
      }
    } catch (e) {
      console.error("[sidebar pending count]", e)
    }
  }, [lastViewedKey])

  useEffect(() => {
    const t = setTimeout(() => void fetchPending(), 0)
    const interval = setInterval(() => void fetchPending(), 30000)
    return () => {
      clearTimeout(t)
      clearInterval(interval)
    }
  }, [fetchPending])

  useEffect(() => {
    if (isOnOrders) {
      markViewed()
      const t = setTimeout(() => setPendingCount(0), 0)
      return () => clearTimeout(t)
    }
  }, [isOnOrders, markViewed])

  return pendingCount
}

interface SidebarNavContentProps {
  store: PrismaStore
  role: Role
  planId?: string
  collapsed?: boolean
  onNavClick?: () => void
}

/** Navegación compartida por el sidebar de escritorio y el drawer móvil. */
export function SidebarNavContent({ store, role, planId, collapsed = false, onNavClick }: SidebarNavContentProps) {
  const pathname = usePathname()
  const legacyPlanType = store.planType || store.plan || "tienda"
  const isOnOrders = pathname === "/dashboard/orders" || pathname.startsWith("/dashboard/orders/")
  const pendingCount = useOrdersBadge(store.id, isOnOrders)
  const isPlus = isPlusPlan(planId || legacyPlanType)

  const sections = useMemo(() => getNavSections(legacyPlanType), [legacyPlanType])

  const visibleSections = useMemo(
    () =>
      sections
        .map((section) => ({
          ...section,
          items: section.items.filter((item) => !item.roles || item.roles.includes(role)),
        }))
        .filter((section) => section.items.length > 0),
    [sections, role],
  )

  return (
    <div className="space-y-4">
      {visibleSections.map((section, index) => (
        <div key={section.id} className={cn("space-y-1", index > 0 && "border-t border-border/50 pt-3")}>
          {!collapsed && (
            <p className="px-2 pb-1 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground/60">
              {section.title}
            </p>
          )}
          {section.items.map((item) => {
            const Icon = item.icon
            const isActive = isItemActive(pathname, item)
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavClick}
                title={collapsed ? item.label : undefined}
                aria-label={item.label}
                data-tour={`nav-${item.label.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "-")}`}
                className={cn(
                  "group relative flex h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors",
                  collapsed && "justify-center px-0",
                  isActive
                    ? "bg-gray-100 text-gray-900"
                    : "text-foreground/70 hover:bg-muted/60 hover:text-foreground",
                )}
              >
                {isActive && <span className="absolute inset-0 rounded-xl border border-gray-200/80" />}
                <span className="relative z-10 inline-flex shrink-0">
                  <Icon
                    className={cn(
                      "size-[18px]",
                      isActive ? "text-gray-900" : "text-muted-foreground group-hover:text-foreground",
                    )}
                  />
                  {collapsed && item.badge && pendingCount > 0 && (
                    <span className="absolute -right-1.5 -top-1.5 flex size-4 min-w-4 items-center justify-center rounded-full border border-background bg-destructive px-0.5 text-[8px] font-bold leading-none text-white shadow-sm">
                      {pendingCount > 99 ? "99+" : pendingCount}
                    </span>
                  )}
                  {collapsed && item.plusBadge && !isPlus && (
                    <span
                      className="absolute -right-1 -top-1 size-2 rounded-full bg-brand shadow-sm"
                      title="Requiere plan Plus"
                    />
                  )}
                </span>
                {!collapsed && <span className="relative z-10 flex-1 truncate">{item.label}</span>}
                {!collapsed && item.badge && pendingCount > 0 && (
                  <span className="relative z-10 ml-auto flex size-5 shrink-0 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white shadow-sm">
                    {pendingCount > 99 ? "99+" : pendingCount}
                  </span>
                )}
                {!collapsed && item.plusBadge && !isPlus && (
                  <span className="relative z-10 ml-auto inline-flex shrink-0 items-center gap-0.5 rounded-full bg-brand px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-black">
                    <Zap className="size-2.5" />
                    Plus
                  </span>
                )}
              </Link>
            )
          })}
        </div>
      ))}
    </div>
  )
}

interface SidebarProps {
  store: PrismaStore
  role: Role
  planId?: string
  modalidad?: string | null
  collapsed: boolean
  onToggle: () => void
}

/** Sidebar de escritorio, colapsable (solo iconos) — FASE 4F. */
export function Sidebar({ store, role, planId, modalidad, collapsed, onToggle }: SidebarProps) {
  const legacyPlanType = store.planType || store.plan || "tienda"
  const isEnterprise = legacyPlanType === "empresa" || legacyPlanType === "empresarial"
  const planLabel = sidebarPlanLabel(planId || legacyPlanType, modalidad)

  return (
    <aside
      data-tour="sidebar"
      className={cn(
        "fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-border/60 bg-background/95 backdrop-blur-xl lg:flex",
        "transition-[width] duration-300",
        collapsed ? "w-[76px]" : "w-64",
      )}
    >
      <div
        className={cn(
          "flex h-16 shrink-0 items-center gap-3 border-b border-border/50 px-4",
          collapsed && "justify-center px-0",
        )}
      >
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl brand-gradient text-white shadow-lg shadow-brand-primary/25">
          <Store className="size-5" />
        </div>
        {!collapsed && (
          <div className="flex min-w-0 flex-col">
            <span className="truncate font-heading text-sm font-extrabold leading-tight text-foreground">{store.name}</span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Plan {planLabel}</span>
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-2.5 py-4">
        <SidebarNavContent store={store} role={role} planId={planId} collapsed={collapsed} />
      </nav>

      <div className="shrink-0 border-t border-border/50 p-2.5">
        {!isEnterprise && (
          <Link
            href={`/${store.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "flex h-10 items-center gap-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-brand-primary transition-colors hover:bg-brand-soft",
              collapsed ? "justify-center px-0" : "px-3",
            )}
            title={collapsed ? "Ver mi tienda" : undefined}
          >
            <ExternalLink className="size-4 shrink-0" />
            {!collapsed && <span className="truncate">{planId === "agenda" ? "Ver mi link" : "Ver mi tienda"}</span>}
          </Link>
        )}
      </div>

      <button
        onClick={onToggle}
        aria-label={collapsed ? "Expandir menú" : "Colapsar menú"}
        className="absolute -right-3 top-[4.5rem] z-20 flex size-6 items-center justify-center rounded-full border border-border bg-background text-muted-foreground shadow-sm transition-colors hover:text-foreground"
      >
        {collapsed ? <PanelLeftOpen className="size-3.5" /> : <PanelLeftClose className="size-3.5" />}
      </button>
    </aside>
  )
}
