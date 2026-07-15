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
import { InstallmentOverdueBanner } from "@/components/dashboard/installment-overdue-banner"
import { SetupWizardProvider } from "@/components/dashboard/setup-wizard-provider"

function isRedirectError(error: any): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof error.digest === "string" &&
    error.digest.startsWith("NEXT_REDIRECT")
  )
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  try {
    return await DashboardLayoutInner({ children })
  } catch (e: any) {
    if (isRedirectError(e)) throw e
    if (e?.digest === "DYNAMIC_SERVER_USAGE") throw e
    console.error("[dashboard layout crash]", e)
    redirect("/choose-plan")
  }
}

async function DashboardLayoutInner({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user?.id) redirect("/")

  const current = await getCurrentStore()
  if (!current) redirect("/choose-plan")

  const [user, negocio, activeSubscription, bcvRate] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.user.id } }).catch(() => null),
    prisma.negocio.findUnique({
      where: { userId: session.user.id },
      select: { planId: true, modalidad: true },
    }).catch(() => null),
    prisma.storeSubscription.findFirst({
      where: {
        storeId: current.store.id,
        status: "active",
        paymentMode: "installment",
        secondPaymentPaid: false,
        secondPaymentDue: { lte: new Date() },
      },
      select: { id: true, secondPaymentDue: true, installmentAmount: true },
    }).catch(() => null),
    getEffectiveRate(),
  ])

  const planType = current.store.planType || "tienda"
  const storeSetupComplete = planType === "agenda"
    ? !!current.store.name
    : (!!current.store.description && !!current.store.name)

  return (
    <DashboardTourHandler planType={planType}>
      <NewOrdersProvider>
        <BcvRateProvider initialRate={bcvRate}>
          <SetupWizardProvider
            storeId={current.store.id}
            negocioId={current.store.negocioId}
            planId={negocio?.planId || "comercio"}
            planType={planType}
            storeSetupComplete={storeSetupComplete}
          >
            <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 text-[#050505]">
              <DashboardSidebar store={current.store} role={current.role} planId={negocio?.planId || "comercio"} modalidad={negocio?.modalidad || null} />
              <div className="flex flex-1 flex-col lg:pl-64">
                <DashboardTopbar store={current.store} user={user} role={current.role} />
                <main className="flex-1 p-4 md:p-6">
                  {activeSubscription && <InstallmentOverdueBanner subscriptionId={activeSubscription.id} dueDate={activeSubscription.secondPaymentDue!} amount={activeSubscription.installmentAmount!} />}
                  <UpgradeBannerWrapper planId={negocio?.planId || null} modalidad={negocio?.modalidad || null}>
                    {children}
                  </UpgradeBannerWrapper>
                </main>
              </div>
            </div>
          </SetupWizardProvider>
        </BcvRateProvider>
      </NewOrdersProvider>
    </DashboardTourHandler>
  )
}
