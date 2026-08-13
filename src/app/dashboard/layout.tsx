import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { redirect } from "next/navigation"
import { AlertCircle, Home, RefreshCw } from "lucide-react"
import { getCurrentStore } from "@/lib/permissions"
import { getEffectiveRate } from "@/lib/bcv"
import { DashboardTourHandler } from "@/components/dashboard/dashboard-tour-handler"
import { BcvRateProvider } from "@/lib/bcv-context"
import { SetupWizardProvider } from "@/components/dashboard/setup-wizard-provider"
import { AssistantProvider } from "@/components/assistant/assistant-provider"
import { DashboardChrome } from "@/app/dashboard/dashboard-chrome"

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
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background p-8">
        <div className="flex size-16 items-center justify-center rounded-full bg-destructive/10">
          <AlertCircle className="size-8 text-destructive/60" />
        </div>
        <div className="max-w-md text-center">
          <h1 className="mb-2 text-2xl font-bold text-foreground">No pudimos cargar tu tienda</h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Hubo un problema al cargar tus datos. Revisa tu conexión e inténtalo de nuevo. Si el problema
            persiste, cierra sesión y vuelve a entrar.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
            >
              <RefreshCw className="size-4" />
              Volver a intentar
            </button>
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
            >
              <Home className="size-4" />
              Volver al inicio
            </Link>
          </div>
        </div>
      </div>
    )
  }
}

async function DashboardLayoutInner({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user?.id) redirect("/")

  const current = await getCurrentStore()
  if (!current) redirect("/choose-plan")

  const [user, negocio, latestSubscription, activeInstallment, bcvRate] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.user.id } }).catch(() => null),
    prisma.negocio.findUnique({
      where: { userId: session.user.id },
      select: { planId: true, modalidad: true, planEstado: true, planVencimiento: true },
    }).catch(() => null),
    prisma.storeSubscription.findFirst({
      where: { storeId: current.store.id },
      orderBy: { createdAt: "desc" },
      select: { id: true, status: true, endDate: true, paymentMode: true, secondPaymentDue: true, secondPaymentPaid: true, period: true },
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
    <AssistantProvider>
      <DashboardTourHandler planType={planType}>
        <BcvRateProvider initialRate={bcvRate} initialShowBolivares={current.store.showBolivares ?? true}>
          <SetupWizardProvider
            storeId={current.store.id}
            negocioId={current.store.negocioId}
            planId={negocio?.planId || "comercio"}
            planType={planType}
            storeSetupComplete={storeSetupComplete}
          >
            <div className="flex min-h-[100dvh] bg-muted/40 text-foreground">
              <DashboardChrome
                store={current.store}
                user={user}
                role={current.role}
                planType={planType}
                planId={negocio?.planId || "comercio"}
                planEstado={negocio?.planEstado || "pendiente"}
                planVencimiento={negocio?.planVencimiento?.toISOString() || null}
                modalidad={negocio?.modalidad || null}
                latestSubscription={latestSubscription ? {
                  status: latestSubscription.status,
                  endDate: latestSubscription.endDate?.toISOString() || null,
                  paymentMode: latestSubscription.paymentMode || "single",
                  secondPaymentDue: latestSubscription.secondPaymentDue?.toISOString() || null,
                  secondPaymentPaid: latestSubscription.secondPaymentPaid,
                  period: latestSubscription.period || "monthly",
                } : null}
                activeInstallment={activeInstallment}
              >
                {children}
              </DashboardChrome>
            </div>
          </SetupWizardProvider>
        </BcvRateProvider>
      </DashboardTourHandler>
    </AssistantProvider>
  )
}
