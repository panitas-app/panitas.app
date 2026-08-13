"use client"

import {
  AlertTriangle,
  Ban,
  CalendarClock,
  CheckCheck,
  CircleCheck,
  type LucideIcon,
} from "lucide-react"
import { buildWhatsAppUrl } from "@/lib/collection"

export type CreditState = "on_time" | "upcoming" | "overdue" | "paid" | "cancelled"

export interface CreditSummary {
  orderId: string
  orderNumber: string
  customerId: string | null
  customerName: string
  customerPhone: string
  createdAt: string
  total: number
  downPayment: number
  totalCredito: number
  paid: number
  pending: number
  paidPercent: number
  state: CreditState
  creditStatus: "active" | "completed" | "cancelled"
  installmentsTotal: number
  paidInstallments: number
  nextDueDate: string | null
  nextAmount: number | null
  overdueDays: number
  lastPaymentAt: string | null
  attempts: number
}

export interface CreditKpis {
  totalPending: number
  activeCredits: number
  overdueCredits: number
  overdueAmount: number
  dueNext7Days: number
  recoveredThisMonth: number
  recoveryRate: number
}

export interface TimelineEntry {
  type: "created" | "payment" | "rescheduled" | "cancelled" | "overdue" | "completed" | "reminder_sent" | "client_responded"
  date: string
  title: string
  description?: string
  amount?: number
}

export interface CreditDetail extends CreditSummary {
  items: Array<{ productName: string | null; quantity: number; price: number; subtotal: number }>
  payments: Array<{
    id: string
    amount: number
    method: string
    reference: string | null
    notes: string | null
    paidAt: string | null
    createdAt: string
  }>
  installments: Array<{
    id: string
    number: number
    amount: number
    paidAmount: number
    dueDate: string
    status: string
    paidAt: string | null
  }>
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

export const STATE_META: Record<CreditState, StateMeta> = {
  on_time: {
    label: "Al día",
    dot: "bg-green-500",
    chip: "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400",
    text: "text-green-600 dark:text-green-400",
    bar: "bg-green-500",
    border: "border-green-200 dark:border-green-900",
    icon: CircleCheck,
  },
  upcoming: {
    label: "Próximo a vencer",
    dot: "bg-amber-500",
    chip: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
    text: "text-amber-600 dark:text-amber-400",
    bar: "bg-amber-500",
    border: "border-amber-200 dark:border-amber-900",
    icon: CalendarClock,
  },
  overdue: {
    label: "Vencido",
    dot: "bg-red-500",
    chip: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400",
    text: "text-red-600 dark:text-red-400",
    bar: "bg-red-500",
    border: "border-red-200 dark:border-red-900",
    icon: AlertTriangle,
  },
  paid: {
    label: "Pagado",
    dot: "bg-blue-500",
    chip: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400",
    text: "text-blue-600 dark:text-blue-400",
    bar: "bg-blue-500",
    border: "border-blue-200 dark:border-blue-900",
    icon: CheckCheck,
  },
  cancelled: {
    label: "Cancelado",
    dot: "bg-slate-400",
    chip: "bg-slate-100 text-slate-600 dark:bg-slate-900/50 dark:text-slate-400",
    text: "text-slate-500 dark:text-slate-400",
    bar: "bg-slate-400",
    border: "border-slate-200 dark:border-slate-800",
    icon: Ban,
  },
}

export const PAYMENT_METHODS = [
  { value: "cash", label: "Efectivo" },
  { value: "bank_transfer", label: "Transferencia" },
  { value: "pago_movil", label: "Pago Móvil" },
  { value: "binancepay", label: "Binance Pay" },
] as const

export function money(value: number): string {
  return `$${value.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
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
  return PAYMENT_METHODS.find((m) => m.value === method)?.label ?? method
}

export function whatsappLink(phone: string, message: string): string {
  return buildWhatsAppUrl(phone, message)
}

export function buildReminderMessage(c: { customerName: string; orderNumber: string; pending: number }, canPay: boolean): string {
  if (!canPay) {
    return `Hola ${c.customerName}, gracias por tu pago en la orden #${c.orderNumber}.`
  }
  return `Hola ${c.customerName}, te recordamos que tienes un saldo pendiente de ${money(c.pending)} en la orden #${c.orderNumber}. Por favor contáctanos para ponerte al día. ¡Gracias!`
}
