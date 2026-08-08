"use client"

import {
  AlertTriangle,
  CalendarClock,
  CheckCheck,
  CircleCheck,
  Power,
  type LucideIcon,
} from "lucide-react"

export type SupplierState = "saldado" | "al_dia" | "por_vencer" | "vencido" | "inactivo"

export interface SupplierSummary {
  id: string
  name: string
  ruc: string
  phone: string
  email: string
  category: string
  isActive: boolean
  balance: number
  totalPurchased: number
  totalPaid: number
  pendingInvoices: number
  overdueInvoices: number
  nextDueDate: string | null
  lastPurchaseAt: string | null
  lastPaymentAt: string | null
  state: SupplierState
  createdAt: string
}

export interface SupplierKpis {
  totalPayable: number
  pendingInvoices: number
  overdueInvoices: number
  overdueAmount: number
  dueNext7Days: number
  paidThisMonth: number
  activeSuppliers: number
}

export type InvoiceStatus = "pending" | "partial" | "paid" | "cancelled"

export interface SupplierInvoice {
  id: string
  number: string
  description: string
  amount: number
  date: string
  dueDate: string | null
  status: InvoiceStatus
  paidAmount: number
  paidPercent: number
  paymentMethod: string
  documentRef: string
  notes: string | null
  createdAt: string
}

export interface SupplierPayment {
  id: string
  amount: number
  date: string
  paymentMethod: string
  reference: string
  notes: string | null
  createdAt: string
}

export interface TimelineEntry {
  type: "created" | "invoice" | "payment"
  date: string
  title: string
  description?: string
  amount?: number
}

export interface SupplierDetail extends SupplierSummary {
  address: string
  notes: string | null
  invoices: SupplierInvoice[]
  payments: SupplierPayment[]
  timeline: TimelineEntry[]
}

export interface StateMeta {
  label: string
  dot: string
  chip: string
  text: string
  bar: string
  border: string
  icon: LucideIcon
}

export const STATE_META: Record<SupplierState, StateMeta> = {
  saldado: {
    label: "Saldado",
    dot: "bg-green-500",
    chip: "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400",
    text: "text-green-600 dark:text-green-400",
    bar: "bg-green-500",
    border: "border-green-200 dark:border-green-900",
    icon: CheckCheck,
  },
  al_dia: {
    label: "Al día",
    dot: "bg-blue-500",
    chip: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400",
    text: "text-blue-600 dark:text-blue-400",
    bar: "bg-blue-500",
    border: "border-blue-200 dark:border-blue-900",
    icon: CircleCheck,
  },
  por_vencer: {
    label: "Por vencer",
    dot: "bg-amber-500",
    chip: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
    text: "text-amber-600 dark:text-amber-400",
    bar: "bg-amber-500",
    border: "border-amber-200 dark:border-amber-900",
    icon: CalendarClock,
  },
  vencido: {
    label: "Vencido",
    dot: "bg-red-500",
    chip: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400",
    text: "text-red-600 dark:text-red-400",
    bar: "bg-red-500",
    border: "border-red-200 dark:border-red-900",
    icon: AlertTriangle,
  },
  inactivo: {
    label: "Inactivo",
    dot: "bg-slate-400",
    chip: "bg-slate-100 text-slate-600 dark:bg-slate-900/50 dark:text-slate-400",
    text: "text-slate-500 dark:text-slate-400",
    bar: "bg-slate-400",
    border: "border-slate-200 dark:border-slate-800",
    icon: Power,
  },
}

export const INVOICE_STATUS_META: Record<InvoiceStatus, { label: string; chip: string; text: string; bar: string }> = {
  pending: {
    label: "Pendiente",
    chip: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
    text: "text-amber-600 dark:text-amber-400",
    bar: "bg-amber-500",
  },
  partial: {
    label: "Parcial",
    chip: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400",
    text: "text-blue-600 dark:text-blue-400",
    bar: "bg-blue-500",
  },
  paid: {
    label: "Pagada",
    chip: "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400",
    text: "text-green-600 dark:text-green-400",
    bar: "bg-green-500",
  },
  cancelled: {
    label: "Anulada",
    chip: "bg-slate-100 text-slate-600 dark:bg-slate-900/50 dark:text-slate-400",
    text: "text-slate-500 dark:text-slate-400",
    bar: "bg-slate-400",
  },
}

export const PAYMENT_METHODS = [
  { value: "cash", label: "Efectivo" },
  { value: "bank_transfer", label: "Transferencia" },
  { value: "pago_movil", label: "Pago Móvil" },
  { value: "binancepay", label: "Binance Pay" },
] as const

export const SUPPLIER_CATEGORIES = [
  { value: "", label: "Sin categoría" },
  { value: "abarrotes", label: "Abarrotes" },
  { value: "alimentos", label: "Alimentos" },
  { value: "bebidas", label: "Bebidas" },
  { value: "tecnologia", label: "Tecnología" },
  { value: "textil", label: "Textil" },
  { value: "limpieza", label: "Limpieza" },
  { value: "papeleria", label: "Papelería" },
  { value: "transporte", label: "Transporte" },
  { value: "servicios", label: "Servicios" },
  { value: "otros", label: "Otros" },
]

export function money(value: number): string {
  return `$${value.toFixed(2)}`
}

export function formatDate(d: string, withTime = false): string {
  return new Date(d).toLocaleDateString("es-VE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  })
}

export function daysUntil(d: string): number {
  const diff = new Date(d).getTime() - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

export function methodLabel(method: string): string {
  return PAYMENT_METHODS.find((m) => m.value === method)?.label ?? method.replace(/_/g, " ")
}

export function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("")
}
