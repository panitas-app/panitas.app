/**
 * Middleware: aislamiento multi-tenant (FASE 5H).
 *
 * Un evento SIN `tenantId` no se despacha: se corta el flujo antes de llegar a
 * ningún listener. Esto garantiza que ningún evento pueda circular fuera de la
 * frontera de aislamiento por tienda.
 */
import type { EventMiddleware } from "../event-types"

export function tenantIsolationMiddleware(): EventMiddleware {
  return async (ctx, next) => {
    const tenant = ctx.event.tenantId
    if (typeof tenant !== "string" || tenant.trim() === "") {
      return
    }
    await next()
  }
}
