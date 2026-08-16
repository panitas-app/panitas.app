/**
 * Agentic Tool Runner (FASE 3E).
 *
 * Bucle agéntico: el LLM interpreta la intención y decide QUÉ tools llamar de
 * forma nativa (function calling). El runner coordina:
 *
 *   - construir el system prompt (reglas absolutas + fecha + contexto);
 *   - exponer SOLO las tools que el rol del usuario permite (filtro por permisos);
 *   - llamar al proveedor con `tools`;
 *   - ejecutar cada tool_call a través del ToolExecutor (permisos + validación
 *     + aislamiento de negocio + logging), devolviendo resultados al modelo;
 *   - encadenar hasta `maxIterations` hasta que el modelo emita respuesta final;
 *   - bloquear acciones destructivas hasta la confirmación explícita del usuario,
 *     con ids de paso estables ligados a tool + argumentos (nunca se ejecuta una
 *     entidad distinta de la confirmada) y validación de confirmaciones recibidas.
 *
 * NUNCA ejecuta una tool por sí mismo sin pasar por el ToolExecutor, y NUNCA
 * construye el contexto del usuario desde el input del LLM.
 */
import type { AIProvider, ProviderMessage } from "../providers/types"
import type { AgentRequest, ResolvedToolCall, UsageInfo } from "../types"
import type { ToolExecutionContext, ToolMetadata, ToolResponse } from "@/lib/agent/tools/types"
import type { ToolRegistry } from "@/lib/agent/tools/registry"
import type { ToolExecutor } from "@/lib/agent/tools/executor"
import { toolAllowed } from "@/lib/agent/tools/permissions"
import type { ConfirmationSystem } from "@/lib/agent-intel"
import type { ExecutionPlan, IntentClassification, PlannedStep } from "@/lib/agent-intel/types"
import { buildAgenticSystemPrompt } from "./prompt"
import { toProviderTools } from "./schema"
import type { AgenticRunInput, AgenticRunResult } from "./types"

export interface AgenticToolRunnerDeps {
  provider: AIProvider
  registry: ToolRegistry
  executor: ToolExecutor
  confirmation?: ConfirmationSystem
  options?: {
    /** Máximo de iteraciones del bucle agéntico (guard de costo). */
    maxIterations?: number
    /** Máximo de caracteres de un resultado de tool enviado de vuelta al modelo. */
    maxToolMessageChars?: number
    /** Modo de selección de herramientas (default "auto"). */
    toolChoice?: "auto" | "none" | "required"
  }
}

const DEFAULT_MAX_ITERATIONS = 5
const DEFAULT_MAX_TOOL_MESSAGE_CHARS = 15000

/** Hash corto y determinista de los argumentos (vincula la confirmación a la entidad). */
export function shortHash(value: string): string {
  let hash = 5381
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 33) ^ value.charCodeAt(i)
  }
  return (hash >>> 0).toString(36).slice(0, 8)
}

/** Id de paso estable ligado a tool + argumentos (la confirmación no aplica a otra entidad). */
export function nativeStepId(toolName: string, input: Record<string, unknown>): string {
  return `native:${toolName}:${shortHash(JSON.stringify(input))}`
}

function minimalIntent(message: string, domains: string[]): IntentClassification {
  return {
    type: "accion",
    confidence: 1,
    domains,
    message,
    entities: {},
    destructive: false,
    needsTools: true,
    signals: [],
  }
}

function buildPlan(message: string, calls: Array<{ name: string; input: Record<string, unknown> }>): ExecutionPlan {
  const steps: PlannedStep[] = calls.map((call) => ({
    id: nativeStepId(call.name, call.input),
    tool: call.name,
    domain: call.name.split(".")[0] ?? "agent",
    input: call.input,
    dependsOn: [],
    parallel: true,
    retryable: false,
    requiresConfirmation: false,
    rationale: "Tool call emitida nativamente por el modelo.",
  }))
  return {
    id: `native-${Date.now()}`,
    intent: minimalIntent(message, [...new Set(steps.map((s) => s.domain))]),
    steps,
    requiresConfirmation: false,
    domains: [...new Set(steps.map((s) => s.domain))],
  }
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text
  return `${text.slice(0, max)}… [truncado]`
}

function serializeToolResult(response: ToolResponse, max: number): string {
  return truncate(
    JSON.stringify({ ok: response.success, data: response.data, error: response.error }),
    max
  )
}

export class AgenticToolRunner {
  private readonly provider: AIProvider
  private readonly registry: ToolRegistry
  private readonly executor: ToolExecutor
  private readonly confirmation: ConfirmationSystem | null
  private readonly maxIterations: number
  private readonly maxToolMessageChars: number
  private readonly toolChoice: "auto" | "none" | "required"

  constructor(deps: AgenticToolRunnerDeps) {
    this.provider = deps.provider
    this.registry = deps.registry
    this.executor = deps.executor
    this.confirmation = deps.confirmation ?? null
    this.maxIterations = deps.options?.maxIterations ?? DEFAULT_MAX_ITERATIONS
    this.maxToolMessageChars = deps.options?.maxToolMessageChars ?? DEFAULT_MAX_TOOL_MESSAGE_CHARS
    this.toolChoice = deps.options?.toolChoice ?? "auto"
  }

