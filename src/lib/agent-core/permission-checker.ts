/**
 * Permission Checker (FASE 3A).
 *
 * Valida que el usuario pueda usar el asistente y que las herramientas que se
 * intentan ejecutar estén dentro de sus permisos. Reutiliza los 22 permisos
 * granulares de la infraestructura FASE 1C (`@/lib/agent/permissions`).
 */
import type { AgentPermission } from "@/lib/agent/permissions"
import { hasPermission } from "@/lib/agent/permissions"
import type { AgentRequest, PermissionDecision } from "./types"

export interface PermissionCheckerOptions {
  /** Permiso requerido para usar el asistente. null = cualquier usuario autenticado. */
  assistantPermission?: AgentPermission | null
}

export class PermissionChecker {
  constructor(private readonly options: PermissionCheckerOptions = {}) {}

  /** Chequea que el usuario pueda usar el asistente en general. */
  checkRequest(request: AgentRequest): PermissionDecision {
    const required = this.options.assistantPermission
    if (required && !hasPermission(request.permissions, required)) {
      return {
        allowed: false,
        reason: `Se requiere el permiso "${required}" para usar el asistente`,
        requiredPermission: required,
      }
    }
    return { allowed: true }
  }

  /** Chequea los permisos requeridos por una herramienta (basta con uno). */
  checkTool(request: AgentRequest, toolName: string, requiredPermissions: string[]): PermissionDecision {
    if (requiredPermissions.length === 0) return { allowed: true, toolName }
    const required = requiredPermissions as AgentPermission[]
    if (required.some((p) => hasPermission(request.permissions, p))) {
      return { allowed: true, toolName }
    }
    return {
      allowed: false,
      toolName,
      requiredPermission: required[0],
      reason: `Sin permisos para usar "${toolName}" (requiere: ${required.join(", ")})`,
    }
  }
}
