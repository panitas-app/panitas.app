/**
 * Adaptador de esquema Tool System → función nativa (FASE 3E).
 *
 * Convierte la metadata de las tools 3B (name/description/inputSchema) en
 * definiciones OpenAI-compatible `tools`. El LLM usa estas definiciones para
 * emitir tool_calls nativas; la ejecución sigue pasando por el ToolExecutor
 * (permisos + validación + aislamiento).
 */
import type { ToolMetadata } from "@/lib/agent/tools"
import type { ProviderToolDefinition } from "../providers/types"

/** Convierte un conjunto de tools 3B en definiciones nativas para el proveedor. */
export function toProviderTools(tools: ToolMetadata[]): ProviderToolDefinition[] {
  return tools.map((tool) => ({
    type: "function",
    function: {
      name: tool.name,
      description: tool.description,
      parameters: toJsonSchema(tool.inputSchema),
    },
  }))
}

/** Convierte el inputSchema 3B en un JSON Schema OpenAI-compatible. */
export function toJsonSchema(inputSchema: ToolMetadata["inputSchema"]): Record<string, unknown> {
  const properties: Record<string, unknown> = {}
  const required: string[] = []

  for (const [name, param] of Object.entries(inputSchema.properties)) {
    properties[name] = {
      type: param.type,
      description: param.description ?? "",
    }
    if (param.required) required.push(name)
  }

  return {
    type: "object",
    properties,
    ...(required.length > 0 ? { required } : {}),
  }
}
