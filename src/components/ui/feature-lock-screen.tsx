import Link from "next/link"
import { Check, Crown, Lock, Sparkles } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { featureLabel, type FeatureKey } from "@/lib/features"
import type { PanitasFeature } from "@/lib/feature-flags"

type LockFeature = FeatureKey | PanitasFeature

const DEFAULT_BENEFITS = [
  "Atención a clientes desde WhatsApp, Instagram y Facebook en una sola bandeja",
  "Respuestas sugeridas por IA para atender más rápido",
  "Análisis de clientes y oportunidades de venta detectadas automáticamente",
]

export function FeatureLockScreen({
  feature,
  benefits = DEFAULT_BENEFITS,
}: {
  feature: LockFeature
  benefits?: string[]
}) {
  const name = featureLabel(feature)

  return (
    <div className="mx-auto flex max-w-xl flex-col items-center py-10 text-center">
      <div className="relative mb-6">
        <div className="pointer-events-none absolute inset-0 scale-150 rounded-full bg-brand/20 blur-3xl" />
        <div className="relative flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand to-amber-500 text-black shadow-lg shadow-brand/30">
          <Crown className="size-8" />
        </div>
      </div>

      <Badge className="mb-3 gap-1 rounded-full border-transparent bg-brand px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-black">
        <Sparkles className="size-3" />
        Panitas Negocios Plus
      </Badge>

      <h1 className="font-heading text-3xl font-extrabold tracking-tight text-foreground">
        Esta función pertenece a Panitas Plus
      </h1>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
        {name} no está incluida en tu plan actual. Mejora a Panitas Negocios Plus para
        desbloquearla y llevar tu negocio al siguiente nivel.
      </p>

      <Card className="mt-6 w-full border-brand/20 bg-brand/5 text-left">
        <div className="flex items-center gap-2 border-b border-brand/15 px-5 py-3">
          <Lock className="size-4 text-brand" />
          <p className="text-sm font-bold text-foreground">Beneficios de Panitas Plus</p>
        </div>
        <ul className="space-y-2.5 px-5 py-4">
          {benefits.map((benefit) => (
            <li key={benefit} className="flex items-start gap-2 text-sm text-muted-foreground">
              <Check className="mt-0.5 size-4 shrink-0 text-brand" />
              {benefit}
            </li>
          ))}
        </ul>
      </Card>

      <div className="mt-6 flex w-full flex-col gap-2 sm:flex-row sm:justify-center">
        <Link href="/planes" className="flex-1 sm:flex-none">
          <Button size="lg" className="w-full gap-1.5 rounded-xl bg-brand font-bold text-black hover:brightness-105 sm:w-auto">
            <Crown className="size-4" />
            Mejorar a Panitas Plus
          </Button>
        </Link>
        <Link href="/pricing" className="flex-1 sm:flex-none">
          <Button variant="outline" size="lg" className="w-full gap-1.5 rounded-xl text-muted-foreground sm:w-auto">
            Ver precios
          </Button>
        </Link>
      </div>
    </div>
  )
}
