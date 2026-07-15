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
    // Retry once — the initial crash may be from a transient DB error
    try {
      return await DashboardLayoutInner({ children })
    } catch (retryErr: any) {
      if (isRedirectError(retryErr)) throw retryErr
      if (retryErr?.digest === "DYNAMIC_SERVER_USAGE") throw retryErr
      console.error("[dashboard layout crash - retry failed]", retryErr)
      // Don't redirect to /choose-plan (causes loop). Show error instead.
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-8 bg-white">
          <div className="text-center max-w-md">
            <h1 className="text-2xl font-bold text-[#050505] mb-3">No se pudo cargar tu tienda</h1>
            <p className="text-sm text-gray-600 mb-1">
              Hubo un problema al crear o cargar los datos de tu tienda.
            </p>
            <p className="text-xs text-gray-400 mb-6 break-words">
              {retryErr?.message || "Error desconocido"}
            </p>
            <div className="flex gap-3 justify-center">
              <a href="/choose-plan" className="px-4 py-2 bg-[#0066FF] text-white text-sm font-semibold rounded-lg hover:bg-[#0044CC] transition-colors">
                Ir a elegir plan
              </a>
              <a href="/" className="px-4 py-2 border border-gray-200 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-50 transition-colors">
                Volver al inicio
              </a>
            </div>
          </div>
        </div>
      )
    }
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
