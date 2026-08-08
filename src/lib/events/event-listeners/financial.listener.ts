/**
 * Listener: Inteligencia Financiera (FASE 6D).
 *
 * En eventos que cambian los datos financieros del negocio (ventas, gastos,
 * pagos de créditos, pagos/compras a proveedores) invalida la caché del motor
 * financiero para que el panel se recalcule solo con los datos afectados.
 * Con throttling por tienda para no saturar con ráfagas de eventos.
 *
 * El listener NO calcula nada: solo avisa al `invalidate` inyectable.
 * Por defecto invalida la caché compartida del motor (desacoplado).
 */
import type { EventBus } from "../event-bus"
import type { DomainEvent } from "../event-types"
import { defaultFinancialCache } from "@/lib/financial-intelligence/financial-engine"

export interface FinancialListenerOptions {
  /** Callback de invalidación de caché (inyectable). Default: caché del motor. */
  invalidate?: (storeId: string) => void | Promise<void>
  /** Intervalo mínimo entre invalidaciones por tienda (por defecto 5000ms). */
  throttleMs?: number
}

/** Eventos que afectan los indicadores financieros. */
export const FINANCIAL_TRIGGER_EVENTS = new Set([
  "sale.created",
  "sale.updated",
  "sale.deleted",
  "sale.completed",
  "sale.cancelled",
  "order.created",
  "order.updated",
  "order.completed",
  "order.cancelled",
  "expense.created",
  "expense.updated",
  "expense.deleted",
  "credit.payment.created",
  "credit.completed",
  "credit.updated",
  "supplier.payment.created",
  "supplier.payment.partial",
  "supplier.invoice.created",
  "supplier.purchase.created",
  "supplier.balance.updated",
])

export function registerFinancialListener(bus: EventBus, options: FinancialListenerOptions = {}) {
  const invalidate = options.invalidate ?? ((storeId: string) => defaultFinancialCache.clearStore(storeId))
  const throttleMs = options.throttleMs ?? 5_000
  const lastByTenant = new Map<string, number>()

  return bus.subscribeAll(async (event: DomainEvent) => {
    if (!FINANCIAL_TRIGGER_EVENTS.has(event.type)) return

    const now = Date.now()
    const last = lastByTenant.get(event.tenantId) ?? 0
    if (now - last < throttleMs) return
    lastByTenant.set(event.tenantId, now)

    try {
      await invalidate(event.tenantId)
    } catch (error) {
      console.error(
        "[events] invalidación de caché financiera falló:",
        error instanceof Error ? error.message : String(error),
      )
    }
  })
}
