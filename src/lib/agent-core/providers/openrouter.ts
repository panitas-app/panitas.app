/**
 * OpenRouter Adapter (FASE 3A).
 *
 * ÚNICO módulo de todo el sistema que conoce la API de OpenRouter.
 * Todo lo demás depende de la interfaz `LLMProvider`; si mañana cambia de proveedor,
 * este adaptador se reemplaza y el resto del sistema no se modifica.
 */
import type {
  LLMProvider,
  ProviderCallOptions,
  ProviderMessage,
  ProviderResponse,
  StructuredOutputSchema,
} from "./types"
import {
  ProviderHttpError,
  ProviderInvalidResponseError,
  ProviderMissingKeyError,
  ProviderNetworkError,
  ProviderTimeoutError,
} from "../errors"

export interface OpenRouterConfig {
  apiKey: string
  baseUrl: string
  appTitle: string
  httpReferer: string
  defaultModel: string
}

interface ChatCompletionResponse {
  model?: string
  choices?: Array<{ message?: { content?: unknown } }>
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number }
}

export class OpenRouterProvider implements LLMProvider {
  readonly id = "openrouter"

  constructor(private readonly config: OpenRouterConfig) {}

  async chat(messages: ProviderMessage[], options: ProviderCallOptions = {}): Promise<ProviderResponse> {
    const body: Record<string, unknown> = {
      model: options.model ?? this.config.defaultModel,
      messages,
      stream: false,
    }
    if (options.temperature !== undefined) body.temperature = options.temperature
    if (options.maxTokens !== undefined) body.max_tokens = options.maxTokens
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
      throw new ProviderMissingKeyError("OPENROUTER_API_KEY no está configurada", { provider: this.id })
    }

    const url = `${this.config.baseUrl.replace(/\/$/, "")}/chat/completions`
    let res: Response
    try {
      res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": this.config.httpReferer,
          "X-OpenRouter-Title": this.config.appTitle,
        },
        body: JSON.stringify(body),
        signal: options.signal,
      })
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new ProviderTimeoutError("El proveedor OpenRouter no respondió a tiempo", { provider: this.id, cause: error })
      }
      const message = error instanceof Error ? error.message : "Error de red desconocido"
      throw new ProviderNetworkError(`No se pudo conectar con OpenRouter: ${message}`, { provider: this.id, cause: error })
    }

    if (!res.ok) {
      const bodyText = await res.text().catch(() => "")
      throw new ProviderHttpError(res.status, `OpenRouter respondió con estado ${res.status}`, {
        provider: this.id,
        body: bodyText,
      })
    }

    const data = (await res.json().catch(() => null)) as ChatCompletionResponse | null
    const content = data?.choices?.[0]?.message?.content
    if (typeof content !== "string" || content.length === 0) {
      throw new ProviderInvalidResponseError("OpenRouter no devolvió contenido", { provider: this.id })
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
      throw new ProviderInvalidResponseError("OpenRouter no devolvió JSON válido", { provider: this.id })
    }
  }
}

export function createOpenRouterProvider(config: OpenRouterConfig): OpenRouterProvider {
  return new OpenRouterProvider(config)
}
