"use client"

import { cn } from "@/lib/utils"
import { getTemperatureInfo } from "@/lib/crm/constants"
import { Flame } from "lucide-react"

interface SalesScoringBarProps {
  score: number
  temperatura: string
}

const BAR_COLORS: Record<string, { fill: string; text: string }> = {
  frio: { fill: "bg-blue-500", text: "text-blue-600" },
  tibio: { fill: "bg-yellow-500", text: "text-yellow-600" },
  caliente: { fill: "bg-orange-500", text: "text-orange-600" },
  muy_caliente: { fill: "bg-red-500", text: "text-red-600" },
}

const ZONE_LABELS = [
  { key: "frio", label: "Frio" },
  { key: "tibio", label: "Tibio" },
  { key: "caliente", label: "Caliente" },
  { key: "muy_caliente", label: "Muy caliente" },
]

export function SalesScoringBar({ score, temperatura }: SalesScoringBarProps) {
  const tempInfo = getTemperatureInfo(temperatura)
  const colors = BAR_COLORS[temperatura] || BAR_COLORS.frio

  return (
    <div className="rounded-xl border bg-background/70 backdrop-blur-sm p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Flame className={cn("size-4", colors.text)} />
          <span className="text-sm font-medium text-muted-foreground">
            Score: <span className="text-foreground font-semibold">{score}/100</span>
          </span>
        </div>
        <span
          className={cn(
            "text-sm font-semibold px-2.5 py-0.5 rounded-full",
            tempInfo.color
          )}
        >
          {tempInfo.label}
        </span>
      </div>

      <div className="h-3 rounded-full bg-muted overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-700 ease-out", colors.fill)}
          style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
        />
      </div>

      <div className="grid grid-cols-4 gap-1">
        {ZONE_LABELS.map((zone) => (
          <div
            key={zone.key}
            className={cn(
              "text-center text-[10px] sm:text-xs font-medium",
              temperatura === zone.key
                ? "text-foreground"
                : "text-muted-foreground/60"
            )}
          >
            {zone.label}
          </div>
        ))}
      </div>
    </div>
  )
}
