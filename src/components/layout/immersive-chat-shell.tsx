"use client"

import { useState, type ReactNode } from "react"
import Link from "next/link"
import { ExternalLink, Menu, PanelLeftClose, PanelLeftOpen, Store, X } from "lucide-react"
import type { Store as PrismaStore } from "@prisma/client"

import { cn } from "@/lib/utils"
import type { Role } from "@/lib/roles"
import { PLAN_DEFINITIONS } from "@/lib/plans"
import { SidebarNavContent } from "@/components/layout/sidebar"
import { MobileSheet } from "@/components/shared/MobileSheet"
import { useSidebarCollapsed } from "@/hooks/use-sidebar-collapsed"

interface ImmersiveChatShellProps {
  store: PrismaStore
  role: Role
  planType: string
  planId?: string
  children: ReactNode
}

function planLabel(planId?: string): string {
  return PLAN_DEFINITIONS[planId as keyof typeof PLAN_DEFINITIONS]?.label || "Emprendedor"
}

/**
 * FASE 4F+ · Ventana unificada del chat: sidebar integrado + área de contenido
 * a pantalla completa. Sustituye al shell clásico (topbar + sidebar) en el home
 * del dashboard para una experiencia inmersiva y profesional.
 */
export function ImmersiveChatShell({
  store,
  role,
  planType,
  planId,
  children,
}: ImmersiveChatShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { collapsed, toggleCollapsed } = useSidebarCollapsed()

  return (
    <div className="relative flex h-[100dvh] w-full min-w-0 overflow-hidden bg-muted/40 text-foreground">
      <aside
        className={cn(
          "relative hidden shrink-0 flex-col border-r border-border bg-background lg:flex",
          "transition-[width] duration-300",
          collapsed ? "w-[76px]" : "w-64",
        )}
      >
        <div
          className={cn(
            "flex h-16 shrink-0 items-center gap-3 border-b border-border px-4",
            collapsed && "justify-center px-0",
          )}
        >
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl brand-gradient text-white shadow-lg shadow-brand-primary/25">
            <Store className="size-5" />
          </div>
          {!collapsed && (
            <div className="flex min-w-0 flex-col">
              <span className="truncate font-heading text-sm font-extrabold leading-tight text-foreground">{store.name}</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Plan {planLabel(planId || planType)}</span>
            </div>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto px-2.5 py-4">
          <SidebarNavContent store={store} role={role} planId={planId} collapsed={collapsed} />
        </nav>

        <div className="shrink-0 border-t border-border p-2.5">
          <Link
            href={`/${store.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "flex h-10 items-center gap-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-brand-primary transition-colors hover:bg-muted/60",
              collapsed ? "justify-center px-0" : "px-3",
            )}
            title={collapsed ? "Ver mi tienda" : undefined}
          >
            <ExternalLink className="size-4 shrink-0" />
            {!collapsed && <span className="truncate">Ver mi tienda</span>}
          </Link>
        </div>

        <button
          onClick={toggleCollapsed}
          aria-label={collapsed ? "Expandir menú" : "Colapsar menú"}
          className="absolute -right-3 top-[4.5rem] z-20 flex size-6 items-center justify-center rounded-full border border-border bg-background text-muted-foreground shadow-sm transition-colors hover:text-foreground"
        >
          {collapsed ? <PanelLeftOpen className="size-3.5" /> : <PanelLeftClose className="size-3.5" />}
        </button>
      </aside>

      <MobileSheet isOpen={mobileOpen} onClose={() => setMobileOpen(false)} className="overflow-hidden">
        <div className="flex h-full flex-col bg-background text-foreground">
          <div className="flex h-16 shrink-0 items-center justify-between border-b border-border px-4">
            <div className="flex items-center gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl brand-gradient text-white">
                <Store className="size-4.5" />
              </div>
              <div className="flex min-w-0 flex-col">
                <span className="truncate font-heading text-sm font-extrabold leading-tight text-foreground">{store.name}</span>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Panitas</span>
              </div>
            </div>
            <button
              onClick={() => setMobileOpen(false)}
              aria-label="Cerrar menú"
              className="flex size-9 touch-target items-center justify-center rounded-full bg-muted text-muted-foreground"
            >
              <X className="size-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-3 py-4">
            <SidebarNavContent store={store} role={role} planId={planId} onNavClick={() => setMobileOpen(false)} />
          </div>
        </div>
      </MobileSheet>

      <div className="relative flex min-w-0 flex-1 flex-col">
        <div className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-background/90 px-4 backdrop-blur-xl lg:hidden">
          <button
            onClick={() => setMobileOpen(true)}
            aria-label="Abrir menú"
            className="flex size-9 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Menu className="size-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-lg brand-gradient text-white">
              <Store className="size-4" />
            </div>
            <span className="truncate font-heading text-sm font-extrabold text-foreground">{store.name}</span>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
      </div>
    </div>
  )
}
