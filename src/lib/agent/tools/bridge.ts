/**
 * Bridge del Tool System 3B hacia el registry FASE 1C (FASE 3B).
 *
 * Convierte una Tool 3B (`AgentTool`) al contrato legacy 1C (`AgentTool` de
 * `@/lib/agent/types`) para que, en una fase futura, el Agent Core (3A) y el
 * router heurístico puedan consumir las tools nuevas sin modificar su código.
 *
 * No se auto-registra: la integración con el registry 1C se decide al cablear
 * el agente (dejar de tocar `setup.ts` en esta fase).
 */
import type { AgentTool as LegacyAgentTool, AgentContext } from "@/lib/agent/types"
import type { AgentTool, ToolExecutionContext } from "./types"

export function toLegacyAgentTool(tool: AgentTool): LegacyAgentTool {
  return {
    name: tool.name,
    description: tool.description,
    permissions: tool.requiredPermissions,
    input_schema: {
      type: "object",
      properties: Object.fromEntries(
        Object.entries(tool.inputSchema.properties).map(([key, param]) => [
          key,
          { type: param.type, description: param.description ?? "" },
        ])
      ),
      required: Object.entries(tool.inputSchema.properties)
        .filter(([, p]) => p.required)
        .map(([key]) => key),
    },
    execute: async (legacyCtx: AgentContext, input: Record<string, unknown>) => {
      const toolCtx: ToolExecutionContext = {
        userId: legacyCtx.userId,
        storeId: legacyCtx.storeId,
        negocioId: legacyCtx.negocioId,
        plan: legacyCtx.plan,
        role: legacyCtx.role,
        permissions: legacyCtx.permissions,
        metadata: { business: legacyCtx.business, user: legacyCtx.user, conversation: legacyCtx.conversation },
      }
      const response = await tool.execute(toolCtx, input)
      return { ok: response.success, data: response.data, error: response.error ?? undefined }
    },
  }
}
