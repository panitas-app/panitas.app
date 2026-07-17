"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Separator } from "@/components/ui/separator"
import { motion } from "framer-motion"
import { playNotificationSound } from "@/lib/notification-sound"
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

  // Empresarial: vendedores, comisiones
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

  // Editar tienda / perfil (not for enterprise)
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

  // Ver Planes (not for enterprise)
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
}

function sidebarPlanLabel(planId: string, modalidad: string | null | undefined): string {
  if (modalidad === "agenda") return "Agenda"
  if (planId === "negocio") return "Negocio"
  if (planId === "empresarial") return "Empresarial"
  return PLAN_DEFINITIONS[planId as keyof typeof PLAN_DEFINITIONS]?.label || "Emprendedor"
}

function SidebarContent({ store, role, planId, modalidad }: SidebarContentProps) {
  const pathname = usePathname()
  const [pendingCount, setPendingCount] = useState(0)
  const lastViewedRef = useRef<string | null>(null)
  const prevCountRef = useRef(0)
  const soundCooldownRef = useRef(false)

  const legacyPlanType = store.planType || store.plan || "tienda"
  const isEnterprise = legacyPlanType === "empresa" || legacyPlanType === "empresarial"
  const isOnOrders = pathname === "/dashboard/orders" || pathname.startsWith("/dashboard/orders/")

  const fetchPendingCount = useCallback(async () => {
    try {
      const params = new URLSearchParams({ status: "pending" })
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
  }, [])

  useEffect(() => {
    fetchPendingCount()
    const interval = setInterval(fetchPendingCount, 30000)
    return () => clearInterval(interval)
  }, [fetchPendingCount])

  useEffect(() => {
    if (isOnOrders && pendingCount > 0) {
      lastViewedRef.current = new Date().toISOString()
      setPendingCount(0)
    }
  }, [isOnOrders])

  const planLabel = sidebarPlanLabel(planId || legacyPlanType, modalidad)
  const navItems = getNavItems(legacyPlanType)

  const visibleItems = navItems.filter((item) => {
    if (item.roles && !item.roles.includes(role)) return false
    return true
  })

  return (
    <div className="flex h-full flex-col glass-dark text-foreground">
      <div className="px-5 pt-5 pb-0 shrink-0">
        <div data-tour="store-info" className="flex items-center gap-3 px-2 py-1.5 mt-2">
          <div className="relative flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary shadow-lg shadow-primary/10 overflow-hidden">
            {store.logo ? (
              <img src={store.logo} alt={store.name} className="size-full object-cover" />
            ) : (
              <Store className="size-5 text-accent" />
            )}
          </div>
          <div className="flex flex-col truncate">
            <span className="font-heading text-sm font-extrabold truncate text-foreground leading-tight">{store.name}</span>
            <span className="text-[10px] text-muted-foreground font-semibold tracking-wider uppercase">Plan {planLabel}</span>
          </div>
        </div>
        <Separator className="bg-muted mt-4" />
      </div>

      <nav className="flex-1 overflow-y-auto min-h-0 px-5 py-4 space-y-2">
        {visibleItems.map((item) => {
          const Icon = item.icon
          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname === item.href || pathname.startsWith(item.href + "/") || pathname.startsWith(item.href + "?")
          return (
            <Link key={item.href} href={item.href} className="relative block" data-tour={`nav-${item.label.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "-")}`}>
              <Button
                variant="ghost"
                className={cn(
                  "relative w-full justify-start gap-3 rounded-xl py-5 text-foreground/70 hover:text-foreground hover:bg-accent transition-all duration-200",
                  isActive && "text-accent hover:text-accent font-bold"
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeSidebarTab"
                    className="absolute inset-0 rounded-xl bg-primary shadow-md shadow-primary/10"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                
                <Icon className={cn("size-4.5 z-10 icon-hover-bounce", isActive ? "text-accent" : "text-muted-foreground")} />
                <span className="z-10">{item.label}</span>
                {item.badge && pendingCount > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="z-10 ml-auto flex size-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-foreground shadow-sm"
                  >
                    {pendingCount > 99 ? "99+" : pendingCount}
                  </motion.span>
                )}
              </Button>
            </Link>
          )
        })}
      </nav>

      <div className="mt-auto shrink-0 px-5 pb-5">
        <Separator className="bg-muted mb-4" />
        
        {!isEnterprise && (
          <Link data-tour="view-store" href={`/store/${store.slug}`} target="_blank" rel="noopener noreferrer">
            <Button
              variant="ghost"
              className="w-full justify-center gap-2 rounded-xl bg-muted py-5 text-xs font-bold uppercase tracking-wider text-primary hover:bg-accent hover:text-foreground transition-all"
            >
              Ver mi tienda
              <ExternalLink className="size-3.5" />
            </Button>
          </Link>
        )}
      </div>
    </div>
  )
}

export function DashboardSidebar({ store, role, planId, modalidad }: { store: PrismaStore; role: Role; planId?: string; modalidad?: string | null }) {
  return (
    <>
      <aside data-tour="sidebar" className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col z-30 shadow-2xl overflow-hidden">
        <div className="flex flex-1 flex-col glass-dark min-h-0">
          <SidebarContent store={store} role={role} planId={planId} modalidad={modalidad} />
        </div>
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent z-10" />
      </aside>
      
      <Sheet>
        <SheetTrigger render={<Button variant="outline" size="icon" className="fixed top-3.5 left-3.5 z-40 lg:hidden rounded-xl border-border bg-muted backdrop-blur-md text-foreground shadow-xs hover:bg-white/20" />}>
          <Menu className="size-4 text-slate-700" />
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0 border-r-0">
          <SidebarContent store={store} role={role} planId={planId} modalidad={modalidad} />
        </SheetContent>
      </Sheet>
    </>
  )
}
