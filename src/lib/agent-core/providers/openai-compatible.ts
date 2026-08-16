/**
 * Adaptador base OpenAI-compatible (FASE 3A).
 *
 * OpenRouter y NVIDIA NIM exponen la misma API de chat completions. Este adaptador
 * concentra la lógica común (payload, manejo de errores tipados, parseo de JSON)
 * y cada proveedor concreto solo aporta su id, headers y nombre para mensajes.
 * El resto del sistema depende de la interfaz `LLMProvider`.
 */
import type {
  LLMProvider,
  ProviderCallOptions,
  ProviderMessage,
  ProviderResponse,
  ProviderToolCall,
  StructuredOutputSchema,
} from "./types"
import {
  ProviderHttpError,
  ProviderInvalidResponseError,
  ProviderMissingKeyError,
  ProviderNetworkError,
  ProviderTimeoutError,
} from "../errors"

export interface OpenAICompatibleProviderConfig {
  /** id del proveedor registrado (p.ej. "openrouter" | "nvidia"). */
  readonly id: string
  apiKey: string
  baseUrl: string
  defaultModel: string
  /** Nombre para mensajes de error (p.ej. "OpenRouter"). */
  displayName: string
  /** Variable de entorno de la API key (p.ej. "OPENROUTER_API_KEY"). */
  envKeyName: string
  /** Headers adicionales específicos del proveedor (p.ej. HTTP-Referer). */
  extraHeaders?: Record<string, string>
}

interface ChatCompletionResponse {
  model?: string
  choices?: Array<{
    message?: {
      content?: unknown
      tool_calls?: Array<{ id?: string; type?: string; function?: { name?: string; arguments?: string } }>
    }
  }>
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number }
}

function toWireMessage(message: ProviderMessage): Record<string, unknown> {
  const base: Record<string, unknown> = { role: message.role, content: message.content }
  // FASE 3E: assistant con tool_calls (se continúa el loop con los resultados).
  if (message.toolCalls && message.toolCalls.length > 0) {
    base.tool_calls = message.toolCalls.map((call) => ({
      id: call.id,
      type: "function",
      function: { name: call.name, arguments: call.arguments },
    }))
  }
  // FASE 3E: resultado de una herramienta (rol tool).
  if (message.toolCallId) {
    base.tool_call_id = message.toolCallId
  }
  return base
}

export class OpenAICompatibleProvider implements LLMProvider {
  readonly id: string

  constructor(protected readonly config: OpenAICompatibleProviderConfig) {
    this.id = config.id
  }

  async chat(messages: ProviderMessage[], options: ProviderCallOptions = {}): Promise<ProviderResponse> {
    const body: Record<string, unknown> = {
      model: options.model ?? this.config.defaultModel,
      messages: messages.map(toWireMessage),
      stream: false,
    }
    if (options.temperature !== undefined) body.temperature = options.temperature
    if (options.maxTokens !== undefined) body.max_tokens = options.maxTokens
    if (options.tools !== undefined) body.tools = options.tools
    if (options.toolChoice !== undefined) body.tool_choice = options.toolChoice
    return this.request(body, options)
  }

  async complete(prompt: string, options: ProviderCallOptions = {}): Promise<ProviderResponse> {
    return this.chat([{ role: "user", content: prompt }], options)
  }

  async generateStructuredOutput<T>(
    prompt: string,
    schema: StructuredOutputSchema,
    options: ProviderCallOptions = {}
  ): Promise<T> {
    const response = await this.chat(
      [{ role: "user", content: this.structuredPrompt(prompt, schema) }],
      { ...options, temperature: options.temperature ?? 0 }
    )
    return this.parseJson<T>(response.content)
  }

