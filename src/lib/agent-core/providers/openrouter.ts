/**
 * OpenRouter Adapter (FASE 3A).
 *
 * ÚNICO módulo (junto a `nvidia.ts`) que conoce la API concreta de OpenRouter.
 * Todo lo demás depende de la interfaz `LLMProvider`; si mañana cambia de proveedor,
 * este adaptador se reemplaza y el resto del sistema no se modifica.
 */
import type { LLMProvider } from "./types"
import { OpenAICompatibleProvider } from "./openai-compatible"

export interface OpenRouterConfig {
  apiKey: string
  baseUrl: string
  appTitle: string
  httpReferer: string
  defaultModel: string
}

export class OpenRouterProvider extends OpenAICompatibleProvider implements LLMProvider {
  constructor(config: OpenRouterConfig) {
    super({
      id: "openrouter",
      apiKey: config.apiKey,
      baseUrl: config.baseUrl,
      defaultModel: config.defaultModel,
      displayName: "OpenRouter",
      envKeyName: "OPENROUTER_API_KEY",
      extraHeaders: {
        "HTTP-Referer": config.httpReferer,
        "X-OpenRouter-Title": config.appTitle,
      },
    })
  }
}

export function createOpenRouterProvider(config: OpenRouterConfig): OpenRouterProvider {
  return new OpenRouterProvider(config)
}
