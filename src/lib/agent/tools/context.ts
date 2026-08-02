/**
 * Contexto para la capa de servicios (FASE 3B).
 *
 * Construye el `StoreServiceContext` de la capa FASE 1B a partir del contexto
 * autenticado de la tool. El `storeId`/`userId` NUNCA se leen del input del
 * usuario: siempre vienen del contexto (aislamiento de negocio).
 */
import type { StoreServiceContext } from "@/services/context"
import type { ToolExecutionContext } from "./types"

export function buildServiceContext(ctx: ToolExecutionContext): StoreServiceContext {
  return {
    userId: ctx.userId,
    storeId: ctx.storeId,
    plan: ctx.plan ?? "business",
    role: ctx.role,
  }
}
