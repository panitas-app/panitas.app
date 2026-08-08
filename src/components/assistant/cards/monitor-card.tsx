"use client"

import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { RichBlock } from "@/lib/conversational-actions"
import { iconByName } from "@/components/assistant/renderers/icons"
import { TONE } from "@/components/assistant/renderers/styles"
import { QuickActions } from "@/components/assistant/actions/quick-actions"

/** Tarjeta de monitor (FASE 5E): alerta/insight con icono, tono y acciones. */
export function MonitorCard({ block }: { block: Extract<RichBlock, { kind: "monitor" }> }) {
  const tone = TONE[block.tone ?? "default"]
  const Icon = block.icon ? iconByName(block.icon) : null
  return (
    <Card className={cn("rounded-2xl border p-4", tone.bg, tone.border)} data-tone={block.tone ?? "default"}>
      <CardHeader className="gap-2 p-0">
        <div className="flex items-start justify-between gap-3">
          <div className={cn("flex size-9 shrink-0 items-center justify-center rounded-xl", tone.bg, "border", tone.border)}>
            {Icon ? <Icon className={cn("size-4.5", tone.text)} aria-hidden /> : <span className={cn("size-2 rounded-full", tone.text, "bg-current")} aria-hidden />}
          </div>
          <Badge variant={block.tone === "danger" ? "destructive" : block.tone === "warning" ? "secondary" : "secondary"} className={cn(tone.badge)}>
            {block.severity === "warning" ? "Atención" : block.severity === "critical" ? "Crítico" : "Info"}
          </Badge>
        </div>
        <CardTitle className="mt-2 text-sm font-semibold leading-snug text-foreground">{block.title}</CardTitle>
      </CardHeader>
      {block.description ? <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{block.description}</p> : null}
      {block.actions?.length ? (
        <CardContent className="mt-3 p-0">
          <QuickActions actions={block.actions} size="sm" />
        </CardContent>
      ) : null}
    </Card>
  )
}
