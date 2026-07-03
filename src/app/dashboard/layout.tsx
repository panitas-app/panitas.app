import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { DashboardSidebar } from "@/components/dashboard/sidebar"
import { DashboardTopbar } from "@/components/dashboard/topbar"
import { NewOrdersProvider } from "@/components/dashboard/new-orders-provider"
import { getCurrentStore } from "@/lib/permissions"
import { UpgradeBannerWrapper } from "@/components/dashboard/upgrade-banner-wrapper"
import { getEffectiveRate } from "@/lib/bcv"
import { DashboardTourHandler } from "@/components/dashboard/dashboard-tour-handler"
import { BcvRateProvider } from "@/lib/bcv-context"
import { PanaIaFloating } from "@/components/dashboard/pana-ia-floating"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const current = await getCurrentStore()
  if (!current) redirect("/onboarding")

  const user = await prisma.user.findUnique({ where: { id: session.user.id } })

  const negocio = await prisma.negocio.findUnique({
    where: { userId: session.user.id },
    select: { planId: true, modalidad: true },
  })

  const bcvRate = await getEffectiveRate()

  // Map to planType used by tour registry
  const planType = current.store.planType || "tienda"

  return (
    <DashboardTourHandler planType={planType}>
      <NewOrdersProvider>
        <BcvRateProvider initialRate={bcvRate}>
          <div className="flex min-h-screen bg-background text-foreground">
            <PanaIaFloating businessName={current.store.name} storeType={planType} />
            <DashboardSidebar store={current.store} role={current.role} />
            <div className="flex flex-1 flex-col lg:pl-64">
              <DashboardTopbar store={current.store} user={user} role={current.role} />
              <main className="flex-1 p-4 md:p-6">
                <UpgradeBannerWrapper planId={negocio?.planId || null} modalidad={negocio?.modalidad || null}>
                  {children}
                </UpgradeBannerWrapper>
              </main>
            </div>
          </div>
        </BcvRateProvider>
      </NewOrdersProvider>
    </DashboardTourHandler>
  )
}
