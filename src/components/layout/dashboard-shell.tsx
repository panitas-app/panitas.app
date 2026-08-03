"use client"

import { useCallback, useEffect, useState, type ReactNode } from "react"
import type { Store as PrismaStore, User as UserType } from "@prisma/client"
import { cn } from "@/lib/utils"
import type { Role } from "@/lib/roles"
import { Sidebar } from "@/components/layout/sidebar"
import { MobileSidebar } from "@/components/layout/mobile-sidebar"
import { DashboardTopbar } from "@/components/layout/topbar"
import { BottomNav } from "@/components/layout/bottom-nav"

const SIDEBAR_KEY = "panitas:sidebar:collapsed"

interface DashboardShellProps {
  store: PrismaStore
  user: UserType | null
  role: Role
  planType: string
  planId: string
  planEstado: string
  planVencimiento: string | null
  modalidad?: string | null
  latestSubscription?: {
    status: string
    endDate: string | null
    paymentMode: string
    secondPaymentDue: string | null
    secondPaymentPaid: boolean
    period: string
  } | null
  children: ReactNode
}

/** Caparazón del dashboard (Panitas 2.0): sidebar colapsable + topbar + nav móvil. */
export function DashboardShell({
  store,
  user,
  role,
  planType,
  planId,
  planEstado,
  planVencimiento,
  modalidad = null,
  latestSubscription = null,
  children,
}: DashboardShellProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      try {
        setCollapsed(localStorage.getItem(SIDEBAR_KEY) === "1")
      } catch {}
    })
    return () => cancelAnimationFrame(id)
  }, [])

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev
      try {
        localStorage.setItem(SIDEBAR_KEY, next ? "1" : "0")
      } catch {}
      return next
    })
  }, [])

  const closeMobile = useCallback(() => setMobileOpen(false), [])

  return (
    <>
      <Sidebar store={store} role={role} planId={planId} modalidad={modalidad} collapsed={collapsed} onToggle={toggleCollapsed} />
      <MobileSidebar store={store} role={role} planId={planId} open={mobileOpen} onClose={closeMobile} />

      <div
        className={cn(
          "flex min-w-0 flex-1 flex-col transition-[padding] duration-300",
          collapsed ? "lg:pl-[76px]" : "lg:pl-64",
        )}
      >
        <DashboardTopbar
          store={store}
          user={user}
          role={role}
          planEstado={planEstado}
          planId={planId}
          planVencimiento={planVencimiento}
          latestSubscription={latestSubscription}
          onOpenMenu={() => setMobileOpen(true)}
        />
        <main className="flex-1 min-w-0 overflow-hidden p-3 pb-24 sm:p-4 md:p-6 lg:pb-6">{children}</main>
      </div>

      <BottomNav planType={planType} />
    </>
  )
}
