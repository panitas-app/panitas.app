"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import {
  Clock,
  Moon,
  Sun,
  X,
  Pencil,
  Save,
  ArrowRight,
  Power,
  Sparkles,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"

type DayType = "Cerrado" | "Horario Corrido" | "Horario Comercial"

interface DayConfig {
  type: DayType
  open?: string
  close?: string
  reopen?: string
  reclose?: string
  enabled?: boolean
  morningEnabled?: boolean
  afternoonEnabled?: boolean
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

const DEFAULTS = {
  open: "09:00",
  close: "18:00",
  lunchClose: "12:00",
  reopen: "14:00",
  reclose: "18:00",
}

function to12h(time: string): string {
  if (!time) return ""
  const parts = time.match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i)
  if (!parts) return time
  let h = parseInt(parts[1])
  const m = parts[2]
  if (parts[3]) return `${h}:${m} ${parts[3].toUpperCase()}`
  const ampm = h >= 12 ? "PM" : "AM"
  if (h === 0) h = 12
  else if (h > 12) h -= 12
  return `${h}:${m} ${ampm}`
}

function to24h(time: string): string {
  if (!time) return ""
  const parts = time.match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i)
  if (!parts) return time
  let h = parseInt(parts[1])
  const m = parts[2]
  if (parts[3]) {
    const ampm = parts[3].toUpperCase()
    if (ampm === "PM" && h !== 12) h += 12
    if (ampm === "AM" && h === 12) h = 0
  }
  return `${h.toString().padStart(2, "0")}:${m}`
}

function h24to12(h24: number): { h12: number; isPM: boolean } {
  return { h12: h24 === 0 ? 12 : h24 > 12 ? h24 - 12 : h24, isPM: h24 >= 12 }
}

function h12to24(h12: number, isPM: boolean): number {
  if (isPM) return h12 === 12 ? 12 : h12 + 12
  return h12 === 12 ? 0 : h12
}

function parseSchedule(raw: string | null): WeekSchedule {
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw)
    if (typeof parsed === "object" && !Array.isArray(parsed)) {
      const normalized: WeekSchedule = {}
      for (const [k, v] of Object.entries(parsed)) {
        const day = v as DayConfig
        const enabled = day.type !== "Cerrado"
        normalized[k] = {
          ...day,
          enabled: day.enabled ?? enabled,
          morningEnabled: day.morningEnabled ?? true,
          afternoonEnabled: day.afternoonEnabled ?? true,
          open: day.open ? to24h(day.open) : undefined,
          close: day.close ? to24h(day.close) : undefined,
          reopen: day.reopen ? to24h(day.reopen) : undefined,
          reclose: day.reclose ? to24h(day.reclose) : undefined,
        }
      }
      return normalized
    }
  } catch {}
  return {}
}

function buildDefaultSchedule(): WeekSchedule {
  const s: WeekSchedule = {}
  DAYS.forEach((d, i) => {
    if (i < 5) {
      s[d.key] = { type: "Horario Corrido", open: DEFAULTS.open, close: DEFAULTS.close, enabled: true }
    } else {
      s[d.key] = { type: "Cerrado", enabled: false }
    }
  })
  return s
}

function TimePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const h24 = parseInt(value?.split(":")[0]) || 9
  const min = value?.split(":")[1] || "00"
  const { h12, isPM } = h24to12(h24)

  function update(h: number, m: string, pm: boolean) {
    const hh = h12to24(h, pm)
    onChange(`${hh.toString().padStart(2, "0")}:${m}`)
  }

  return (
    <div className="flex items-center gap-1">
      <select
        value={h12}
        onChange={(e) => update(parseInt(e.target.value), min, isPM)}
        className="h-9 w-14 rounded-lg border border-border bg-background px-1 text-sm text-center appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#102A43]/20 focus:border-[#102A43]"
      >
        {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
          <option key={h} value={h}>
            {h.toString().padStart(2, "0")}
          </option>
        ))}
      </select>
      <span className="text-muted-foreground font-semibold text-sm">:</span>
      <select
        value={min}
        onChange={(e) => update(h12, e.target.value, isPM)}
        className="h-9 w-14 rounded-lg border border-border bg-background px-1 text-sm text-center appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#102A43]/20 focus:border-[#102A43]"
      >
        {Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, "0")).map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={() => update(h12, min, !isPM)}
        className={`h-9 w-12 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
          isPM
            ? "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300 dark:hover:bg-amber-950/60"
            : "border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-300 dark:hover:bg-sky-950/60"
        }`}
      >
        {isPM ? "PM" : "AM"}
      </button>
    </div>
  )
}

