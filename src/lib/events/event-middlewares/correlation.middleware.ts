/**
 * Middleware: correlación (FASE 5H).
 *
 * Garantiza que todo evento tenga un `correlationId` para trazar cadenas de
 * eventos (publicación → listeners → publicaciones derivadas).
 */
import type { DomainEvent, EventMiddleware } from "../event-types"

export function correlationMiddleware(): EventMiddleware {
  return async (ctx, next) => {
    if (!ctx.event.correlationId) {
      ;(ctx.event as DomainEvent & { correlationId: string }).correlationId = ctx.correlationId
    }
    await next()
  }
}
