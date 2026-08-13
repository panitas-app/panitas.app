/**
 * Detector de proveedores (FASE 8C).
 *
 * Reglas deterministas sobre facturas de proveedor reales:
 *  - `overdue`: factura con vencimiento pasado y saldo pendiente.
 *  - `pending_balance`: factura con saldo pendiente cuyo vencimiento es nulo
 *    o está en el futuro (la vencida ya tiene su propio item: sin duplicados).
 */
import type { Situation } from "../types"

export interface SupplierInvoiceRow {
  id: string
  number: string
  description: string
  amount: number
  paidAmount: number
  status: string
  dueDate: Date | null
  supplierName: string
}

export interface SupplierData {
  invoices: SupplierInvoiceRow[]
}

function balanceOf(invoice: SupplierInvoiceRow): number {
  return Math.max(0, invoice.amount - invoice.paidAmount)
}

function money(value: number): string {
  return `$${value.toFixed(2)}`
}

export function detectSuppliers(data: SupplierData, now: Date = new Date()): Situation[] {
  const situations: Situation[] = []

  for (const invoice of data.invoices) {
    const hasBalance = balanceOf(invoice) > 0
    if (!hasBalance) continue

    const isOverdue = invoice.dueDate != null && invoice.dueDate.getTime() < now.getTime()
    const balance = balanceOf(invoice)

    if (isOverdue) {
      situations.push({
        type: "supplier.overdue",
        priority: "high",
        entityType: "supplier_invoice",
        entityId: invoice.id,
        title: `Factura ${invoice.number || "s/n"} de ${invoice.supplierName} vencida`,
        description: `Queda un saldo de ${money(balance)} por pagar de la factura a ${invoice.supplierName} vencida el ${invoice.dueDate!.toLocaleDateString("es-VE")}.`,
        recommendation: "Registra un pago o abono para regularizar la deuda con el proveedor.",
        metadata: {
          balance,
          amount: invoice.amount,
          supplierName: invoice.supplierName,
          invoiceNumber: invoice.number,
          dueDate: invoice.dueDate!.toISOString(),
        },
      })
      continue
    }

    situations.push({
      type: "supplier.pending_balance",
      priority: "medium",
      entityType: "supplier_invoice",
      entityId: invoice.id,
      title: `Factura ${invoice.number || "s/n"} de ${invoice.supplierName} por pagar`,
      description: `Queda un saldo de ${money(balance)} por pagar a ${invoice.supplierName}${invoice.dueDate ? ` (vence el ${invoice.dueDate.toLocaleDateString("es-VE")})` : ""}.`,
      recommendation: "Programa el pago antes de la fecha de vencimiento.",
      metadata: {
        balance,
        amount: invoice.amount,
        supplierName: invoice.supplierName,
        invoiceNumber: invoice.number,
        dueDate: invoice.dueDate?.toISOString() ?? null,
      },
    })
  }

  return situations
}
