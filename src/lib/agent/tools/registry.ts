/**
 * Tool Registry (FASE 3B).
 *
 * Registro central de tools. El agente NUNCA importa tools manualmente:
 * las busca y ejecuta a través de esta clase (o del `ToolExecutor`).
 */
import type { AgentTool, ToolMetadata } from "./types"
import type { ToolDomain } from "./types"

export class ToolRegistry {
  private readonly tools = new Map<string, AgentTool>()

  get size(): number {
    return this.tools.size
  }

  /** Registra una tool. Lanza si el nombre ya está registrado (evita colisiones). */
  register(tool: AgentTool): this {
    if (!tool.name) throw new Error("Una Tool requiere un nombre")
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool ya registrada: ${tool.name}`)
    }
    this.tools.set(tool.name, tool)
    return this
  }

  /** Registra varias tools de una vez. */
  registerAll(tools: AgentTool[]): this {
    for (const tool of tools) this.register(tool)
    return this
  }

  /** Busca una tool por nombre. */
  get(name: string): AgentTool | undefined {
    return this.tools.get(name)
  }

  /** Valida que una tool exista. */
  has(name: string): boolean {
    return this.tools.has(name)
  }

  /** Lista todas las tools (orden de registro). */
  list(): AgentTool[] {
    return [...this.tools.values()]
  }

  /** Lista las tools de un dominio. */
  listByDomain(domain: ToolDomain): AgentTool[] {
    return this.list().filter((t) => t.domain === domain)
  }

  /** Metadata segura para el modelo/agente (sin funciones ni internos). */
  metadata(): ToolMetadata[] {
    return this.list().map((t) => ({
      name: t.name,
      domain: t.domain,
      description: t.description,
      requiredPermissions: t.requiredPermissions,
      inputSchema: t.inputSchema,
    }))
  }

  /** Vacía el registro (tests / hot-reload). */
  clear(): void {
    this.tools.clear()
  }
}
