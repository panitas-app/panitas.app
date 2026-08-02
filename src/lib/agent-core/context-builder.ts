/**
 * Context Builder (FASE 3A).
 *
 * Convierte una `AgentRequest` + historial de sesión en mensajes listos para el proveedor:
 *   system prompt (rol, negocio, herramientas disponibles) → historial → mensaje actual.
 * Los resultados de herramientas se inyectan en el system prompt vía `withToolResults`.
 */
import type { AgentRequest, Message, PipelineContext, ResolvedToolCall, ToolDescriptor } from "./types"

export const DEFAULT_SYSTEM_PROMPT =
  "Eres Panitas, el asistente inteligente de Panitas Negocios. Ayudas al comerciante a " +
  "administrar su inventario, ventas, clientes y pedidos usando SOLO datos reales de sus " +
  "herramientas. Responde en español, breve y práctico. Si no tienes el dato, dilo y sugiere una acción."

export interface ContextBuilderOptions {
  appName?: string
  baseSystemPrompt?: string
  /** Proveedor de herramientas disponibles (descripciones para el prompt). */
  toolsProvider?: () => ToolDescriptor[]
}

export interface BuildContextInput {
  request: AgentRequest
  sessionId: string
  history: Message[]
}

export class ContextBuilder {
  constructor(private readonly options: ContextBuilderOptions = {}) {}

  buildBase(input: BuildContextInput): PipelineContext {
    const messages: PipelineContext["messages"] = [
      { role: "system", content: this.buildSystemPrompt(input.request, []) },
    ]

    for (const message of input.history) {
      if (message.role === "user" || message.role === "assistant") {
        messages.push({ role: message.role, content: message.content })
      }
    }

    messages.push({ role: "user", content: input.request.message })

    return {
      request: input.request,
      sessionId: input.sessionId,
      messages,
      toolResults: [],
    }
  }

  /** Nueva instancia de contexto con los resultados de herramientas ejecutadas en el system prompt. */
  withToolResults(context: PipelineContext, toolResults: ResolvedToolCall[]): PipelineContext {
    const messages: PipelineContext["messages"] = [
      { role: "system", content: this.buildSystemPrompt(context.request, toolResults) },
      ...context.messages.slice(1),
    ]
    return { ...context, messages, toolResults }
  }

  private buildSystemPrompt(request: AgentRequest, toolResults: ResolvedToolCall[]): string {
    const lines: string[] = [this.options.baseSystemPrompt ?? DEFAULT_SYSTEM_PROMPT]

    const businessName = typeof request.metadata?.businessName === "string" ? request.metadata.businessName : null
    if (businessName) lines.push(`\nNegocio: ${businessName}.`)
    lines.push(`\nPlan del usuario: ${request.plan ?? "business"} · Rol: ${request.role}.`)

    // FASE 3D — Contexto empresarial y memoria relevante (solo si vienen del request).
    if (request.businessContext) lines.push(`\n${request.businessContext}`)
    if (request.memoryContext) lines.push(`\n${request.memoryContext}`)

    const tools = this.options.toolsProvider?.() ?? []
    if (tools.length > 0) {
      lines.push("\nHerramientas disponibles (usa sus datos como única fuente de verdad):")
      for (const tool of tools) {
        lines.push(`- ${tool.name}: ${tool.description}`)
      }
    }

    if (toolResults.length > 0) {
      lines.push("\nResultados de las últimas herramientas ejecutadas:")
      for (const t of toolResults) {
        lines.push(`- ${t.name} (${t.ok ? "ok" : "error"}): ${t.ok ? (t.output ?? "") : (t.error ?? "")}`)
      }
    }

    return lines.join("\n")
  }
}