function ScheduleModal({
  day,
  config,
  open,
  onClose,
  onSave,
}: {
  day: { key: string; label: string }
  config: DayConfig
  open: boolean
  onClose: () => void
  onSave: (config: DayConfig) => void
}) {
  const [enabled, setEnabled] = useState(config.enabled ?? true)
  const [type, setType] = useState<"Horario Corrido" | "Horario Comercial">(
    config.type === "Horario Comercial" ? "Horario Comercial" : "Horario Corrido"
  )
  const [openTime, setOpenTime] = useState(config.open || DEFAULTS.open)
  const [closeTime, setCloseTime] = useState(config.close || DEFAULTS.close)
  const [reopenTime, setReopenTime] = useState(config.reopen || DEFAULTS.reopen)
  const [recloseTime, setRecloseTime] = useState(config.reclose || DEFAULTS.reclose)
  const [morningEnabled, setMorningEnabled] = useState(config.morningEnabled ?? true)
  const [afternoonEnabled, setAfternoonEnabled] = useState(config.afternoonEnabled ?? true)

  useEffect(() => {
    if (open) {
      setEnabled(config.enabled ?? true)
      setType(config.type === "Horario Comercial" ? "Horario Comercial" : "Horario Corrido")
      setOpenTime(config.open || DEFAULTS.open)
      setCloseTime(config.close || DEFAULTS.close)
      setReopenTime(config.reopen || DEFAULTS.reopen)
      setRecloseTime(config.reclose || DEFAULTS.reclose)
      setMorningEnabled(config.morningEnabled ?? true)
      setAfternoonEnabled(config.afternoonEnabled ?? true)
    }
  }, [open, config])

  function handleSave() {
    if (!enabled) {
      onSave({ type: "Cerrado", enabled: false })
    } else {
      const result: DayConfig = { type, enabled: true, morningEnabled, afternoonEnabled }
      if (type === "Horario Corrido") {
        result.open = openTime
        result.close = closeTime
      } else {
        result.open = openTime
        result.close = closeTime
        result.reopen = reopenTime
        result.reclose = recloseTime
      }
      onSave(result)
    }
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg">Configurar {day.label}</DialogTitle>
          <DialogDescription>
            Define si el día es laboral y ajusta los horarios.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-1">
          <div className="flex items-center justify-between rounded-xl bg-muted/50 p-3">
            <div className="flex items-center gap-3">
              <Power className={`size-4 ${enabled ? "text-green-600" : "text-muted-foreground"}`} />
              <div>
                <span className="text-sm font-semibold text-foreground">Día laboral</span>
                <p className="text-[11px] text-muted-foreground">
                  {enabled ? "Clientes pueden agendar" : "Sin atención al público"}
                </p>
              </div>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>

          {enabled && (
            <>
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
                  Tipo de horario
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { value: "Horario Corrido" as const, icon: Clock, label: "Corrido", desc: "Horario continuo sin corte" },
                    { value: "Horario Comercial" as const, icon: Sun, label: "Mañana y Tarde", desc: "Con corte al mediodía" },
                  ]).map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setType(opt.value)}
                       className={`flex flex-col items-center gap-1 rounded-xl border-2 p-3 text-center transition-all cursor-pointer ${
                         type === opt.value
                           ? "border-[#102A43] bg-[#102A43]/5 ring-1 ring-[#102A43]/20 shadow-sm dark:border-primary dark:bg-primary/10 dark:ring-primary/30"
                           : "border-border hover:border-muted-foreground/30 hover:bg-muted/30"
                       }`}
                     >
                       <opt.icon
                         className={`size-5 ${type === opt.value ? "text-[#102A43] dark:text-primary" : "text-muted-foreground"}`}
                       />
                       <span
                         className={`text-sm font-semibold leading-tight ${
                           type === opt.value ? "text-[#102A43] dark:text-primary" : "text-foreground"
                         }`}
                      >
                        {opt.label}
                      </span>
                      <span className="text-[10px] text-muted-foreground leading-tight">{opt.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {type === "Horario Corrido" ? (
                <div className="rounded-xl border border-border overflow-hidden">
                  <div className="bg-muted/30 px-3 py-2 border-b border-border">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <Clock className="size-3.5" />
                      Horario único
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 p-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                        Abre
                      </label>
                      <TimePicker value={openTime} onChange={setOpenTime} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                        Cierra
                      </label>
                      <TimePicker value={closeTime} onChange={setCloseTime} />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-border overflow-hidden">
                  {/* Morning */}
                  <div className="divide-y divide-border">
                    <div>
                      <div className="flex items-center justify-between px-3 py-2 bg-muted/30">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                          <Sun className="size-3.5 text-amber-500" />
                          Turno mañana
                        </span>
                        <Switch checked={morningEnabled} onCheckedChange={setMorningEnabled} />
                      </div>
                      {morningEnabled && (
                        <div className="grid grid-cols-2 gap-3 p-3">
                          <div className="space-y-1">
                            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                              Abre
                            </label>
                            <TimePicker value={openTime} onChange={setOpenTime} />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                              Cierra
                            </label>
                            <TimePicker value={closeTime} onChange={setCloseTime} />
                          </div>
                        </div>
                      )}
                      {!morningEnabled && (
                        <div className="px-3 pb-3">
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <X className="size-3" />
                            <span>Sin atención en la mañana</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Afternoon */}
                    <div>
                      <div className="flex items-center justify-between px-3 py-2 bg-muted/30">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                          <Moon className="size-3.5 text-indigo-400" />
                          Turno tarde
                        </span>
                        <Switch checked={afternoonEnabled} onCheckedChange={setAfternoonEnabled} />
                      </div>
                      {afternoonEnabled && (
                        <div className="grid grid-cols-2 gap-3 p-3">
                          <div className="space-y-1">
                            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                              Reabre
                            </label>
                            <TimePicker value={reopenTime} onChange={setReopenTime} />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                              Cierra
                            </label>
                            <TimePicker value={recloseTime} onChange={setRecloseTime} />
                          </div>
                        </div>
                      )}
                      {!afternoonEnabled && (
                        <div className="px-3 pb-3">
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <X className="size-3" />
                            <span>Sin atención en la tarde</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {!enabled && (
            <div className="flex items-center justify-center gap-2 rounded-xl bg-muted/50 p-4">
              <Moon className="size-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Este día está deshabilitado</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>
            <Save className="size-4 mr-1.5" />
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function HorariosPage() {
  const [schedule, setSchedule] = useState<WeekSchedule>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [modalDay, setModalDay] = useState<{ key: string; label: string } | null>(null)

  useEffect(() => { fetchStore() }, [])

  async function fetchStore() {
    try {
      const res = await fetch("/api/stores")
      if (!res.ok) throw new Error("Error")
      const store = await res.json()
      const parsed = parseSchedule(store.storeHours)
      const full = buildDefaultSchedule()
      DAYS.forEach((d) => {
        if (parsed[d.key]) full[d.key] = parsed[d.key]
      })
      setSchedule(full)
    } catch {
      setSchedule(buildDefaultSchedule())
    } finally {
      setLoading(false)
    }
  }

  async function saveDay(dayKey: string, config: DayConfig) {
    const updated = { ...schedule, [dayKey]: config }
    setSchedule(updated)
    setSaving(dayKey)
    try {
      const res = await fetch("/api/stores", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeHours: JSON.stringify(updated) }),
      })
      if (!res.ok) throw new Error("Error")
      toast.success(`Horario de ${DAYS.find((d) => d.key === dayKey)?.label} guardado`)
    } catch {
      toast.error("Error al guardar")
      fetchStore()
    } finally {
      setSaving(null)
    }
  }

  const modalConfig = modalDay
    ? schedule[modalDay.key] || { type: "Horario Corrido", open: DEFAULTS.open, close: DEFAULTS.close, enabled: true }
    : undefined

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-heading font-extrabold text-foreground">Horarios de atención</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configura el horario de atención para cada día de la semana.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Clock className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {DAYS.map((day) => {
            const config = schedule[day.key] || { type: "Cerrado", enabled: false }
            const isEnabled = config.enabled ?? config.type !== "Cerrado"
            const isComercial = config.type === "Horario Comercial"
            const morningOff = isComercial && config.morningEnabled === false
            const afternoonOff = isComercial && config.afternoonEnabled === false

            return (
              <div
                key={day.key}
                className={`relative rounded-xl border p-5 transition-all hover:shadow-md ${
                  isEnabled ? "border-border bg-card hover:border-muted-foreground/20" : "border-border/60 bg-muted/30"
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={`size-2.5 rounded-full ${isEnabled ? "bg-green-400" : "bg-red-400"}`}
                    />
                    <span className={`text-base font-bold ${isEnabled ? "text-foreground" : "text-muted-foreground"}`}>
                      {day.label}
                    </span>
                  </div>
                  <div
                    className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                      isEnabled
                        ? "bg-green-50 text-green-600 dark:bg-green-950/50 dark:text-green-400"
                        : "bg-red-50 text-red-500 dark:bg-red-950/50 dark:text-red-400"
                    }`}
                  >
                    {isEnabled ? (
                      isComercial ? <Sun className="size-3" /> : <Clock className="size-3" />
                    ) : (
                      <Moon className="size-3" />
                    )}
                    <span>
                      {!isEnabled
                        ? "Cerrado"
                        : isComercial
                          ? "Mañana y Tarde"
                          : "Corrido"}
                    </span>
                  </div>
                </div>

                <div className="min-h-[52px]">
                  {!isEnabled ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <X className="size-3.5 text-red-400" />
                      <span className="text-xs">Descanso</span>
                    </div>
                  ) : isComercial ? (
                    <div className="space-y-1">
                      {!morningOff && (
                        <div className="flex items-center gap-1.5 text-sm">
                          <Sun className="size-3 text-amber-500 shrink-0" />
                          <span className="font-semibold text-foreground">
                            {to12h(config.open || DEFAULTS.open)}
                          </span>
                          <ArrowRight className="size-3 text-muted-foreground" />
                          <span className="font-semibold text-foreground">
                            {to12h(config.close || DEFAULTS.lunchClose)}
                          </span>
                        </div>
                      )}
                      {!afternoonOff && (
                        <div className="flex items-center gap-1.5 text-sm">
                          <Moon className="size-3 text-indigo-400 shrink-0" />
                          <span className="font-semibold text-foreground">
                            {to12h(config.reopen || DEFAULTS.reopen)}
                          </span>
                          <ArrowRight className="size-3 text-muted-foreground" />
                          <span className="font-semibold text-foreground">
                            {to12h(config.reclose || DEFAULTS.reclose)}
                          </span>
                        </div>
                      )}
                      {morningOff && afternoonOff && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <X className="size-3" />
                          <span>Ambos turnos deshabilitados</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-sm flex-wrap">
                      <span className="font-semibold text-foreground">
                        {to12h(config.open || DEFAULTS.open)}
                      </span>
                      <ArrowRight className="size-3 text-muted-foreground" />
                      <span className="font-semibold text-foreground">
                        {to12h(config.close || DEFAULTS.close)}
                      </span>
                    </div>
                  )}
                </div>

                <div className="my-3 border-t border-border" />

                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-xs gap-1.5 text-muted-foreground hover:text-foreground"
                  onClick={() => setModalDay(day)}
                  disabled={!!saving}
                >
                  {saving === day.key ? (
                    <Clock className="size-3.5 animate-spin" />
                  ) : (
                    <Pencil className="size-3.5" />
                  )}
                  {saving === day.key ? "Guardando..." : "Modificar horario"}
                </Button>
              </div>
            )
          })}
        </div>
      )}

      <ScheduleModal
        day={modalDay || { key: "lun", label: "" }}
        config={modalConfig || { type: "Cerrado", enabled: false }}
        open={!!modalDay}
        onClose={() => setModalDay(null)}
        onSave={(config) => modalDay && saveDay(modalDay.key, config)}
      />
    </div>
  )
}
