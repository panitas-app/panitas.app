/**
 * Permission System del Tool System (FASE 3B).
 *
 * Reutiliza el sistema de permisos FASE 1C (`hasPermission`). Criterio:
 * el usuario necesita al menos UNO de los permisos requeridos por la tool.
 */
import { hasPermission } from "@/lib/agent/permissions"
import type { AgentPermission } from "@/lib/agent/permissions"
import type { AgentTool, ToolExecutionContext } from "./types"

export function toolAllowed(ctx: ToolExecutionContext, tool: AgentTool): boolean {
  if (tool.requiredPermissions.length === 0) return true
  return tool.requiredPermissions.some((p) => hasPermission(ctx.permissions, p))
}

/** Permisos requeridos que el usuario NO tiene (para mensajes de error útiles). */
export function missingPermissions(ctx: ToolExecutionContext, tool: AgentTool): AgentPermission[] {
  return tool.requiredPermissions.filter((p) => !hasPermission(ctx.permissions, p))
}
