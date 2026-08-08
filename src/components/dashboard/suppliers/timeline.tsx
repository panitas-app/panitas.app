"use client"

import { CirclePlus, HandCoins, ReceiptText, Truck } from "lucide-react"
import { cn } from "@/lib/utils"
import { formatDate, money, type TimelineEntry } from "./supplier-types"

const TYPE_META: Record<TimelineEntry["type"], { icon: typeof HandCoins; classes: string; iconClasses: string }> = {
  created: { icon: CirclePlus, classes: "bg-emerald-100 dark:bg-emerald-950/40", iconClasses: "text-emerald-600 dark:text-emerald-400" },
  invoice: { icon: Truck, classes: "bg-amber-100 dark:bg-amber-950/40", iconClasses: "text-amber-600 dark:text-amber-400" },
  payment: { icon: HandCoins, classes: "bg-green-100 dark:bg-green-950/40", iconClasses: "text-green-600 dark:text-green-400" },
}

export function Timeline({ entries }: { entries: TimelineEntry[] }) {
  if (entries.length === 0) {
    return <p className="text-xs text-muted-foreground py-6 text-center">Sin historial todavía.</p>
  }

  return (
    <ol className="relative space-y-4 pl-6">
      <span className="absolute top-1 left-[11px] h-[calc(100%-8px)] w-px bg-border" aria-hidden />
      {entries.map((entry, i) => {
        const meta = TYPE_META[entry.type]
        const Icon = meta.icon
        return (
          <li key={i} className="relative">
            <span className={cn("absolute -left-6 top-0 flex size-[22px] items-center justify-center rounded-full ring-2 ring-background", meta.classes)}>
              <Icon className={cn("size-3", meta.iconClasses)} />
            </span>
            <div className="flex flex-col gap-0.5">
              <div className="flex flex-wrap items-baseline justify-between gap-x-2">
                <p className="text-xs font-semibold">{entry.title}</p>
                <p className="text-[10px] text-muted-foreground">{formatDate(entry.date, true)}</p>
              </div>
              {entry.description && <p className="text-[11px] text-muted-foreground">{entry.description}</p>}
              {entry.amount !== undefined && entry.type === "payment" && (
                <p className="text-[11px] font-semibold text-green-600 dark:text-green-400">{money(entry.amount)}</p>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}

export function TimelineCardTitle() {
  return (
    <span className="flex items-center gap-2">
      <ReceiptText className="size-4 text-muted-foreground" /> Historial
    </span>
  )
}
