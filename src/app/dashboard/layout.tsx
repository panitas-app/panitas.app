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

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "tienda"
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  let current = await getCurrentStore()

  // Auto-create Negocio + Store if missing (e.g. Google OAuth first time)
  if (!current) {
    const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { name: true } })
    const name = user?.name || "Mi Tienda"
    const slug = slugify(name) + "-" + session.user.id.slice(0, 6)

    for (const p of [
      { id: "agenda", nombre: "agenda", label: "Agenda", precioUsd: 15, precioUsdAnual: 150, sortOrder: 1 },
      { id: "comercio", nombre: "comercio", label: "Comercio", precioUsd: 25, precioUsdAnual: 250, sortOrder: 2 },
      { id: "mayorista", nombre: "mayorista", label: "Mayorista", precioUsd: 45, precioUsdAnual: 450, sortOrder: 3 },
      { id: "basico", nombre: "basico", label: "Agenda", precioUsd: 15, precioUsdAnual: 150, sortOrder: 1 },
      { id: "negocio", nombre: "negocio", label: "Comercio", precioUsd: 25, precioUsdAnual: 250, sortOrder: 2 },
      { id: "empresarial", nombre: "empresarial", label: "Mayorista", precioUsd: 45, precioUsdAnual: 450, sortOrder: 3 },
    ]) {
      await prisma.plan.upsert({
        where: { id: p.id },
        update: {},
        create: { ...p, descripcion: "", activo: true },
      })
    }

    const negocio = await prisma.negocio.create({
      data: {
        nombre: name, slug, planId: "comercio",
        modalidad: null, planEstado: "pendiente",
        planVencimiento: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        userId: session.user.id,
      },
    })

    await prisma.store.create({
      data: {
        name, slug, userId: session.user.id, negocioId: negocio.id,
        plan: "free", planType: "tienda", planStatus: "pendiente",
        members: { create: { userId: session.user.id, role: "admin" } },
      },
    })

    current = await getCurrentStore()
    if (!current) redirect("/login")
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } })

  const negocio = await prisma.negocio.findUnique({
    where: { userId: session.user.id },
    select: { planId: true, modalidad: true },
  })

  // Check for overdue second installment
  const activeSubscription = await prisma.storeSubscription.findFirst({
    where: {
      storeId: current.store.id,
      status: "active",
      paymentMode: "installment",
      secondPaymentPaid: false,
      secondPaymentDue: { lte: new Date() },
    },
    select: { id: true, secondPaymentDue: true, installmentAmount: true },
  })

  const bcvRate = await getEffectiveRate()

  const planType = current.store.planType || "tienda"

  return (
    <DashboardTourHandler planType={planType}>
      <NewOrdersProvider>
        <BcvRateProvider initialRate={bcvRate}>
          <SetupWizardProvider
            storeId={current.store.id}
            negocioId={current.store.negocioId}
            planId={negocio?.planId || "comercio"}
            planType={planType}
            storeSetupComplete={!!current.store.description && !!current.store.name}
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
