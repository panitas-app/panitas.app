"use client"

import { Button } from "@/components/ui/button"
import { CalendarCheck, ChevronDown, ChevronUp, Receipt } from "lucide-react"
import type { TodaySale } from "./types"

interface PosTodaySalesProps {
  todaySales: TodaySale[]
  showTodaySales: boolean
  dailyLoading: boolean
  onToggleTodaySales: () => void
  onLoadDailyReport: () => void
}

export function PosTodaySales({
  todaySales,
  showTodaySales,
  dailyLoading,
  onToggleTodaySales,
  onLoadDailyReport,
}: PosTodaySalesProps) {
  const todayTotal = todaySales.reduce((s, o) => s + o.total, 0)

  return (
    <>
      <button onClick={onToggleTodaySales} className="flex items-center justify-between px-4 py-2 text-xs font-bold text-muted-foreground hover:text-foreground border-b border-border shrink-0">
        <span className="flex items-center gap-1.5"><Receipt className="size-3.5" /> Ventas hoy</span>
        <span className="flex items-center gap-3">
          <span>{todaySales.length} ventas</span>
          <span>${todayTotal.toFixed(2)}</span>
          {showTodaySales ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
        </span>
      </button>
      {showTodaySales && (
        <div className="max-h-32 overflow-y-auto border-b border-border bg-muted/20 text-xs px-4 py-2 space-y-1 shrink-0">
          {todaySales.length === 0 ? (
            <p className="text-muted-foreground text-center py-2">Sin ventas hoy</p>
          ) : (
            todaySales.map((s) => (
              <div key={s.id} className="flex items-center justify-between py-1">
                <span className="font-medium">{s.orderNumber}</span>
                <span className="truncate flex-1 mx-2 text-muted-foreground">{s.customerName}</span>
                <span className="font-bold">${s.total.toFixed(2)}</span>
              </div>
            ))
          )}
        </div>
      )}

      <div className="flex items-center justify-between px-4 py-2 border-b border-border shrink-0 bg-sky-50 dark:bg-sky-950/20">
        <div className="flex items-center gap-2 text-xs">
          <CalendarCheck className="size-4 text-sky-600" />
          <span className="font-semibold">Reporte del día</span>
          <span className="text-muted-foreground">{todaySales.length} ventas</span>
          <span className="text-muted-foreground">· ${todayTotal.toFixed(2)}</span>
        </div>
        <Button variant="outline" size="sm" className="h-6 text-[10px]" onClick={onLoadDailyReport}>
          {dailyLoading ? "..." : "Ver detalle"}
        </Button>
      </div>
    </>
  )
}
