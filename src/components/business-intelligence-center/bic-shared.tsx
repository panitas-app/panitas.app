"use client"

import { useState, type ReactNode } from "react"
import { BarChart3, ChevronDown, FileDown, LayoutDashboard, LineChart, PieChart, Sparkles, type LucideIcon } from "lucide-react"
import { Card } from "@/components/ui/card"
import { useBcvRate } from "@/lib/bcv-context"
import { cn } from "@/lib/utils"

/** Áreas del Business Intelligence Center (FASE 5A). */
export type BicAreaId = "monitor" | "operacion" | "finanzas" | "analisis" | "reportes"

export const BIC_AREAS: { id: BicAreaId; label: string; icon: LucideIcon }[] = [
  { id: "monitor", label: "Monitor", icon: LineChart },
  { id: "operacion", label: "Operación", icon: LayoutDashboard },
  { id: "finanzas", label: "Salud Financiera", icon: PieChart },
  { id: "analisis", label: "Análisis", icon: BarChart3 },
  { id: "reportes", label: "Reportes", icon: FileDown },
]

/** Navegación de las cinco áreas (pills horizontales, con scroll en móvil). */
export function BicAreaNav({ active, onChange }: { active: BicAreaId; onChange: (id: BicAreaId) => void }) {
  return (
    <div className="-mx-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
      <div className="flex w-max gap-1.5 rounded-2xl border border-border/60 bg-card/70 p-1 backdrop-blur-xl sm:w-full sm:flex-wrap">
        {BIC_AREAS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            aria-pressed={active === id}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-colors sm:flex-1 sm:justify-center",
              active === id
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
            )}
          >
            <Icon className="size-3.5" />
            <span>{label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

export function BicSectionTitle({
  icon,
  title,
  description,
}: {
  icon: ReactNode
  title: string
  description?: string
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-primary/10 text-brand-primary">
        {icon}
      </div>
      <div>
        <h2 className="font-heading text-base font-extrabold tracking-tight text-foreground">{title}</h2>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
    </div>
  )
}

/** Tarjeta de operación con profundización: un dato principal + panel expandible. */
export function DrillCard({
  icon,
  title,
  value,
  sub,
  accent = "brand",
  children,
}: {
  icon: ReactNode
  title: string
  value: ReactNode
  sub?: ReactNode
  accent?: "brand" | "emerald" | "rose" | "amber" | "primary"
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const accents: Record<string, string> = {
    brand: "bg-brand-primary/10 text-brand-primary",
    emerald: "bg-emerald-500/10 text-emerald-600",
    rose: "bg-rose-500/10 text-rose-600",
    amber: "bg-amber-500/10 text-amber-600",
    primary: "bg-primary/10 text-primary",
  }
  return (
    <Card className="gap-0 py-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left"
      >
        <div className="flex min-w-0 items-center gap-3">
          <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", accents[accent])}>
            {icon}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">{title}</p>
            {sub && <p className="truncate text-xs text-muted-foreground">{sub}</p>}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="font-heading text-lg font-bold tracking-tight text-foreground">{value}</span>
          <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", open && "rotate-180")} />
        </div>
      </button>
      {open ? <div className="border-t border-border/60 px-4 py-4">{children}</div> : null}
    </Card>
  )
}

/** Tarjeta conversacional de Panitas (interpretación en lenguaje natural). */
export function PanitasInterpretation({ text }: { text: string }) {
  return (
    <div className="flex gap-3 rounded-2xl border border-brand-primary/20 bg-brand-primary/5 p-4">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-full brand-gradient text-white">
        <Sparkles className="size-4" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-extrabold uppercase tracking-wider text-brand-primary">Panitas dice</p>
        <p className="mt-1 text-sm text-foreground">{text}</p>
      </div>
    </div>
  )
}

/** Barra de progreso simple (para punto de equilibrio y similares). */
export function BicProgressBar({
  value,
  max,
  tone,
}: {
  value: number
  max: number
  tone?: "default" | "success" | "danger"
}) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0
  const barClass =
    tone === "success" ? "bg-emerald-500" : tone === "danger" ? "bg-rose-500" : "bg-primary"
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
      <div className={cn("h-full rounded-full transition-all", barClass)} style={{ width: `${pct}%` }} />
    </div>
  )
}

/**
 * Monto en USD con equivalente en bolívares cuando el toggle global está activo.
 * Respetando la convención del resto del panel (USD base + Bs opcional).
 */
export function BicMoney({ value, className }: { value: number; className?: string }) {
  const { rate, showBolivares } = useBcvRate()
  const abs = Math.abs(value)
  const prefix = value < 0 ? "-$" : "$"
  return (
    <span className={className}>
      {prefix}
      {abs.toFixed(2)}
      {showBolivares && (
        <span className="ml-1 text-xs font-medium text-muted-foreground">
          {value < 0 ? "-" : ""}Bs. {abs * (rate || 1)}
        </span>
      )}
    </span>
  )
}
