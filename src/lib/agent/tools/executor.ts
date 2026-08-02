/**
 * Tool Executor (FASE 3B).
 *
 * Punto ÚNICO por el que el agente ejecuta tools. Responsabilidades:
 *
 *   1. Resolver la tool en el registro (nunca importarla manualmente).
 *   2. Aislar por negocio: el contexto debe tener `storeId` (del usuario autenticado).
 *   3. Verificar permisos (ToolPermissionGuard / FASE 1C).
 *   4. Ejecutar y capturar errores (nunca lanza; devuelve ToolResponse).
 *   5. Logging: `tool.called` → `tool.success` / `tool.failed`.
 *   6. Enriquecer metadata con tool + duración.
 */
import type { AgentTool, ToolExecutionContext, ToolResponse } from "./types"
import type { ToolRegistry } from "./registry"
import type { ToolLogger } from "./logging"
import { toolAllowed, missingPermissions } from "./permissions"
import { toolOk, toolFail } from "./response"
import { AuditToolLogger } from "./logging"
import { validateToolInput } from "./validate"

export interface ToolExecutorDeps {
  registry: ToolRegistry
  logger?: ToolLogger
  /** Permite sustituir la regla de permisos (tests o gates por plan). */
  permissionGuard?: (ctx: ToolExecutionContext, tool: AgentTool) => boolean
}

export class ToolExecutor {
  private readonly registry: ToolRegistry
  private readonly logger: ToolLogger
  private readonly permissionGuard: (ctx: ToolExecutionContext, tool: AgentTool) => boolean

  constructor(deps: ToolExecutorDeps) {
    this.registry = deps.registry
    this.logger = deps.logger ?? new AuditToolLogger()
    this.permissionGuard = deps.permissionGuard ?? toolAllowed
  }

  async execute(ctx: ToolExecutionContext, name: string, input: Record<string, unknown> = {}): Promise<ToolResponse> {
    const tool = this.registry.get(name)
    if (!tool) {
      this.logger.log({ event: "tool.failed", userId: ctx.userId, storeId: ctx.storeId, tool: name, error: "Herramienta desconocida" })
      return toolFail(`Herramienta desconocida: ${name}`, { tool: name })
    }

    if (!ctx.storeId) {
      this.logger.log({ event: "tool.failed", userId: ctx.userId, storeId: ctx.storeId ?? "", tool: name, error: "Sin tienda autenticada" })
      return toolFail("Contexto sin negocio: no se puede ejecutar la tool", { tool: name })
    }

    if (!this.permissionGuard(ctx, tool)) {
      const required = missingPermissions(ctx, tool)
      this.logger.log({ event: "tool.failed", userId: ctx.userId, storeId: ctx.storeId, tool: name, input, error: "Sin permisos" })
      return toolFail(`Sin permisos para usar: ${name}`, { tool: name, required })
    }

    const inputErrors = validateToolInput(tool, input)
    if (inputErrors.length > 0) {
      this.logger.log({ event: "tool.failed", userId: ctx.userId, storeId: ctx.storeId, tool: name, input, error: "Input inválido" })
      return toolFail(`Parámetros inválidos: ${inputErrors.map((e) => e.message).join("; ")}`, { tool: name, errors: inputErrors })
    }

    this.logger.log({ event: "tool.called", userId: ctx.userId, storeId: ctx.storeId, negocioId: ctx.negocioId, tool: name, input })
    const startedAt = Date.now()

    try {
      const response = await tool.execute(ctx, input)
      const enriched = withMetadata(response, name, startedAt)
      this.logger.log({
        event: enriched.success ? "tool.success" : "tool.failed",
        userId: ctx.userId,
        storeId: ctx.storeId,
        tool: name,
        input,
        result: enriched.success ? "success" : "error",
        error: enriched.error,
        durationMs: Date.now() - startedAt,
      })
      return enriched
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error desconocido al ejecutar la tool"
      this.logger.log({
        event: "tool.failed",
        userId: ctx.userId,
        storeId: ctx.storeId,
        tool: name,
        input,
        error: message,
        durationMs: Date.now() - startedAt,
      })
      return toolFail(message, { tool: name, durationMs: Date.now() - startedAt })
    }
  }
}

function withMetadata(response: ToolResponse, tool: string, startedAt: number): ToolResponse {
  return {
    ...response,
    metadata: { ...response.metadata, tool, durationMs: Date.now() - startedAt },
  }
}

export { toolOk, toolFail }
