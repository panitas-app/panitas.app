"use client"

import { useState, useEffect, useCallback, useRef, useMemo, memo } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { playNotificationSound } from "@/lib/notification-sound"
import { MobileSheet } from "@/components/shared/MobileSheet"
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  BarChart3,
  Settings,
  Menu,
  Store,
  ExternalLink,
  Crown,
  Users,
  Tag,
  Calendar,
  CalendarPlus,
  MessageCircle,
  Zap,
  Layers,
  Clock,
  Palette,
  UserCircle,
  Briefcase,
  DollarSign,
  FileBarChart,
  Receipt,
  CalendarCheck,
  Banknote,
  X,
} from "lucide-react"
import type { Store as PrismaStore } from "@prisma/client"
import type { Role } from "@/lib/roles"
import { PLAN_DEFINITIONS } from "@/lib/plans"

interface SidebarItem {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  badge?: boolean
  roles?: Role[]
}

function getNavItems(planType: string): SidebarItem[] {
  const isEnterprise = planType === "empresa" || planType === "empresarial"
  const baseItems: SidebarItem[] = [
    { href: "/dashboard", label: "Inicio", icon: LayoutDashboard, roles: ["admin", "manager", "seller", "viewer"] },
  ]

  if (planType === "agenda" || planType === "reservas") {
    baseItems.push(
      { href: "/dashboard/agenda", label: "Agenda", icon: Calendar, roles: ["admin", "manager", "seller", "viewer"] },
      { href: "/dashboard/agenda/nueva", label: "Nueva cita", icon: CalendarPlus, roles: ["admin", "manager"] },
      { href: "/dashboard/horarios", label: "Horarios", icon: Clock, roles: ["admin", "manager"] },
      { href: "/dashboard/servicios", label: "Servicios", icon: Package, roles: ["admin", "manager"] },
    )
  } else {
    baseItems.push(
      { href: "/dashboard/products", label: "Productos", icon: Package, roles: ["admin", "manager", "seller", "viewer"] },
    )
    if (planType !== "emprendedor" && planType !== "tienda" && !isEnterprise) {
      baseItems.push(
        { href: "/dashboard/agenda", label: "Agenda", icon: Calendar, roles: ["admin", "manager", "seller", "viewer"] },
        { href: "/dashboard/horarios", label: "Horarios", icon: Clock, roles: ["admin", "manager"] },
        { href: "/dashboard/servicios", label: "Servicios", icon: Package, roles: ["admin", "manager"] },
      )
    }
  }

  if (planType !== "agenda" && planType !== "reservas") {
    baseItems.push(
      { href: "/dashboard/orders", label: "Pedidos", icon: ShoppingCart, badge: true, roles: ["admin", "manager", "seller", "viewer"] },
    )
  }

  baseItems.push(
    { href: "/dashboard/customers", label: "Clientes", icon: Users, roles: ["admin", "manager", "seller", "viewer"] },
  )

  if (planType === "negocio") {
    baseItems.push(
      { href: "/dashboard/pos", label: "Caja", icon: Banknote, roles: ["admin", "manager", "seller"] },
      { href: "/dashboard/creditos", label: "Créditos", icon: CalendarCheck, roles: ["admin", "manager"] },
      { href: "/dashboard/employees", label: "Empleados", icon: Briefcase, roles: ["admin", "manager"] },
    )
  }

  if (planType === "empresa" || planType === "empresarial") {
    baseItems.push(
      { href: "/dashboard/pos", label: "Caja", icon: Banknote, roles: ["admin", "manager", "seller"] },
      { href: "/dashboard/creditos", label: "Créditos", icon: CalendarCheck, roles: ["admin", "manager"] },
      { href: "/dashboard/sellers", label: "Vendedores", icon: Users, roles: ["admin", "manager"] },
      { href: "/dashboard/commissions", label: "Comisiones", icon: Receipt, roles: ["admin", "manager"] },
    )
  }

  if (planType === "emprendedor" || planType === "tienda") {
    baseItems.push(
      { href: "/dashboard/pos", label: "Caja", icon: Banknote, roles: ["admin", "manager", "seller"] },
      { href: "/dashboard/creditos", label: "Créditos", icon: CalendarCheck, roles: ["admin", "manager"] },
      { href: "/dashboard/coupons", label: "Cupones", icon: Tag, roles: ["admin", "manager"] },
    )
  }

  baseItems.push(
    { href: "/dashboard/analytics", label: "Reportes", icon: FileBarChart, roles: ["admin", "manager", "viewer", "accountant"] },
  )

  if (planType === "negocio" || planType === "empresa" || planType === "empresarial") {
    baseItems.push(
      { href: "/dashboard/finanzas", label: "Finanzas", icon: DollarSign, roles: ["admin", "manager", "accountant"] },
    )
  }

  if (!isEnterprise) {
    if (planType === "agenda" || planType === "reservas") {
      baseItems.push(
        { href: "/dashboard/edit-profile", label: "Editar perfil", icon: UserCircle, roles: ["admin", "manager"] },
      )
    } else {
      baseItems.push(
        { href: "/dashboard/edit-profile", label: "Editar tienda", icon: Palette, roles: ["admin", "manager"] },
      )
    }
  }

  baseItems.push(
    { href: "/dashboard/settings", label: "Configuración", icon: Settings, roles: ["admin", "manager", "viewer"] },
  )

  if (!isEnterprise) {
    baseItems.push(
      { href: "/pricing", label: "Ver Planes", icon: Crown, roles: ["admin"] },
    )
  }

  return baseItems
}

