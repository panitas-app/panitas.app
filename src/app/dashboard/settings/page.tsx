import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SettingsGeneral } from "@/components/dashboard/settings-general"
import { TourResetButton } from "@/components/dashboard/tour-reset-button"
import { SettingsPayments } from "@/components/dashboard/settings-payments"
import { TeamSettings } from "@/components/dashboard/team-settings"
import { SettingsSubscription } from "@/components/dashboard/settings-subscription"
import { SettingsCredit } from "@/components/dashboard/settings-credit"
import { getCurrentStore } from "@/lib/permissions"

interface Props {
  searchParams?: Promise<{ tab?: string }>
}

export default async function SettingsPage(props: Props) {
  const current = await getCurrentStore()
  if (!current) redirect("/onboarding")

  const searchParams = await props.searchParams

  const planType = current.store.planType || current.store.plan || "tienda"
  const isNegocio = planType === "negocio"
  const isEnterprise = planType === "empresa" || planType === "empresarial"
  const isAdmin = current.role === "admin"

  const validTabs = ["general", "payments", ...(isAdmin ? ["subscription"] : []), ...(isNegocio && isAdmin ? ["team"] : []), ...(isEnterprise ? ["credit"] : [])]
  const defaultTab = validTabs.includes(searchParams?.tab || "") ? searchParams!.tab! : "general"

  const paymentAccounts = await prisma.paymentAccount.findMany({
    where: { storeId: current.store.id },
  })

  const storeWithAccounts = { ...current.store, paymentAccounts }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <h1 className="text-center font-heading text-xl font-semibold">Configuración</h1>

      <Tabs defaultValue={defaultTab}>
        <TabsList className="w-full justify-start flex-nowrap overflow-x-auto scrollbar-none">
          <TabsTrigger value="general">Envío</TabsTrigger>
          <TabsTrigger value="payments">Cuentas de pago</TabsTrigger>
          {isNegocio && isAdmin && <TabsTrigger value="team">Equipo</TabsTrigger>}
          {isAdmin && <TabsTrigger value="subscription">Suscripción</TabsTrigger>}
          {isEnterprise && <TabsTrigger value="credit">Crédito</TabsTrigger>}
        </TabsList>

        <TabsContent value="general" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Configuración de Envío</CardTitle>
            </CardHeader>
            <CardContent>
              <SettingsGeneral store={storeWithAccounts} />
              <div className="mt-6 pt-6 border-t border-border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Tour guiado</p>
                    <p className="text-xs text-muted-foreground">Repite el recorrido interactivo por el dashboard</p>
                  </div>
                  <TourResetButton />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Cuentas de Pago</CardTitle>
            </CardHeader>
            <CardContent>
              <SettingsPayments store={storeWithAccounts} />
            </CardContent>
          </Card>
        </TabsContent>

        {isNegocio && isAdmin && (
          <TabsContent value="team" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Gestión de Equipo</CardTitle>
              </CardHeader>
              <CardContent>
                <TeamSettings storeId={current.store.id} />
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {isAdmin && (
          <TabsContent value="subscription" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Suscripción y Plan</CardTitle>
              </CardHeader>
              <CardContent>
                <SettingsSubscription storeId={current.store.id} storePlan={current.store.plan} />
              </CardContent>
            </Card>
          </TabsContent>
        )}
        {isEnterprise && (
          <TabsContent value="credit" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Configuración de Crédito</CardTitle>
              </CardHeader>
              <CardContent>
                <SettingsCredit storeId={current.store.id} initialCreditDays={current.store.creditDays} />
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
