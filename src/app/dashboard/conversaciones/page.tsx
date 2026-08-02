import { getCurrentStore } from "@/lib/permissions"
import { redirect } from "next/navigation"
import { MessageCircle } from "lucide-react"

import { FeatureLockScreen } from "@/components/ui/feature-lock-screen"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { hasFeature } from "@/lib/features"

export const metadata = {
  title: "Conversaciones — Panitas",
}

export default async function ConversacionesPage() {
  const current = await getCurrentStore()
  if (!current) redirect("/choose-plan")

  const planRef = { plan: current.store.plan, planType: current.store.planType }
  const canUseChat = hasFeature(planRef, "unified_chat")

  if (!canUseChat) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="mb-6">
          <h1 className="font-heading text-2xl font-bold text-foreground">Conversaciones</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Centraliza el chat con tus clientes desde un solo lugar.
          </p>
        </div>
        <FeatureLockScreen feature="unified_chat" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <h1 className="flex items-center gap-2 font-heading text-2xl font-bold text-foreground">
          <MessageCircle className="size-6 text-primary" />
          Conversaciones
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tu bandeja unificada de clientes. Disponible próximamente en una actualización.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Próximamente</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Este módulo se activará en la próxima fase. Mientras tanto, puedes contactar a tus
          clientes desde la lista de clientes.
        </CardContent>
      </Card>
    </div>
  )
}
