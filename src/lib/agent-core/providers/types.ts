/**
 * Contratos de proveedores LLM (FASE 3A).
 *
 * - `LLMProvider`: contrato de adaptador (un proveedor concreto). Conoce modelo explícito.
 * - `AIProvider`: contrato del AI Provider Manager (facade). El resto del sistema solo habla con esta interfaz.
 *
 * Regla: NINGÚN módulo fuera de `providers/` conoce a OpenRouter. El Core depende de estas interfaces.
 */
import type { AgentTaskType, UsageInfo } from "../types"

export type ProviderRole = "system" | "user" | "assistant" | "tool"

/** Llamada a herramienta emitida nativamente por el modelo (function calling). */
export interface ProviderToolCall {
  /** Id de la llamada (debe usarse en la respuesta `role: "tool"`). */
  id: string
  name: string
  /** Argumentos crudos en JSON (se parsean en la capa agéntica). */
  arguments: string
}

export interface ProviderMessage {
  role: ProviderRole
  content: string
  /** FASE 3E: tool_calls del assistant (rol assistant, para continuar el loop). */
  toolCalls?: ProviderToolCall[]
  /** FASE 3E: id de la llamada que responde (rol tool). */
  toolCallId?: string
}

export type ProviderUsage = UsageInfo

/** Definición de función nativa (OpenAI-compatible `tools`). */
export interface ProviderToolFunction {
  name: string
  description: string
  parameters: Record<string, unknown>
}

export interface ProviderToolDefinition {
  type: "function"
  function: ProviderToolFunction
}

export type ProviderToolChoice =
  | "auto"
  | "none"
  | "required"
  | { type: "function"; function: { name: string } }

export interface ProviderCallOptions {
  model?: string
  temperature?: number
  maxTokens?: number
  timeoutMs?: number
  retries?: number
  signal?: AbortSignal
  metadata?: Record<string, unknown>
  /** FASE 3E: herramientas nativas disponibles para el modelo. */
  tools?: ProviderToolDefinition[]
  /** FASE 3E: política de selección de herramientas (default "auto"). */
  toolChoice?: ProviderToolChoice
}

/** Esquema para salida estructurada (JSON). */
export interface StructuredOutputSchema {
  name: string
  description?: string
  jsonSchema: Record<string, unknown>
}

/** Respuesta normalizada de un proveedor (aún no formateada por el Response Formatter). */
export interface ProviderResponse {
  provider: string
  model: string
  content: string
  usage?: ProviderUsage
  /** FASE 3E: llamadas a herramientas solicitadas por el modelo (si aplica). */
  toolCalls?: ProviderToolCall[]
}

/** Contrato de un adaptador de proveedor LLM (p.ej. OpenRouter). */
export interface LLMProvider {
  readonly id: string
  chat(messages: ProviderMessage[], options?: ProviderCallOptions): Promise<ProviderResponse>
  complete(prompt: string, options?: ProviderCallOptions): Promise<ProviderResponse>
  generateStructuredOutput<T>(prompt: string, schema: StructuredOutputSchema, options?: ProviderCallOptions): Promise<T>
}

/**
 * Contrato del AI Provider Manager.
 * Recibe el tipo de tarea y resuelve internamente proveedor + modelo + reintentos + timeout + métricas.
 */
export interface AIProvider {
  chat(messages: ProviderMessage[], taskType?: AgentTaskType, options?: ProviderCallOptions): Promise<ProviderResponse>
  complete(prompt: string, taskType?: AgentTaskType, options?: ProviderCallOptions): Promise<ProviderResponse>
  generateStructuredOutput<T>(
    prompt: string,
    schema: StructuredOutputSchema,
    taskType?: AgentTaskType,
    options?: ProviderCallOptions
  ): Promise<T>
}
