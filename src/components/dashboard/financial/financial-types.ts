"use client"

import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  CalendarClock,
  CheckCircle2,
  CircleCheck,
  Coins,
  Gauge,
  HandCoins,
  Info,
  TrendingDown,
  TrendingUp,
  Wallet,
  type LucideIcon,
} from "lucide-react"

export type FinancialPeriod = "today" | "week" | "month"
export type FinancialPriority = "alta" | "media" | "baja"

export interface TopDebtor {
  name: string
  pending: number
}

export interface TopPayableSupplier {
  name: string
  outstanding: number
  dueDate: string | null
}

export interface FinancialIndicators {
  period: FinancialPeriod
  label: string
  revenue: number
  previousRevenue: number
  revenueDeltaPct: number | null
  expenses: number
  previousExpenses: number
  expensesDeltaPct: number | null
  netFlow: number
  totalPending: number
  recoveredInPeriod: number
  recoveryRate: number
  overdueCredits: number
  overdueCreditAmount: number
  dueNext7DaysCollect: number
  topDebtors: TopDebtor[]
  totalPayable: number
  paidToSuppliersInPeriod: number
  overdueSupplierInvoices: number
  overdueSupplierAmount: number
  dueNext7DaysPay: number
  topPayableSuppliers: TopPayableSupplier[]
}

export interface FinancialAction {
  label: string
  type: "link" | "assistant"
  href?: string
  prompt?: string
}

export interface FinancialInsight {
  id: string
  title: string
  description?: string
  category: string
  priority: FinancialPriority
  value?: number
  actions: FinancialAction[]
}

export type FinancialSummaryTone = "positive" | "warning" | "neutral"

export interface FinancialSummary {
  paragraphs: string[]
  tone: FinancialSummaryTone
}

export interface FinancialPanel {
  period: FinancialPeriod
  label: string
  generatedAt: string
  indicators: FinancialIndicators
  summary: FinancialSummary
  insights: FinancialInsight[]
}

export const PERIODS: Array<{ value: FinancialPeriod; label: string }> = [
  { value: "today", label: "Hoy" },
  { value: "week", label: "Esta semana" },
  { value: "month", label: "Este mes" },
]

export interface PriorityMeta {
  label: string
  chip: string
  text: string
  dot: string
  border: string
  icon: LucideIcon
}

export const PRIORITY_META: Record<FinancialPriority, PriorityMeta> = {
  alta: {
    label: "Alta prioridad",
    chip: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400",
    text: "text-red-600 dark:text-red-400",
    dot: "bg-red-500",
    border: "border-red-200 dark:border-red-900",
    icon: AlertTriangle,
  },
  media: {
    label: "Prioridad media",
    chip: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
    text: "text-amber-600 dark:text-amber-400",
    dot: "bg-amber-500",
    border: "border-amber-200 dark:border-amber-900",
    icon: CalendarClock,
  },
  baja: {
    label: "Baja prioridad",
    chip: "bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-400",
    text: "text-sky-600 dark:text-sky-400",
    dot: "bg-sky-500",
    border: "border-sky-200 dark:border-sky-900",
    icon: Info,
  },
}

export interface ToneMeta {
  label: string
  chip: string
  icon: LucideIcon
}

export const TONE_META: Record<FinancialSummaryTone, ToneMeta> = {
  positive: {
    label: "Buen momento",
    chip: "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400",
    icon: CircleCheck,
  },
  warning: {
    label: "Atención requerida",
    chip: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
    icon: AlertTriangle,
  },
  neutral: {
    label: "Estado estable",
    chip: "bg-slate-100 text-slate-600 dark:bg-slate-900/50 dark:text-slate-400",
    icon: Info,
  },
}

export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  flujo_negativo: TrendingDown,
  flujo_positivo: TrendingUp,
  creditos_vencidos: AlertTriangle,
  facturas_vencidas: AlertTriangle,
  cobrar_esta_semana: HandCoins,
  pagar_esta_semana: Wallet,
  ventas_crecieron: TrendingUp,
  ventas_cayeron: TrendingDown,
  gastos_aumentaron: TrendingUp,
  deuda_concentrada: Gauge,
  recuperacion_creditos: Coins,
  por_pagar_mayor: Wallet,
}

export function money(value: number): string {
  return `$${value.toFixed(2)}`
}

export function moneyCompact(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}k`
  return `$${value.toFixed(2)}`
}

/** Etiqueta de variación porcentual con su signo. */
export function deltaLabel(delta: number | null): string | null {
  if (delta === null) return null
  const prefix = delta >= 0 ? "+" : ""
  return `${prefix}${delta.toFixed(0)}%`
}

export function deltaIcon(delta: number | null): LucideIcon {
  if (delta !== null && delta < 0) return ArrowDownRight
  return ArrowUpRight
}

export function deltaClassName(delta: number | null, inverted = false): string {
  if (delta === null) return "text-muted-foreground"
  const negative = delta < 0
  const good = inverted ? negative : !negative
  return good ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
}

/** Enlace para consultar a Panitas desde una acción rápida. */
export function assistantHref(prompt: string): string {
  return `/dashboard/assistant?q=${encodeURIComponent(prompt)}`
}

export function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("")
}

export function formatDate(d: string | null): string {
  if (!d) return "Sin fecha"
  return new Date(d).toLocaleDateString("es-VE", { day: "2-digit", month: "2-digit", year: "numeric" })
}

export function checkIcon(): LucideIcon {
  return CheckCircle2
}