interface SidebarContentProps {
  store: PrismaStore
  role: Role
  planId?: string
  modalidad?: string | null
  onNavClick?: () => void
}

function sidebarPlanLabel(planId: string, modalidad: string | null | undefined): string {
  if (modalidad === "agenda") return "Agenda"
  if (planId === "negocio") return "Negocio"
  if (planId === "empresarial") return "Empresarial"
  return PLAN_DEFINITIONS[planId as keyof typeof PLAN_DEFINITIONS]?.label || "Emprendedor"
}

const SidebarContent = memo(function SidebarContent({ store, role, planId, modalidad, onNavClick }: SidebarContentProps) {
  const pathname = usePathname()
  const [pendingCount, setPendingCount] = useState(0)
  const lastViewedRef = useRef<string | null>(null)
  const prevCountRef = useRef(0)
  const soundCooldownRef = useRef(false)

  const legacyPlanType = store.planType || store.plan || "tienda"
  const isEnterprise = legacyPlanType === "empresa" || legacyPlanType === "empresarial"
  const isOnOrders = pathname === "/dashboard/orders" || pathname.startsWith("/dashboard/orders/")

  const lastViewedKey = `panitas:lastViewed:${store.id}`

  const markOrdersViewed = useCallback(() => {
    const now = new Date().toISOString()
    lastViewedRef.current = now
    try { localStorage.setItem(lastViewedKey, now) } catch {}
  }, [lastViewedKey])

  if (typeof window !== "undefined" && !lastViewedRef.current) {
    try {
      const stored = localStorage.getItem(lastViewedKey)
      if (stored) lastViewedRef.current = stored
    } catch {}
  }

  const fetchPendingCount = useCallback(async () => {
    try {
      try {
        const stored = localStorage.getItem(lastViewedKey)
        if (stored) lastViewedRef.current = stored
      } catch {}
      const params = new URLSearchParams({ status: "pending", excludePos: "true" })
      if (lastViewedRef.current) params.set("after", lastViewedRef.current)
      const res = await fetch(`/api/orders/count?${params}`)
      if (res.ok) {
        const data = await res.json()
        const newCount = data.count || 0
        if (newCount > prevCountRef.current && prevCountRef.current > 0 && !soundCooldownRef.current) {
          playNotificationSound()
          soundCooldownRef.current = true
          setTimeout(() => { soundCooldownRef.current = false }, 5000)
        }
        prevCountRef.current = newCount
        setPendingCount(newCount)
      }
    } catch (e) { console.error("[unhandled error]", e) }
  }, [lastViewedKey])

  useEffect(() => {
    fetchPendingCount()
    const interval = setInterval(fetchPendingCount, 30000)
    return () => clearInterval(interval)
  }, [fetchPendingCount])

  useEffect(() => {
    if (isOnOrders) {
      markOrdersViewed()
      setPendingCount(0)
    }
  }, [isOnOrders, markOrdersViewed])

  const planLabel = sidebarPlanLabel(planId || legacyPlanType, modalidad)

  const navItems = useMemo(() => getNavItems(legacyPlanType), [legacyPlanType])

  const visibleItems = useMemo(
    () => navItems.filter((item) => !item.roles || item.roles.includes(role)),
    [navItems, role],
  )

  return (
    <div className="flex h-full flex-col glass-dark sidebar-solid text-foreground">
      <div className="px-4 pt-4 pb-0 shrink-0">
        <div data-tour="store-info" className="flex items-center gap-3 px-2 py-1.5 mt-2">
          <div className="relative flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary shadow-lg shadow-primary/10 overflow-hidden">
            {store.logo ? (
              <img src={store.logo} alt={store.name} className="size-full object-cover" />
            ) : (
              <Store className="size-5 text-accent" />
            )}
          </div>
          <div className="flex flex-col truncate min-w-0">
            <span className="font-heading text-sm font-extrabold truncate text-foreground leading-tight">{store.name}</span>
            <span className="text-[10px] text-muted-foreground font-semibold tracking-wider uppercase">Plan {planLabel}</span>
          </div>
        </div>
        <Separator className="bg-muted mt-4" />
      </div>

      <nav className="flex-1 overflow-y-auto min-h-0 px-4 py-4 space-y-1">
        {visibleItems.map((item) => {
          const Icon = item.icon
          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname === item.href || pathname.startsWith(item.href + "/") || pathname.startsWith(item.href + "?")
          return (
            <Link key={item.href} href={item.href} onClick={onNavClick} className="relative block" data-tour={`nav-${item.label.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "-")}`}>
              <Button
                variant="ghost"
                className={cn(
                  "relative w-full justify-start gap-3 rounded-xl min-h-[44px] text-foreground/70 hover:text-foreground hover:bg-accent transition-all duration-200",
                  isActive && "text-accent hover:text-accent font-bold"
                )}
              >
                {isActive && (
                  <div
                    className="absolute inset-0 rounded-xl bg-primary shadow-md shadow-primary/10"
                  />
                )}
                <Icon className={cn("size-4.5 z-10 icon-hover-bounce shrink-0", isActive ? "text-accent" : "text-muted-foreground")} />
                <span className="z-10 truncate">{item.label}</span>
                {item.badge && pendingCount > 0 && (
                  <span
                    className="z-10 ml-auto flex size-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-foreground shadow-sm shrink-0"
                  >
                    {pendingCount > 99 ? "99+" : pendingCount}
                  </span>
                )}
              </Button>
            </Link>
          )
        })}
      </nav>

      <div className="mt-auto shrink-0 px-4 pb-4 safe-bottom">
        <Separator className="bg-muted mb-4" />
        {!isEnterprise && (
          <Link data-tour="view-store" href={`/${store.slug}`} target="_blank" rel="noopener noreferrer">
            <Button
              variant="ghost"
              className="w-full justify-center gap-2 rounded-xl bg-muted min-h-[44px] text-xs font-bold uppercase tracking-wider text-primary hover:bg-accent hover:text-foreground transition-all"
            >
              {planId === "agenda" ? "Ver mi link" : "Ver mi tienda"}
              <ExternalLink className="size-3.5 shrink-0" />
            </Button>
          </Link>
        )}
      </div>
    </div>
  )
})

