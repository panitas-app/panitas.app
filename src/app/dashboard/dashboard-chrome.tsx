"use client"

import { usePathname } from "next/navigation"
import type { ReactNode } from "react"
import type { Store as PrismaStore, User as UserType } from "@prisma/client"

import type { Role } from "@/lib/roles"
import { DashboardShell } from "@/components/layout/dashboard-shell"
import { ImmersiveChatShell } from "@/components/layout/immersive-chat-shell"
import { AssistantDashboardChrome } from "@/components/assistant/assistant-dashboard-chrome"
import { InstallmentOverdueBanner } from "@/components/dashboard/installment-overdue-banner"
import { UpgradeBannerWrapper } from "@/components/dashboard/upgrade-banner-wrapper"

interface DashboardChromeProps {
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
  activeInstallment?: {
    id: string
    secondPaymentDue: Date | null
    installmentAmount: number | null
  } | null
  children: ReactNode
}

/**
 * FASE 4F+ · Chrome del dashboard: en el home (/dashboard) renderiza la
 * ventana unificada oscura (ImmersiveChatShell) sin banners; en el resto de
 * secciones conserva el shell clásico con sus banners y el asistente flotante.
 */
export function DashboardChrome({
  store,
  user,
  role,
  planType,
  planId,
  planEstado,
  planVencimiento,
  modalidad = null,
  latestSubscription = null,
  activeInstallment = null,
  children,
}: DashboardChromeProps) {
  const pathname = usePathname()
  const isHome = pathname === "/dashboard"

  if (isHome) {
    return (
      <ImmersiveChatShell store={store} role={role} planType={planType} planId={planId}>
        {children}
      </ImmersiveChatShell>
    )
  }

  return (
    <DashboardShell
      store={store}
      user={user}
      role={role}
      planType={planType}
      planId={planId}
      planEstado={planEstado}
      planVencimiento={planVencimiento}
      modalidad={modalidad}
      latestSubscription={latestSubscription}
    >
      {activeInstallment && activeInstallment.installmentAmount != null && activeInstallment.secondPaymentDue && (
        <InstallmentOverdueBanner
          subscriptionId={activeInstallment.id}
          dueDate={activeInstallment.secondPaymentDue}
          amount={activeInstallment.installmentAmount}
        />
      )}
      <UpgradeBannerWrapper planId={planId} modalidad={modalidad}>
        {children}
      </UpgradeBannerWrapper>
      <AssistantDashboardChrome />
    </DashboardShell>
  )
}
