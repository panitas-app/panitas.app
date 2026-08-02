/**
 * Tool Resolver (FASE 3A).
 *
 * Puente entre el Agent Core y las 20 herramientas de negocio ya registradas en
 * la infraestructura FASE 1C (`@/lib/agent`). Responsabilidades:
 *
 *   - listar descriptores de herramientas para el prompt del modelo
 *   - detectar qué herramienta pide el usuario (campo `tool` explícito o router heurístico)
 *   - verificar permisos con el Permission Checker
 *   - ejecutar la herramienta (delegando en `registry.executeTool`, que ya audita)
 *   - normalizar el resultado a `ResolvedToolCall` (nunca raw)
 */
import { getTool, listTools, executeTool } from "@/lib/agent/registry"
import { routeAgentIntent } from "@/lib/agent/router"
import type { AgentContext } from "@/lib/agent/types"
import type { AgentRequest, ResolvedToolCall, ToolDescriptor } from "./types"
import type { PermissionChecker } from "./permission-checker"

export interface ToolResolverOptions {
  /** Adaptador AgentRequest -> AgentContext (para inyectar user/business si hace falta). */
  toAgentContext?: (request: AgentRequest) => AgentContext
}

/** Herramientas que reciben el mensaje como término de búsqueda cuando no hay `toolInput`. */
const SEARCH_TOOLS = new Set(["inventory.check_stock", "customers.list", "product.list", "order.list"])

export class ToolResolver {
  constructor(private readonly options: ToolResolverOptions = {}) {}

  private toAgentContext(request: AgentRequest): AgentContext {
    if (this.options.toAgentContext) return this.options.toAgentContext(request)
    return {
      userId: request.userId,
      storeId: request.storeId,
      negocioId: request.negocioId ?? null,
      plan: request.plan ?? "business",
      role: request.role,
      permissions: request.permissions,
    }
  }

  /** Descriptores de todas las herramientas registradas. */
  listDescriptors(): ToolDescriptor[] {
    return listTools().map((tool) => ({
      name: tool.name,
      description: tool.description,
      permissions: tool.permissions,
      inputSchema: tool.input_schema,
    }))
  }

  /** Detecta qué herramienta intenta usar el usuario. */
  detectIntent(request: AgentRequest): string | null {
    if (request.tool) return request.tool
    return routeAgentIntent(request.message)
  }

  /** Ejecuta la herramienta detectada (si existe) y normaliza el resultado. */
  async resolveAndExecute(request: AgentRequest, checker: PermissionChecker): Promise<ResolvedToolCall[]> {
    const name = this.detectIntent(request)
    if (!name) return []

    const tool = getTool(name)
    if (!tool) {
      return [{ name, input: request.toolInput ?? {}, ok: false, error: `Herramienta desconocida: ${name}` }]
    }

    const decision = checker.checkTool(request, name, tool.permissions)
    if (!decision.allowed) {
      return [{ name, input: request.toolInput ?? {}, ok: false, error: decision.reason ?? `Sin permisos para usar "${name}"` }]
    }

    const input = request.toolInput ?? this.inferInput(name, request.message)
    const result = await executeTool(this.toAgentContext(request), name, input)

    return [
      {
        name,
        input,
        ok: result.ok,
        output: result.ok ? this.stringify(result.data) : undefined,
        error: result.error,
      },
    ]
  }

  private inferInput(toolName: string, message: string): Record<string, unknown> {
    if (SEARCH_TOOLS.has(toolName)) return { q: message }
    return {}
  }

  private stringify(data: unknown): string | undefined {
    if (data === undefined) return undefined
    try {
      return typeof data === "string" ? data : JSON.stringify(data)
    } catch {
      return String(data)
    }
  }
}
