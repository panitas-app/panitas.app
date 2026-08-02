import type { AgentTool, AgentContext, AgentToolInput, AgentToolResult } from "@/lib/agent/types"
import { hasPermission } from "@/lib/agent/permissions"
import { agentAudit } from "@/lib/agent/audit"

const registry = new Map<string, AgentTool>()

export function registerTool(tool: AgentTool): void {
  registry.set(tool.name, tool)
}

export function getTool(name: string): AgentTool | undefined {
  return registry.get(name)
}

export function listTools(): AgentTool[] {
  return [...registry.values()]
}

function canUse(ctx: AgentContext, tool: AgentTool): boolean {
  if (tool.permissions.length === 0) return true
  return tool.permissions.some((p) => hasPermission(ctx.permissions, p))
}

export async function executeTool(
  ctx: AgentContext,
  name: string,
  input: AgentToolInput = {}
): Promise<AgentToolResult> {
  const tool = getTool(name)
  if (!tool) {
    return { ok: false, error: `Herramienta desconocida: ${name}` }
  }
  if (!canUse(ctx, tool)) {
    agentAudit.record({
      userId: ctx.userId,
      storeId: ctx.storeId,
      tool: name,
      action: name,
      input,
      result: "error",
      error: `Sin permisos para usar: ${name}`,
    })
    return { ok: false, error: `Sin permisos para usar: ${name}` }
  }
  try {
    const result = await tool.execute(ctx, input)
    agentAudit.record({
      userId: ctx.userId,
      storeId: ctx.storeId,
      userName: ctx.user?.name ?? null,
      tool: name,
      action: name,
      input,
      result: result.ok ? "success" : "error",
      error: result.ok ? null : (result.error ?? null),
    })
    return result
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido"
    agentAudit.record({
      userId: ctx.userId,
      storeId: ctx.storeId,
      userName: ctx.user?.name ?? null,
      tool: name,
      action: name,
      input,
      result: "error",
      error: message,
    })
    return { ok: false, error: message }
  }
}
