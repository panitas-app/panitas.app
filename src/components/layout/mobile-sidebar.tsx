"use client"

import { Store, X } from "lucide-react"
import type { Store as PrismaStore } from "@prisma/client"
import type { Role } from "@/lib/roles"
import { MobileSheet } from "@/components/shared/MobileSheet"
import { SidebarNavContent } from "@/components/layout/sidebar"

interface MobileSidebarProps {
  store: PrismaStore
  role: Role
  planId?: string
  open: boolean
  onClose: () => void
}

/** Drawer de navegación móvil — FASE 4F. */
export function MobileSidebar({ store, role, planId, open, onClose }: MobileSidebarProps) {
  return (
    <MobileSheet isOpen={open} onClose={onClose} className="overflow-hidden">
      <div className="flex h-full flex-col bg-background text-foreground">
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-border/50 px-4">
          <div className="flex items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl brand-gradient text-white">
              <Store className="size-4.5" />
            </div>
            <div className="flex min-w-0 flex-col">
              <span className="truncate font-heading text-sm font-extrabold leading-tight text-foreground">{store.name}</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Panitas 2.0</span>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar menú"
            className="flex size-9 touch-target items-center justify-center rounded-full bg-muted text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-none px-3 py-4">
          <SidebarNavContent store={store} role={role} planId={planId} onNavClick={onClose} />
        </div>
      </div>
    </MobileSheet>
  )
}
