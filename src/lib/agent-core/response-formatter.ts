/**
 * Response Formatter (FASE 3A).
 *
 * Garantía de que NINGUNA respuesta que sale del Agent Core sea la respuesta cruda
 * de un proveedor. Todo pasa por aquí y se normaliza a `AgentResponse`.
 */
import type { AgentRequest, AgentResponse, AgentTaskType, ResolvedToolCall, UsageInfo } from "./types"
import type { ProviderResponse } from "./providers/types"

export interface FormatOptions {
  sessionId: string
  taskType: AgentTaskType
  toolCalls: ResolvedToolCall[]
  id?: string
  now?: () => Date
}

export interface MakeId {
  (): string
}

const defaultMakeId: MakeId = () => `agent_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`

export class ResponseFormatter {
  constructor(private readonly makeId: MakeId = defaultMakeId) {}

  format(provider: ProviderResponse, request: AgentRequest, opts: FormatOptions): AgentResponse {
    return {
      id: opts.id ?? this.makeId(),
      sessionId: opts.sessionId,
      userId: request.userId,
      storeId: request.storeId,
      reply: provider.content.trim(),
      taskType: opts.taskType,
      provider: provider.provider,
      model: provider.model,
      usage: toUsage(provider.usage),
      toolCalls: opts.toolCalls,
      ok: true,
      createdAt: (opts.now ?? (() => new Date()))().toISOString(),
    }
  }

  /** Respuesta con salida estructurada (JSON) adherida. */
  formatStructured<T>(data: T, provider: ProviderResponse, request: AgentRequest, opts: FormatOptions): AgentResponse {
    return { ...this.format(provider, request, opts), structured: data }
  }

  /** Respuesta de error normalizada (nunca expone raw del proveedor). */
  formatError(error: unknown, request: AgentRequest, opts: Omit<FormatOptions, "taskType"> & { taskType?: AgentTaskType }): AgentResponse {
    const message = error instanceof Error ? error.message : "Error desconocido"
    return {
      id: opts.id ?? this.makeId(),
      sessionId: opts.sessionId,
      userId: request.userId,
      storeId: request.storeId,
      reply: message,
      taskType: opts.taskType ?? request.taskType ?? "chat",
      provider: "unknown",
      model: "unknown",
      toolCalls: opts.toolCalls,
      ok: false,
      error: message,
      createdAt: (opts.now ?? (() => new Date()))().toISOString(),
    }
  }
}

function toUsage(usage?: UsageInfo): UsageInfo | undefined {
  if (!usage) return undefined
  const result: UsageInfo = {}
  if (usage.promptTokens !== undefined) result.promptTokens = usage.promptTokens
  if (usage.completionTokens !== undefined) result.completionTokens = usage.completionTokens
  if (usage.totalTokens !== undefined) result.totalTokens = usage.totalTokens
  return Object.keys(result).length > 0 ? result : undefined
}
