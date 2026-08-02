/**
 * AI Provider Manager (FASE 3A).
 *
 * Capa intermedia OBLIGATORIA entre el Agent Core y los adaptadores de proveedor.
 * El Core solo habla con esta clase (interfaz `AIProvider`) y NUNCA con un proveedor
 * concreto. Responsabilidades:
 *
 *   - seleccionar proveedor (vía Model Router)
 *   - seleccionar modelo (vía Model Router)
 *   - manejar errores (errores tipados `ProviderError`)
 *   - retries con backoff exponencial (solo errores reintentables)
 *   - timeout por llamada (AbortSignal)
 *   - métricas (ProviderMetrics)
 *   - logging (hook inyectable)
 *   - costos futuros (métricas de uso/tokens ya registradas)
 */
import type { AIProvider, LLMProvider, ProviderCallOptions, ProviderMessage, ProviderResponse, StructuredOutputSchema } from "./types"
import type { AgentTaskType } from "../types"
import { ModelRouter } from "../model-router"
import { ProviderMetrics } from "../metrics"
import { isRetryable, providerErrorMessage } from "../errors"

export interface AIProviderManagerOptions {
  providers: Record<string, LLMProvider>
  router: ModelRouter
  metrics?: ProviderMetrics
  defaults?: { timeoutMs: number; retries: number }
  logger?: (entry: { level: "info" | "warn" | "error"; message: string; meta?: Record<string, unknown> }) => void
}

const defaultLogger: NonNullable<AIProviderManagerOptions["logger"]> = (entry) => {
  const line = `[agent:${entry.level}] ${entry.message}`
  if (entry.level === "error") console.error(line, entry.meta ?? {})
  else if (entry.level === "warn") console.warn(line, entry.meta ?? {})
  else console.log(line, entry.meta ?? {})
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function backoff(attempt: number): number {
  return Math.min(250 * 2 ** attempt, 8000)
}

export class AIProviderManager implements AIProvider {
  private readonly metrics: ProviderMetrics
  private readonly logger: NonNullable<AIProviderManagerOptions["logger"]>

  constructor(private readonly options: AIProviderManagerOptions) {
    this.metrics = options.metrics ?? new ProviderMetrics()
    this.logger = options.logger ?? defaultLogger
  }

  getMetrics(): ProviderMetrics {
    return this.metrics
  }

  /** Ruta resuelta para una tarea (proveedor + modelo + parámetros). */
  resolveRoute(taskType: AgentTaskType) {
    return this.options.router.resolve(taskType)
  }

  async chat(messages: ProviderMessage[], taskType: AgentTaskType = "chat", options: ProviderCallOptions = {}): Promise<ProviderResponse> {
    return this.withRetries(taskType, options, (provider, callOptions) => provider.chat(messages, callOptions))
  }

  async complete(prompt: string, taskType: AgentTaskType = "chat", options: ProviderCallOptions = {}): Promise<ProviderResponse> {
    return this.withRetries(taskType, options, (provider, callOptions) =>
      provider.complete(prompt, callOptions)
    )
  }

  async generateStructuredOutput<T>(
    prompt: string,
    schema: StructuredOutputSchema,
    taskType: AgentTaskType = "json",
    options: ProviderCallOptions = {}
  ): Promise<T> {
    return this.withRetries(taskType, options, (provider, callOptions) =>
      provider.generateStructuredOutput<T>(prompt, schema, callOptions)
    )
  }

  private async withRetries<T>(
    taskType: AgentTaskType,
    options: ProviderCallOptions,
    fn: (provider: LLMProvider, callOptions: ProviderCallOptions) => Promise<T>
  ): Promise<T> {
    const route = this.options.router.resolve(taskType)
    const provider = this.options.providers[route.provider]
    if (!provider) {
      throw new Error(`Proveedor de IA no registrado: ${route.provider}`)
    }

    const timeoutMs = options.timeoutMs ?? this.options.defaults?.timeoutMs ?? 30000
    const retries = options.retries ?? this.options.defaults?.retries ?? 2
    const startedAt = Date.now()
    let attempts = 0
    let lastError: unknown = null

    for (let attempt = 0; attempt <= retries; attempt++) {
      attempts++
      const signal = options.signal ?? AbortSignal.timeout(timeoutMs)
      const callOptions: ProviderCallOptions = {
        ...options,
        model: route.model,
        temperature: options.temperature ?? route.temperature,
        maxTokens: options.maxTokens ?? route.maxTokens,
        signal,
      }

      try {
        const result = await fn(provider, callOptions)
        this.metrics.record({
          provider: route.provider,
          model: route.model,
          taskType,
          startedAt,
          durationMs: Date.now() - startedAt,
          attempts,
          status: "success",
        })
        return result
      } catch (error) {
        lastError = error
        if (options.signal?.aborted) break
        const shouldRetry = isRetryable(error) && attempt < retries
        if (shouldRetry) {
          this.logger({ level: "warn", message: `Reintentando llamada ${taskType}/${route.model} (intento ${attempt + 1}/${retries})`, meta: { error: providerErrorMessage(error) } })
          await sleep(backoff(attempt))
        } else {
          break
        }
      }
    }

    this.metrics.record({
      provider: route.provider,
      model: route.model,
      taskType,
      startedAt,
      durationMs: Date.now() - startedAt,
      attempts,
      status: "error",
      error: providerErrorMessage(lastError),
    })
    this.logger({ level: "error", message: `Fallo definitivo de llamada ${taskType}/${route.model}`, meta: { error: providerErrorMessage(lastError), attempts } })
    throw lastError
  }
}
