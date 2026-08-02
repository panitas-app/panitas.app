/**
 * Contratos de proveedores LLM (FASE 3A).
 *
 * - `LLMProvider`: contrato de adaptador (un proveedor concreto). Conoce modelo explícito.
 * - `AIProvider`: contrato del AI Provider Manager (facade). El resto del sistema solo habla con esta interfaz.
 *
 * Regla: NINGÚN módulo fuera de `providers/` conoce a OpenRouter. El Core depende de estas interfaces.
 */
import type { AgentTaskType, UsageInfo } from "../types"

export type ProviderRole = "system" | "user" | "assistant"

export interface ProviderMessage {
  role: ProviderRole
  content: string
}

export type ProviderUsage = UsageInfo

export interface ProviderCallOptions {
  model?: string
  temperature?: number
  maxTokens?: number
  timeoutMs?: number
  retries?: number
  signal?: AbortSignal
  metadata?: Record<string, unknown>
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
