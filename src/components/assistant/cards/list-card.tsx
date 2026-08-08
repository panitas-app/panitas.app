"use client"

import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { RichBlock } from "@/lib/conversational-actions"
import { iconByName } from "@/components/assistant/renderers/icons"
import { TONE } from "@/components/assistant/renderers/styles"

/** Lista de entidades con icono, título, subtítulo y metadatos (FASE 5E). */
export function ListCard({ block }: { block: Extract<RichBlock, { kind: "list" }> }) {
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
      <CardContent className="space-y-2 px-4 pt-0">
        {block.items.map((item, i) => (
          <div
            key={i}
            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/60 bg-card/70 px-3 py-2.5"
          >
            <div className="flex min-w-0 items-center gap-2.5">
              <div className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg", tone.bg)}>
                {item.icon ? (() => { const ItemIcon = iconByName(item.icon); return ItemIcon ? <ItemIcon className={cn("size-4", tone.text)} aria-hidden /> : null })() : Icon ? <Icon className={cn("size-4", tone.text)} aria-hidden /> : null}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{item.title}</p>
                {item.subtitle ? <p className="truncate text-xs text-muted-foreground">{item.subtitle}</p> : null}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {item.metadata?.map((meta, j) => (
                <span key={j} className="text-xs text-muted-foreground">{meta}</span>
              ))}
              {item.badge ? <Badge variant={item.tone === "danger" ? "destructive" : "secondary"} className={cn(item.tone ? TONE[item.tone].badge : "")}>{item.badge}</Badge> : null}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
