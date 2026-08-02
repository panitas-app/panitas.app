"use client"

import Link from "next/link"
import { Lock, Sparkles } from "lucide-react"

import { cn } from "@/lib/utils"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { PANITAS_FEATURE_DESCRIPTIONS, PANITAS_FEATURE_LABELS, type PanitasFeature } from "@/lib/feature-flags"

export function FeatureLockCard({
  feature,
  className,
}: {
  feature: PanitasFeature
  className?: string
}) {
  return (
    <Card
      className={cn(
        "relative overflow-hidden border-dashed border-brand/40 bg-brand/5",
        className,
      )}
    >
      <div className="pointer-events-none absolute -right-6 -top-6 size-24 rounded-full bg-brand/10 blur-2xl" />
      <div className="flex items-start gap-3 p-4">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand/15 text-brand">
          <Lock className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold text-foreground">{PANITAS_FEATURE_LABELS[feature]}</p>
            <Badge className="rounded-full border-transparent bg-brand px-1.5 py-0 text-[9px] font-extrabold uppercase tracking-wider text-black">
              Plus
            </Badge>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {PANITAS_FEATURE_DESCRIPTIONS[feature]}
          </p>
          <Link href="/pricing" className="mt-3 inline-flex">
            <Button variant="secondary" size="sm" className="gap-1.5 rounded-xl">
              <Sparkles className="size-3.5" />
              Desbloquear con Plus
            </Button>
          </Link>
        </div>
      </div>
    </Card>
  )
}
