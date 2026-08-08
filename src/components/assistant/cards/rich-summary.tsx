"use client"

import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { RichBlock } from "@/lib/conversational-actions"
import { iconByName } from "@/components/assistant/renderers/icons"
import { TONE, formatValue } from "@/components/assistant/renderers/styles"

/** Resumen con filas etiqueta/valor (FASE 5E), soporta énfasis y tonos. */
export function RichSummary({ block }: { block: Extract<RichBlock, { kind: "summary" }> }) {
  const tone = TONE[block.tone ?? "default"]
  const Icon = block.icon ? iconByName(block.icon) : null
  return (
    <Card className="rounded-2xl border bg-card/60">
      <CardHeader className="px-4 pb-2">
        <div className="flex items-center gap-2">
          {Icon ? <Icon className={cn("size-4", tone.text)} aria-hidden /> : null}
          <CardTitle className="text-sm font-semibold">{block.title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="px-4 pt-0">
        <dl className="space-y-1.5">
          {block.items.map((item, i) => {
            const itemTone = TONE[item.tone ?? "default"]
            const strong = item.emphasis === "strong"
            return (
              <div key={i} className="flex items-baseline justify-between gap-3 text-sm">
                <dt className="text-muted-foreground">{item.label}</dt>
                <dd className={cn("text-right", strong ? "text-base font-bold text-foreground" : "font-medium", item.tone ? itemTone.text : "")}>
                  {formatValue(item.value)}
                </dd>
              </div>
            )
          })}
        </dl>
      </CardContent>
    </Card>
  )
}
