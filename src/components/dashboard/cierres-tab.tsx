"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CalendarCheck, ChevronRight, ChevronDown, Store, ShoppingCart, ChevronLeft } from "lucide-react"

interface DaySummary {
  date: string
  totalRevenue: number
  totalOrders: number
  paymentsBreakdown: Record<string, number>
  storeSales: number
  posSales: number
  creditSales: number
}

const monthNames = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
]

const paymentLabels: Record<string, string> = {
  cash: "Efectivo",
  bank_transfer: "Transferencia",
  pago_movil: "Pago Móvil",
  binancepay: "Binance Pay",
}

const paymentColors: Record<string, string> = {
  cash: "bg-green-100 text-green-700",
  bank_transfer: "bg-blue-100 text-blue-700",
  pago_movil: "bg-purple-100 text-purple-700",
  binancepay: "bg-orange-100 text-orange-700",
}

function getMonday(d: Date) {
  const day = d.getDay()
  const diff = d.getDate() - (day === 0 ? 6 : day - 1)
  const monday = new Date(d)
  monday.setDate(diff)
  monday.setHours(0, 0, 0, 0)
  return monday
}

function getSunday(monday: Date) {
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  return sunday
}

export default function CierresTab() {
  const [year, setYear] = useState(new Date().getFullYear())
  const [days, setDays] = useState<DaySummary[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(() => {
    const now = new Date()
    return new Set([`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`])
  })
  const [expandedWeeks, setExpandedWeeks] = useState<Set<string>>(new Set())
  const [expandedDay, setExpandedDay] = useState<string | null>(null)
  const [dayDetails, setDayDetails] = useState<Map<string, any>>(new Map())
  const [loadingDay, setLoadingDay] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setDayDetails(new Map())
    setExpandedDay(null)
    const tzOffset = new Date().getTimezoneOffset()
    fetch(`/api/reports/cierres?year=${year}&tzOffset=${tzOffset}`)
      .then((r) => r.json())
      .then((data) => setDays(data.days || []))
      .catch(() => setDays([]))
      .finally(() => setLoading(false))
  }, [year])

  const handleToggleDay = useCallback(async (date: string) => {
    if (expandedDay === date) {
      setExpandedDay(null)
      return
    }
    setExpandedDay(date)
    if (!dayDetails.has(date)) {
      setLoadingDay(date)
      try {
        const res = await fetch(`/api/reports/daily?date=${date}`)
        const data = await res.json()
        setDayDetails((prev) => new Map(prev).set(date, data))
      } catch {}
      setLoadingDay(null)
    }
  }, [expandedDay, dayDetails])

  const hierarchy = useMemo(() => {
    const years: Record<number, {
      months: Array<{
        key: string
        label: string
        num: number
        weeks: Array<{
          key: string
          label: string
          days: DaySummary[]
          weekTotal: number
          weekOrders: number
        }>
        monthTotal: number
        monthOrders: number
      }>
      yearTotal: number
      yearOrders: number
    }> = {}

    for (const day of days) {
      const d = new Date(day.date + "T12:00:00")
      const y = d.getFullYear()
      const monthKey = `${y}-${String(d.getMonth() + 1).padStart(2, "0")}`
      const monthLabel = `${monthNames[d.getMonth()]} ${y}`

      const monday = getMonday(d)
      const sunday = getSunday(monday)

      const weekKey = `${monday.toISOString().split("T")[0]}_${sunday.toISOString().split("T")[0]}`
      const weekLabel = `Semana del ${String(monday.getDate()).padStart(2, "0")}/${String(monday.getMonth() + 1).padStart(2, "0")} al ${String(sunday.getDate()).padStart(2, "0")}/${String(sunday.getMonth() + 1).padStart(2, "0")}`

      if (!years[y]) years[y] = { months: [], yearTotal: 0, yearOrders: 0 }

      let month = years[y].months.find((m) => m.key === monthKey)
      if (!month) {
        month = { key: monthKey, label: monthLabel, num: d.getMonth(), weeks: [], monthTotal: 0, monthOrders: 0 }
        years[y].months.push(month)
      }

      let week = month.weeks.find((w) => w.key === weekKey)
      if (!week) {
        week = { key: weekKey, label: weekLabel, days: [], weekTotal: 0, weekOrders: 0 }
        month.weeks.push(week)
      }

      week.days.push(day)
      week.weekTotal += day.totalRevenue
      week.weekOrders += day.totalOrders
      month.monthTotal += day.totalRevenue
      month.monthOrders += day.totalOrders
      years[y].yearTotal += day.totalRevenue
      years[y].yearOrders += day.totalOrders
    }

    for (const y of Object.keys(years)) {
      years[Number(y)].months.sort((a, b) => b.num - a.num)
      for (const month of years[Number(y)].months) {
        month.weeks.sort((a, b) => b.key.localeCompare(a.key))
        month.weeks.forEach((week) => {
          week.days.sort((a, b) => b.date.localeCompare(a.date))
        })
      }
    }

    return years
  }, [days])

  const toggleMonth = (key: string) => {
    setExpandedMonths((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const toggleWeek = (key: string) => {
    setExpandedWeeks((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  const currentYearData = hierarchy[year]
  const otherYears = Object.keys(hierarchy).map(Number).filter((y) => y !== year).sort((a, b) => b - a)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => setYear((y) => y - 1)}>
          <ChevronLeft className="size-4" />
        </Button>
        <span className="text-lg font-bold min-w-[100px] text-center">{year}</span>
        <Button variant="outline" size="sm" onClick={() => setYear((y) => y + 1)} disabled={year >= new Date().getFullYear()}>
          <ChevronRight className="size-4" />
        </Button>
      </div>

      {otherYears.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {otherYears.map((y) => (
            <Button key={y} variant="ghost" size="sm" className="text-xs" onClick={() => setYear(y)}>
              {y}
            </Button>
          ))}
        </div>
      )}

      {!currentYearData || currentYearData.months.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <CalendarCheck className="size-12 mb-3" />
            <p className="text-sm">No hay ventas en {year}</p>
          </CardContent>
        </Card>
      ) : (
        currentYearData.months.map((month) => {
          const isMonthExpanded = expandedMonths.has(month.key)
          return (
            <div key={month.key} className="rounded-xl border border-border overflow-hidden">
              <button
                onClick={() => toggleMonth(month.key)}
                className="w-full flex items-center gap-3 px-4 py-3.5 bg-muted/30 hover:bg-muted/50 transition-colors text-left"
              >
                {isMonthExpanded ? (
                  <ChevronDown className="size-5 text-muted-foreground shrink-0" />
                ) : (
                  <ChevronRight className="size-5 text-muted-foreground shrink-0" />
                )}
                <span className="font-semibold text-sm">{month.label}</span>
                <span className="text-xs text-muted-foreground ml-auto">
                  {month.monthOrders} órdenes · ${month.monthTotal.toFixed(2)}
                </span>
              </button>

              {isMonthExpanded && (
                <div className="divide-y border-t border-border">
                  {month.weeks.map((week) => {
                    const isWeekExpanded = expandedWeeks.has(week.key)
                    return (
                      <div key={week.key}>
                        <button
                          onClick={() => toggleWeek(week.key)}
                          className="w-full flex items-center gap-3 px-6 py-3 hover:bg-muted/20 transition-colors text-left"
                        >
                          {isWeekExpanded ? (
                            <ChevronDown className="size-4 text-muted-foreground shrink-0" />
                          ) : (
                            <ChevronRight className="size-4 text-muted-foreground shrink-0" />
                          )}
                          <span className="text-sm font-medium">{week.label}</span>
                          <span className="text-xs text-muted-foreground ml-auto">
                            {week.weekOrders} órdenes · ${week.weekTotal.toFixed(2)}
                          </span>
                        </button>

                        {isWeekExpanded && (
                          <div className="divide-y border-t border-border">
                            {week.days.map((day) => {
                              const isDayExpanded = expandedDay === day.date
                              return (
                                <div key={day.date}>
                                  <button
                                    onClick={() => handleToggleDay(day.date)}
                                    className="w-full flex items-center gap-3 px-8 py-3 hover:bg-muted/10 transition-colors text-left"
                                  >
                                    {loadingDay === day.date ? (
                                      <div className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent shrink-0" />
                                    ) : isDayExpanded ? (
                                      <ChevronDown className="size-4 text-muted-foreground shrink-0" />
                                    ) : (
                                      <ChevronRight className="size-4 text-muted-foreground shrink-0" />
                                    )}
                                    <span className="text-sm">
                                      Cierre del día{" "}
                                      {new Date(day.date + "T12:00:00").toLocaleDateString("es-ES", {
                                        day: "2-digit",
                                        month: "2-digit",
                                        year: "numeric",
                                      })}
                                    </span>
                                    <span className="text-xs text-muted-foreground ml-auto">
                                      {day.totalOrders} ord · ${day.totalRevenue.toFixed(2)}
                                    </span>
                                  </button>

                                  {isDayExpanded && (
                                    <div className="border-t border-border bg-muted/10 px-8 py-4 space-y-3">
                                      {loadingDay === day.date ? (
                                        <div className="flex items-center justify-center py-8">
                                          <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                                        </div>
                                      ) : dayDetails.has(day.date) ? (
                                        <DayDetail data={dayDetails.get(day.date)} />
                                      ) : null}
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })
      )}
    </div>
  )
}

function DayDetail({ data }: { data: any }) {
  if (!data || !data.orders) {
    return <p className="text-sm text-muted-foreground text-center py-4">No hay datos disponibles</p>
  }

  const totalCredit = data.orders.filter((o: any) => o.creditTerm).reduce((s: number, o: any) => s + (o.total || 0), 0)

  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-4">
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground uppercase">Ventas</p>
            <p className="text-lg font-bold">${(data.totalRevenue || 0).toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground uppercase">Órdenes</p>
            <p className="text-lg font-bold">{data.totalOrders || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground uppercase">Tienda online</p>
            <p className="text-lg font-bold">{data.storeSales || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground uppercase">POS / Tienda</p>
            <p className="text-lg font-bold">{data.posSales || 0}</p>
          </CardContent>
        </Card>
      </div>

      {data.paymentsBreakdown && Object.keys(data.paymentsBreakdown).length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(data.paymentsBreakdown).map(([method, amount]: [string, any]) => (
            <span
              key={method}
              className={`text-sm px-2.5 py-1 rounded font-medium ${paymentColors[method] || "bg-gray-100 text-gray-700"}`}
            >
              {paymentLabels[method] || method}: ${Number(amount).toFixed(2)}
            </span>
          ))}
        </div>
      )}

      {totalCredit > 0 && (
        <div className="text-xs flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          <span>Ventas a crédito:</span>
          <strong className="text-amber-700">${totalCredit.toFixed(2)}</strong>
          <span className="text-muted-foreground">
            ({data.orders.filter((o: any) => o.creditTerm).length} órdenes)
          </span>
        </div>
      )}

      <div className="space-y-2">
        {data.orders.map((o: any) => (
          <div key={o.id} className="rounded-lg border border-border p-3 space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <div
                className={`flex size-7 items-center justify-center rounded-full ${
                  o.posPin || o.shippingMethod === "pickup_store"
                    ? "bg-indigo-100 text-indigo-600"
                    : "bg-sky-100 text-sky-600"
                }`}
              >
                {o.posPin || o.shippingMethod === "pickup_store" ? (
                  <Store className="size-4" />
                ) : (
                  <ShoppingCart className="size-4" />
                )}
              </div>
              <span className="font-semibold">{o.customerName}</span>
              <span className="text-muted-foreground">#{o.orderNumber}</span>
              {o.creditTerm && <Badge className="bg-amber-100 text-amber-700 text-xs">Crédito</Badge>}
              <span className="text-muted-foreground ml-auto">
                {new Date(o.createdAt).toLocaleTimeString("es-VE", { hour: "2-digit", minute: "2-digit" })}
              </span>
              <span className="font-bold">${(o.total || 0).toFixed(2)}</span>
            </div>
            {o.items && o.items.length > 0 && (
              <div className="pl-8 space-y-0.5">
                {o.items.map((item: any) => (
                  <div key={item.id} className="flex justify-between text-muted-foreground">
                    <span>
                      {item.productName || "Producto"} x{item.quantity}
                    </span>
                    <span>${((item.price || 0) * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}
            {o.payments && o.payments.length > 0 && (
              <div className="pl-8 flex flex-wrap gap-1">
                {o.payments.map((p: any) => (
                  <span
                    key={p.id}
                    className={`text-xs px-2 py-1 rounded font-medium ${paymentColors[p.method] || "bg-gray-100"}`}
                  >
                    {paymentLabels[p.method] || p.method} ${(p.amount || 0).toFixed(2)}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
