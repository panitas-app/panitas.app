/**
 * Puente legacy (FASE 5H).
 *
 * Republica por el bus 5H los eventos que el `EventService` antiguo
 * (`src/events/event.service.ts`) ya emitía, para que TODA comunicación fluya
 * por un único bus en producción sin tocar los ~25 puntos que hoy usan
 * `eventService.emit`.
 *
 * Se activa explícitamente desde el arranque de producción
 * (`enableLegacyBridge()`). Los tests NO lo activan para no acoplarse.
 */
import { eventService, type AppEventName } from "@/events/event.service"
import type { EventBus } from "./event-bus"
import { LEGACY_EVENT_NAMES } from "./event-registry"

type LegacyPayload = Record<string, unknown>

function tenantOf(payload: LegacyPayload): string | undefined {
  return (payload.storeId as string | undefined) ?? (payload.negocioId as string | undefined)
}

function aggregateIdOf(type: string, payload: LegacyPayload): string | undefined {
  const key =
    type.startsWith("sale.") || type.startsWith("order.")
      ? "orderId"
      : type.startsWith("product.") || type.startsWith("inventory.")
        ? "productId"
        : type.startsWith("customer.")
          ? "customerId"
          : type.startsWith("expense.")
            ? "expenseId"
            : type.startsWith("appointment.")
              ? "appointmentId"
              : type.startsWith("conversation.") || type === "message.created"
                ? "conversationId"
                : type.startsWith("memory.")
                  ? "key"
                  : undefined
  return key ? (payload[key] as string | undefined) : undefined
}

export function registerLegacyBridge(bus: EventBus): () => void {
  const offs: Array<() => void> = []
  for (const type of LEGACY_EVENT_NAMES) {
    offs.push(
      eventService.on(type as AppEventName, (payload: unknown) => {
        const data = (payload ?? {}) as LegacyPayload
        const tenantId = tenantOf(data)
        if (!tenantId) return
        void bus
          .publish({
            type,
            data: payload,
            tenantId,
            source: "legacy:event.service",
            aggregateId: aggregateIdOf(type, data),
            metadata: { legacy: true },
          })
          .catch(() => undefined)
      }),
    )
  }
  return () => {
    for (const off of offs) off()
  }
}
