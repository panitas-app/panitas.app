"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import { useState } from "react"
import type { Store } from "@prisma/client"

type DayType = "Cerrado" | "Horario Corrido" | "Horario Comercial"

interface DayConfig {
  type: DayType
  open?: string
  close?: string
  reopen?: string
  reclose?: string
}

type WeekSchedule = Record<string, DayConfig>

const DAYS = [
  { key: "lun", label: "Lunes" },
  { key: "mar", label: "Martes" },
  { key: "mie", label: "Miércoles" },
  { key: "jue", label: "Jueves" },
  { key: "vie", label: "Viernes" },
  { key: "sab", label: "Sábado" },
  { key: "dom", label: "Domingo" },
]

function parseHours(raw: string | null): WeekSchedule {
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw)
    if (typeof parsed === "object" && !Array.isArray(parsed)) return parsed
  } catch {}
  // Legacy format: "8:00 AM - 8:00 PM" — apply to weekdays
  const parts = raw.split(" - ")
    if (parts.length === 2) {
      const config: DayConfig = { type: "Horario Corrido", open: parts[0].trim(), close: parts[1].trim() }
    const schedule: WeekSchedule = {}
    DAYS.forEach((d) => { schedule[d.key] = config })
    return schedule
  }
  return {}
}

export function SettingsHours({ store }: { store: Store }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [schedule, setSchedule] = useState<WeekSchedule>(() => {
    const parsed = parseHours(store.storeHours)
    // Ensure every day has at least a default
    DAYS.forEach((d) => {
      if (!parsed[d.key]) {
        parsed[d.key] = { type: "Horario Corrido", open: "8:00 AM", close: "6:00 PM" }
      }
    })
    return parsed
  })

  function updateDay(dayKey: string, patch: Partial<DayConfig>) {
    setSchedule((prev) => ({
      ...prev,
      [dayKey]: { ...prev[dayKey], ...patch } as DayConfig,
    }))
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch("/api/stores", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeHours: JSON.stringify(schedule) }),
      })
      if (!res.ok) throw new Error("Error")
      toast.success("Horarios guardados")
      router.refresh()
    } catch {
      toast.error("Error al guardar")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <p className="text-xs text-muted-foreground">Configura el horario de atención para cada día de la semana.</p>

      {DAYS.map((day, idx) => {
        const config = schedule[day.key]
        const dayType = config?.type || "Horario Corrido"

        return (
          <div key={day.key}>
            {idx > 0 && <Separator className="mb-4" />}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-foreground w-24">{day.label}</span>
                <Select
                  value={dayType}
                  onValueChange={(val) => updateDay(day.key, { type: val as DayType })}
                >
                  <SelectTrigger className="w-44 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="Cerrado">Cerrado</SelectItem>
                    <SelectItem value="Horario Corrido">Horario Corrido</SelectItem>
                    <SelectItem value="Horario Comercial">Horario Comercial</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {dayType !== "Cerrado" && (
                <div className="ml-28 flex flex-wrap items-end gap-3">
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground">Abre</Label>
                    <Input
                      className="h-9 w-28 rounded-xl text-xs"
                      value={config.open || "8:00 AM"}
                      onChange={(e) => updateDay(day.key, { open: e.target.value })}
                      placeholder="8:00 AM"
                    />
                  </div>
                  {dayType === "Horario Corrido" ? (
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground">Cierra</Label>
                      <Input
                        className="h-9 w-28 rounded-xl text-xs"
                        value={config.close || "6:00 PM"}
                        onChange={(e) => updateDay(day.key, { close: e.target.value })}
                        placeholder="6:00 PM"
                      />
                    </div>
                  ) : (
                    <>
                      <div className="space-y-1">
                        <Label className="text-[10px] text-muted-foreground">Cierra (mediodía)</Label>
                        <Input
                          className="h-9 w-28 rounded-xl text-xs"
                          value={config.close || "12:00 PM"}
                          onChange={(e) => updateDay(day.key, { close: e.target.value })}
                          placeholder="12:00 PM"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] text-muted-foreground">Reabre</Label>
                        <Input
                          className="h-9 w-28 rounded-xl text-xs"
                          value={config.reopen || "1:00 PM"}
                          onChange={(e) => updateDay(day.key, { reopen: e.target.value })}
                          placeholder="1:00 PM"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] text-muted-foreground">Cierra</Label>
                        <Input
                          className="h-9 w-28 rounded-xl text-xs"
                          value={config.reclose || "6:00 PM"}
                          onChange={(e) => updateDay(day.key, { reclose: e.target.value })}
                          placeholder="6:00 PM"
                        />
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        )
      })}

      <Button type="submit" disabled={loading} className="mt-4">
        {loading ? "Guardando..." : "Guardar horarios"}
      </Button>
    </form>
  )
}
