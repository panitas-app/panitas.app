"use client"

import type { RichResponse } from "@/lib/conversational-actions"
import { RichCard } from "@/components/assistant/cards/rich-card"

export interface DomainCardProps<T> {
  data: T
  actions?: import("@/lib/conversational-actions").QuickAction[]
}

/** Tarjeta de producto (FASE 5E): precio, stock, SKU y acciones. */
export function ProductCard({
  data,
  actions,
}: DomainCardProps<{ name?: string | null; price?: number | null; stock?: number | null; sku?: string | null; description?: string | null }>) {
  const fields: Array<{ label: string; value: string | number; tone?: import("@/lib/conversational-actions").BlockTone }> = [
    { label: "Precio", value: formatMoney(data.price) },
    { label: "Stock", value: data.stock ?? 0, tone: (data.stock ?? 0) <= 5 ? "danger" : "success" },
  ]
  if (data.sku) fields.push({ label: "SKU", value: data.sku })
  if (data.description) fields.push({ label: "Descripción", value: data.description })
  return <RichCard block={{ kind: "card", title: data.name ?? "Producto", fields, actions, badge: (data.stock ?? 0) <= 5 ? "Stock bajo" : undefined }} />
}

/** Tarjeta de cliente (FASE 5E): contacto, total comprado y pedidos. */
export function CustomerCard({
  data,
  actions,
}: DomainCardProps<{ name?: string | null; phone?: string | null; totalSpent?: number | null; totalOrders?: number | null }>) {
  const fields: Array<{ label: string; value: string | number }> = []
  if (data.phone) fields.push({ label: "Teléfono", value: data.phone })
  fields.push({ label: "Total comprado", value: formatMoney(data.totalSpent) })
  fields.push({ label: "Pedidos", value: data.totalOrders ?? 0 })
  return <RichCard block={{ kind: "card", title: data.name ?? "Cliente", fields, actions }} />
}

/** Tarjeta de venta (FASE 5E): estado, pago, fecha y total. */
export function SaleCard({
  data,
  actions,
}: DomainCardProps<{ orderNumber?: string | null; customerName?: string | null; status?: string | null; total?: number | null; paymentStatus?: string | null }>) {
  const fields: Array<{ label: string; value: string | number }> = [
    { label: "Estado", value: data.status ?? "—" },
    { label: "Pago", value: data.paymentStatus ?? "—" },
    { label: "Total", value: formatMoney(data.total) },
  ]
  return (
    <RichCard
      block={{
        kind: "card",
        title: `Pedido #${data.orderNumber ?? ""}`,
        subtitle: data.customerName ?? undefined,
        fields,
        actions,
      }}
    />
  )
}

/** Tarjeta de gasto (FASE 5E): categoría, fecha y monto. */
export function ExpenseCard({
  data,
  actions,
}: DomainCardProps<{ description?: string | null; category?: string | null; date?: Date | string | null; total?: number | null }>) {
  const fields: Array<{ label: string; value: string | number }> = []
  if (data.category) fields.push({ label: "Categoría", value: data.category })
  if (data.date) fields.push({ label: "Fecha", value: new Date(data.date).toLocaleDateString("es-VE") })
  fields.push({ label: "Monto", value: formatMoney(data.total) })
  return <RichCard block={{ kind: "card", title: data.description ?? "Gasto", fields, actions }} />
}

/** Tarjeta de proveedor (FASE 5E): balance y facturas pendientes. */
export function VendorCard({
  data,
  actions,
}: DomainCardProps<{ name?: string | null; balance?: number | null; pendingInvoices?: number | null; contact?: string | null }>) {
  const fields: Array<{ label: string; value: string | number }> = []
  if (data.contact) fields.push({ label: "Contacto", value: data.contact })
  if (data.balance !== undefined && data.balance !== null) fields.push({ label: "Balance", value: formatMoney(data.balance) })
  fields.push({ label: "Facturas pendientes", value: data.pendingInvoices ?? 0 })
  return <RichCard block={{ kind: "card", title: data.name ?? "Proveedor", fields, actions }} />
}

/** Formatea un número como moneda USD (coincide con `money()` del rich). */
function formatMoney(value: number | null | undefined): string {
  if (value === null || value === undefined) return "$0.00"
  return `$${Number(value).toFixed(2)}`
}

export type { RichResponse }
