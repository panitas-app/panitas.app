"use client"

import Link from "next/link"
import { Bot, HandCoins, Banknote } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { assistantHref, money, TONE_META, type FinancialIndicators, type FinancialSummary } from "./financial-types"

interface ExecutiveSummaryProps {
  summary: FinancialSummary
  indicators: FinancialIndicators
}

export function ExecutiveSummary({ summary, indicators }: ExecutiveSummaryProps) {
  const tone = TONE_META[summary.tone]
  const ToneIcon = tone.icon
  const pending = indicators.totalPending
  const payable = indicators.totalPayable
  const total = pending + payable
  const pendingPct = total > 0 ? (pending / total) * 100 : 0

  return (
    <Card className="gap-3">
      <CardContent className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold", tone.chip)}>
              <ToneIcon className="size-3.5" />
              {tone.label}
            </span>
          </div>
          <Link
            href={assistantHref("cómo está la salud financiera de mi negocio")}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1.5 text-[11px] font-bold text-foreground transition-colors hover:border-primary/50 hover:text-primary"
          >
            <Bot className="size-3.5" />
            Preguntar a Panitas
          </Link>
        </div>

        <div className="space-y-1.5">
          {summary.paragraphs.map((paragraph, index) => (
            <p key={index} className="text-sm leading-relaxed text-foreground/90">
              {paragraph}
            </p>
          ))}
        </div>

        {total > 0 && (
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between text-[11px] font-bold">
              <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                <HandCoins className="size-3.5" /> Por cobrar {money(pending)}
              </span>
              <span className="inline-flex items-center gap-1 text-sky-600 dark:text-sky-400">
                <Banknote className="size-3.5" /> Por pagar {money(payable)}
              </span>
            </div>
            <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-emerald-500 transition-all"
                style={{ width: `${pendingPct}%` }}
              />
              <div
                className="h-full bg-sky-500 transition-all"
                style={{ width: `${100 - pendingPct}%` }}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