  /** Prompt que fuerza salida JSON pura (compatible con modelos sin `response_format`). */
  private structuredPrompt(prompt: string, schema: StructuredOutputSchema): string {
    return [
      "Debes responder ÚNICAMENTE con JSON válido que cumpla el siguiente JSON Schema.",
      `Nombre del esquema: ${schema.name}`,
      schema.description ? `Propósito: ${schema.description}` : "",
      `JSON Schema:\n${JSON.stringify(schema.jsonSchema)}`,
      "",
      "Instrucciones: no uses markdown, no uses bloques de código, no agregues explicaciones.",
      "",
      "Solicitud:",
      prompt,
    ].join("\n")
  }

  private async request(body: Record<string, unknown>, options: ProviderCallOptions): Promise<ProviderResponse> {
    if (!this.config.apiKey) {
      throw new ProviderMissingKeyError(`${this.config.envKeyName} no está configurada`, { provider: this.id })
    }

    const url = `${this.config.baseUrl.replace(/\/$/, "")}/chat/completions`
    let res: Response
    try {
      res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          "Content-Type": "application/json",
          ...this.config.extraHeaders,
        },
        body: JSON.stringify(body),
        signal: options.signal,
      })
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new ProviderTimeoutError(`El proveedor ${this.config.displayName} no respondió a tiempo`, { provider: this.id, cause: error })
      }
      const message = error instanceof Error ? error.message : "Error de red desconocido"
      throw new ProviderNetworkError(`No se pudo conectar con ${this.config.displayName}: ${message}`, { provider: this.id, cause: error })
    }

    if (!res.ok) {
      const bodyText = await res.text().catch(() => "")
      throw new ProviderHttpError(res.status, `${this.config.displayName} respondió con estado ${res.status}`, {
        provider: this.id,
        body: bodyText,
      })
    }

    const data = (await res.json().catch(() => null)) as ChatCompletionResponse | null
    const rawMessage = data?.choices?.[0]?.message
    const content = rawMessage?.content
    const toolCalls = parseToolCalls(rawMessage?.tool_calls)

    // FASE 3E: si el modelo pidió herramientas y no dio contenido, la respuesta
    // es válida (el loop agéntico continúa ejecutando las llamadas).
    if (toolCalls.length > 0) {
      return {
        provider: this.id,
        model: data?.model ?? (body.model as string),
        content: typeof content === "string" ? content : "",
        usage: data?.usage
          ? {
              promptTokens: data.usage.prompt_tokens,
              completionTokens: data.usage.completion_tokens,
              totalTokens: data.usage.total_tokens,
            }
          : undefined,
        toolCalls,
      }
    }

    if (typeof content !== "string" || content.length === 0) {
      throw new ProviderInvalidResponseError(`${this.config.displayName} no devolvió contenido`, { provider: this.id })
    }

    return {
      provider: this.id,
      model: data?.model ?? (body.model as string),
      content,
      usage: data?.usage
        ? {
            promptTokens: data.usage.prompt_tokens,
            completionTokens: data.usage.completion_tokens,
            totalTokens: data.usage.total_tokens,
          }
        : undefined,
    }
  }

  private parseJson<T>(content: string): T {
    let text = content.trim()
    if (text.startsWith("```")) {
      text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "")
    }
    try {
      return JSON.parse(text) as T
    } catch {
      const match = text.match(/\{[\s\S]*\}/)
      if (match) {
        try {
          return JSON.parse(match[0]) as T
        } catch {
          // fallthrough
        }
      }
      throw new ProviderInvalidResponseError(`${this.config.displayName} no devolvió JSON válido`, { provider: this.id })
    }
  }
}

function parseToolCalls(raw: unknown): ProviderToolCall[] {
  if (!Array.isArray(raw)) return []
  const calls: ProviderToolCall[] = []
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue
    const record = entry as { id?: unknown; function?: { name?: unknown; arguments?: unknown } }
    if (typeof record.function?.name !== "string") continue
    calls.push({
      id: typeof record.id === "string" ? record.id : `call_${Math.random().toString(36).slice(2, 10)}`,
      name: record.function.name,
      arguments: typeof record.function.arguments === "string" ? record.function.arguments : "",
    })
  }
  return calls
}
