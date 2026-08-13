import { getCurrentStore } from "@/lib/permissions"
import { redirect } from "next/navigation"
import { Bell } from "lucide-react"

import { FeatureLockScreen } from "@/components/ui/feature-lock-screen"
import { AttentionCenter } from "@/components/attention/attention-center"
import { hasFeature } from "@/lib/features"

export const metadata = {
  title: "Centro de Atención — Panitas",
}

export default async function AtencionPage() {
  const current = await getCurrentStore()
  if (!current) redirect("/choose-plan")

  const planRef = { plan: current.store.plan, planType: current.store.planType }
  const canUseAttention = hasFeature(planRef, "attention_center")

  if (!canUseAttention) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="mb-6">
          <h1 className="font-heading text-2xl font-bold text-foreground">Centro de Atención</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Panitas detecta las situaciones que requieren tu atención para que no pierdas ventas.
          </p>
        </div>
        <FeatureLockScreen feature="attention_center" />
      </div>
    )
  }

  return (
    <div className="h-full min-h-[calc(100vh-9rem)]">
      <div className="mb-4">
        <h1 className="flex items-center gap-2 font-heading text-2xl font-bold text-foreground">
          <Bell className="size-6 text-primary" />
          Centro de Atención
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Panitas encontró algo importante que debes revisar. Sin ruido, solo lo que requiere acción.
        </p>
      </div>
      <AttentionCenter />
    </div>
  )
}