export function DashboardSidebar({ store, role, planId, modalidad }: { store: PrismaStore; role: Role; planId?: string; modalidad?: string | null }) {
  const [mobileOpen, setMobileOpen] = useState(false)

  const closeMobile = useCallback(() => setMobileOpen(false), [])
  const openMobile = useCallback(() => setMobileOpen(true), [])

  return (
    <>
      <aside data-tour="sidebar" className="hidden lg:flex lg:fixed lg:inset-y-0 lg:w-64 lg:flex-col z-30 shadow-2xl overflow-hidden">
        <div className="flex flex-1 flex-col glass-dark min-h-0">
          <SidebarContent store={store} role={role} planId={planId} modalidad={modalidad} />
        </div>
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent z-10" />
      </aside>

      <button
        onClick={openMobile}
        className="fixed top-3.5 left-3.5 z-40 lg:hidden touch-target rounded-xl bg-background/90 border border-border shadow-xs text-foreground"
        aria-label="Abrir menú"
      >
        <Menu className="size-5" />
      </button>

      <MobileSheet isOpen={mobileOpen} onClose={closeMobile} className="overflow-hidden">
        <div className="relative h-full">
          <SidebarContent store={store} role={role} planId={planId} modalidad={modalidad} onNavClick={closeMobile} />
          <button
            onClick={closeMobile}
            className="absolute top-4 right-4 touch-target rounded-full bg-muted/80 text-foreground"
            aria-label="Cerrar menú"
          >
            <X className="size-4" />
          </button>
        </div>
      </MobileSheet>
    </>
  )
}