/**
 * Detector de créditos (FASE 8C).
 *
 * Reglas deterministas sobre cuotas reales:
 *  - `overdue`: cuota pendiente con fecha de vencimiento en el pasado.
 *  - `upcoming`: cuota pendiente que vence en los próximos días.
 *
 * Cuando la cuota se paga, desaparece de la detección y el motor resuelve
 * automáticamente el item (sin intervención del usuario).
 */
import { ATTENTION_CONFIG } from "../config"
import type { Situation } from "../types"

export interface CreditInstallmentRow {
  id: string
  number: number
  amount: number
  dueDate: Date
  status: string
  orderId: string
  orderNumber: string
  customerName: string
}

export interface CreditData {
  installments: CreditInstallmentRow[]
}

function money(value: number): string {
  return `$${value.toFixed(2)}`
}

export function detectCredits(data: CreditData, now: Date = new Date()): Situation[] {
  const upcomingWindow = ATTENTION_CONFIG.creditUpcomingDays * 24 * 60 * 60 * 1000
  const situations: Situation[] = []

  for (const installment of data.installments) {
    const isOverdue = installment.dueDate.getTime() < now.getTime()
    const isUpcoming =
      !isOverdue && installment.dueDate.getTime() <= now.getTime() + upcomingWindow

    if (isOverdue) {
      situations.push({
        type: "credit.overdue",
        priority: "high",
        entityType: "installment",
        entityId: installment.id,
        title: `Cuota ${installment.number} de ${installment.customerName} vencida`,
        description: `La cuota ${installment.number} (${money(installment.amount)}) del crédito ${installment.orderNumber} venció el ${installment.dueDate.toLocaleDateString("es-VE")}.`,
        recommendation: "Contacta al cliente para coordinar el pago de la cuota vencida.",
        action: { label: "Ver crédito", href: `/dashboard/creditos?orderId=${encodeURIComponent(installment.orderId)}` },
        metadata: {
          amount: installment.amount,
          dueDate: installment.dueDate.toISOString(),
          orderNumber: installment.orderNumber,
          customerName: installment.customerName,
          orderId: installment.orderId,
        },
      })
      continue
    }

    if (isUpcoming) {
      situations.push({
        type: "credit.upcoming",
        priority: "medium",
        entityType: "installment",
        entityId: installment.id,
        title: `Cuota ${installment.number} de ${installment.customerName} por vencer`,
        description: `La cuota ${installment.number} (${money(installment.amount)}) del crédito ${installment.orderNumber} vence el ${installment.dueDate.toLocaleDateString("es-VE")}.`,
        recommendation: "Recuerda el pago al cliente antes del vencimiento.",
        action: { label: "Ver crédito", href: `/dashboard/creditos?orderId=${encodeURIComponent(installment.orderId)}` },
        metadata: {
          amount: installment.amount,
          dueDate: installment.dueDate.toISOString(),
          orderNumber: installment.orderNumber,
          customerName: installment.customerName,
          orderId: installment.orderId,
        },
      })
    }
  }

  return situations
}
