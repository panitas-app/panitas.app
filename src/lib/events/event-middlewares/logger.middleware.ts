/**
 * Middleware: logging (FASE 5H).
 *
 * Registra entrada/salida de cada evento en el `EventLogger` del bus.
 */
import type { EventLogger, EventMiddleware } from "../event-types"

export function loggerMiddleware(logger: EventLogger): EventMiddleware {
  return async (ctx, next) => {
    logger.log({
      level: "info",
      message: "evento recibido",
      eventType: ctx.event.type,
      tenantId: ctx.event.tenantId,
      eventId: ctx.event.id,
    })
    await next()
    logger.log({
      level: "debug",
      message: "evento procesado",
      eventType: ctx.event.type,
      eventId: ctx.event.id,
    })
  }
}
