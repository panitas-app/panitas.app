import { getCurrentStore } from "@/lib/permissions"
import { redirect } from "next/navigation"
import { BookOpen } from "lucide-react"

import { FeatureLockScreen } from "@/components/ui/feature-lock-screen"
import { KnowledgeClient } from "@/components/knowledge/knowledge-client"
import { hasFeature } from "@/lib/features"

export const metadata = {
  title: "Base de Conocimiento — Panitas",
}

export default async function KnowledgePage() {
  const current = await getCurrentStore()
  if (!current) redirect("/choose-plan")

  const planRef = { plan: current.store.plan, planType: current.store.planType }
  const canUse = hasFeature(planRef, "knowledge_base")

  if (!canUse) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="mb-6">
          <h1 className="font-heading text-2xl font-bold text-foreground">Base de Conocimiento</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Guarda las políticas, garantías, procedimientos y manuales de tu negocio.
          </p>
        </div>
        <FeatureLockScreen feature="knowledge_base" />
      </div>
    )
  }

  return (
    <div className="h-full min-h-[calc(100vh-9rem)]">
      <div className="mb-4">
        <h1 className="flex items-center gap-2 font-heading text-2xl font-bold text-foreground">
          <BookOpen className="size-6 text-primary" />
          Base de Conocimiento
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Documentos de tu negocio para responder con precisión: políticas, garantías, procedimientos y más.
        </p>
      </div>
      <KnowledgeClient />
    </div>
  )
}