  /** Herramientas visibles para el modelo = tools del registro permitidas por el rol. */
  allowedTools(ctx: ToolExecutionContext): ToolMetadata[] {
    return this.registry
      .list()
      .filter((tool) => toolAllowed(ctx, tool))
      .map((tool) => ({
        name: tool.name,
        domain: tool.domain,
        description: tool.description,
        requiredPermissions: tool.requiredPermissions,
        inputSchema: tool.inputSchema,
      }))
  }

  async run(input: AgenticRunInput): Promise<AgenticRunResult> {
    const { request, toolContext, confirmedStepIds } = input

    const systemPrompt = buildAgenticSystemPrompt({
      businessName: typeof request.metadata?.businessName === "string" ? request.metadata.businessName : undefined,
      plan: request.plan,
      role: request.role,
      businessContext: request.businessContext,
      memoryContext: request.memoryContext,
    })

    const tools = toProviderTools(this.allowedTools(toolContext))
    const messages = this.buildMessages(systemPrompt, request)

    let usage: UsageInfo | undefined
    let totalToolCalls: ResolvedToolCall[] = []

    for (let iteration = 0; iteration < this.maxIterations; iteration++) {
      let response
      try {
        response = await this.provider.chat(messages, "chat", {
          tools: tools.length > 0 ? tools : undefined,
          toolChoice: tools.length > 0 ? this.toolChoice : undefined,
          temperature: 0.4,
        })
      } catch (error) {
        const message = error instanceof Error ? error.message : "El proveedor de IA no respondió"
        return {
          status: "error",
          reply: message,
          provider: "agentic",
          model: "unknown",
          error: message,
          toolCalls: totalToolCalls,
        }
      }

      usage = this.mergeUsage(usage, response.usage)

      // El modelo terminó: respuesta final en lenguaje natural.
      if (!response.toolCalls || response.toolCalls.length === 0) {
        return {
          status: "completed",
          reply: response.content || "Listo.",
          provider: response.provider,
          model: response.model,
          usage,
          toolCalls: totalToolCalls,
        }
      }

      // Parsear argumentos y separar llamadas que requieren confirmación.
      const parsed = response.toolCalls.map((call) => ({
        ...call,
        input: this.parseArguments(call.arguments),
      }))

      const plan = buildPlan(request.message, parsed.map((c) => ({ name: c.name, input: c.input })))
      const required = this.confirmation ? this.confirmation.requirementsFor(plan) : []
      const requiredIds = new Set(required.map((step) => step.id))

      const fullyConfirmed = this.confirmation
        ? this.confirmation.isFullyConfirmed(plan, confirmedStepIds)
        : true

      const pending = parsed.filter((call) => requiredIds.has(nativeStepId(call.name, call.input)))

      // Confirmación pendiente: NO se ejecuta nada hasta la confirmación explícita.
      // El usuario la dará en la segunda vuelta (id de paso ligado a tool+argumentos).
      if (this.confirmation && pending.length > 0 && !fullyConfirmed) {
        const confirmation = this.confirmation.request(plan)
        return {
          status: "confirmation_required",
          reply: confirmation.message,
          provider: response.provider,
          model: response.model,
          usage,
          toolCalls: totalToolCalls,
          confirmation,
        }
      }

      // Ejecutar TODAS las llamadas (las destructivas ya confirmadas por el usuario).
      messages.push({
        role: "assistant",
        content: response.content,
        toolCalls: response.toolCalls,
      })

      const executed: ResolvedToolCall[] = []
      for (const call of parsed) {
        const result = await this.executor.execute(toolContext, call.name, call.input)
        executed.push({ name: call.name, input: call.input, ok: result.success, output: result.success ? JSON.stringify(result.data) : undefined, error: result.error ?? undefined })
        messages.push({ role: "tool", content: serializeToolResult(result, this.maxToolMessageChars), toolCallId: call.id })
      }
      totalToolCalls = [...totalToolCalls, ...executed]
    }

    return {
      status: "error",
      reply: "No pude resolver la solicitud en el máximo de pasos permitidos.",
      provider: "agentic",
      model: "unknown",
      error: "max_iterations",
      toolCalls: totalToolCalls,
    }
  }

  /** Argumentos JSON del modelo, con parseo tolerante (comentarios/quotes). */
  private parseArguments(raw: string): Record<string, unknown> {
    const text = raw.trim()
    if (!text) return {}
    try {
      const parsed = JSON.parse(text)
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : {}
    } catch {
      const match = text.match(/\{[\s\S]*\}/)
      if (match) {
        try {
          const parsed = JSON.parse(match[0])
          return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : {}
        } catch {
          return {}
        }
      }
      return {}
    }
  }

  /** Convierte historial limitado + mensaje actual en mensajes del proveedor. */
  private buildMessages(systemPrompt: string, request: AgentRequest): ProviderMessage[] {
    const messages: ProviderMessage[] = [{ role: "system", content: systemPrompt }]

    for (const message of request.history ?? []) {
      if (message.role === "user") {
        messages.push({ role: "user", content: message.content })
      } else if (message.role === "assistant" && !message.toolCalls) {
        messages.push({ role: "assistant", content: message.content })
      }
    }

    messages.push({ role: "user", content: request.message })
    return messages
  }

  private mergeUsage(current: UsageInfo | undefined, next: UsageInfo | undefined): UsageInfo | undefined {
    if (!next) return current
    if (!current) return next
    return {
      promptTokens: (current.promptTokens ?? 0) + (next.promptTokens ?? 0),
      completionTokens: (current.completionTokens ?? 0) + (next.completionTokens ?? 0),
      totalTokens: (current.totalTokens ?? 0) + (next.totalTokens ?? 0),
    }
  }
}
