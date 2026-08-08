"use client"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import type { RichBlock } from "@/lib/conversational-actions"
import { QuickActions } from "@/components/assistant/actions/quick-actions"
import { iconByName } from "@/components/assistant/renderers/icons"
import { TONE, formatValue } from "@/components/assistant/renderers/styles"

/** Tarjeta informativa genérica con campos etiqueta/valor, badge, tono y acciones rápidas. */
export function RichCard({ block }: { block: Extract<RichBlock, { kind: "card" }> }) {
  const tone = TONE[block.tone ?? "default"]
  const Icon = block.icon ? iconByName(block.icon) : null
  return (
    <Card data-slot="assistant-card" data-tone={block.tone ?? "default"} className={cn("rounded-2xl", tone.bg, "border", tone.border)}>
      <CardHeader className="px-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            {Icon ? <Icon className={cn("size-4 shrink-0", tone.text)} aria-hidden /> : null}
            <CardTitle className={cn("text-sm font-semibold", block.tone && block.tone !== "default" ? tone.text : "")}>{block.title}</CardTitle>
          </div>
          {block.badge ? (
            <Badge variant={block.tone === "danger" ? "destructive" : "secondary"} className={cn("shrink-0", block.tone && block.tone !== "default" ? tone.badge : "")}>
              {block.badge}
            </Badge>
          ) : null}
        </div>
        {block.subtitle ? <p className="text-xs text-muted-foreground">{block.subtitle}</p> : null}
      </CardHeader>
      <CardContent className="px-4 pb-2">
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {block.fields.map((field, i) => {
            const fieldTone = TONE[field.tone ?? "default"]
            return (
              <div key={i} className={cn("rounded-lg border bg-card/60 px-3 py-2", field.tone ? fieldTone.border : "border-border/60")}>
                <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{field.label}</dt>
                <dd className={cn("mt-0.5 text-sm font-semibold", field.tone ? fieldTone.text : "text-foreground")}>{formatValue(field.value)}</dd>
              </div>
            )
          })}
        </dl>
        {block.actions?.length ? (
          <CardFooter className="mt-3 px-0 pb-0 pt-3">
            <QuickActions actions={block.actions} />
          </CardFooter>
        ) : null}
      </CardContent>
    </Card>
  )
}
