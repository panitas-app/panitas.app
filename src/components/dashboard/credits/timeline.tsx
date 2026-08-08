"use client"

import { AlertTriangle, Ban, BellRing, CheckCheck, CirclePlus, HandCoins, MessageCircleReply, RotateCcw } from "lucide-react"
import { cn } from "@/lib/utils"
import { formatDate, money, type TimelineEntry } from "./credit-types"

const TYPE_META: Record<TimelineEntry["type"], { icon: typeof HandCoins; classes: string; iconClasses: string }> = {
  created: { icon: CirclePlus, classes: "bg-emerald-100 dark:bg-emerald-950/40", iconClasses: "text-emerald-600 dark:text-emerald-400" },
  payment: { icon: HandCoins, classes: "bg-green-100 dark:bg-green-950/40", iconClasses: "text-green-600 dark:text-green-400" },
  rescheduled: { icon: RotateCcw, classes: "bg-amber-100 dark:bg-amber-950/40", iconClasses: "text-amber-600 dark:text-amber-400" },
  cancelled: { icon: Ban, classes: "bg-slate-100 dark:bg-slate-900/50", iconClasses: "text-slate-500 dark:text-slate-400" },
  overdue: { icon: AlertTriangle, classes: "bg-red-100 dark:bg-red-950/40", iconClasses: "text-red-600 dark:text-red-400" },
  completed: { icon: CheckCheck, classes: "bg-blue-100 dark:bg-blue-950/40", iconClasses: "text-blue-600 dark:text-blue-400" },
  reminder_sent: { icon: BellRing, classes: "bg-violet-100 dark:bg-violet-950/40", iconClasses: "text-violet-600 dark:text-violet-400" },
  client_responded: { icon: MessageCircleReply, classes: "bg-sky-100 dark:bg-sky-950/40", iconClasses: "text-sky-600 dark:text-sky-400" },
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
