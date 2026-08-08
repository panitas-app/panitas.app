/**
 * NVIDIA NIM Adapter (migración OpenRouter → NVIDIA).
 *
 * ÚNICO módulo (junto a `openrouter.ts`) que conoce la API de NVIDIA NIM
 * (endpoint OpenAI-compatible `https://integrate.api.nvidia.com/v1`).
 * Todo lo demás depende de la interfaz `LLMProvider`.
 */
import type { LLMProvider } from "./types"
import { OpenAICompatibleProvider } from "./openai-compatible"

export interface NvidiaNimConfig {
  apiKey: string
  baseUrl: string
  defaultModel: string
}

export class NvidiaNimProvider extends OpenAICompatibleProvider implements LLMProvider {
  constructor(config: NvidiaNimConfig) {
    super({
      id: "nvidia",
      apiKey: config.apiKey,
      baseUrl: config.baseUrl,
      defaultModel: config.defaultModel,
      displayName: "NVIDIA NIM",
      envKeyName: "NVIDIA_NIM_API_KEY",
    })
  }
}

export function createNvidiaNimProvider(config: NvidiaNimConfig): NvidiaNimProvider {
  return new NvidiaNimProvider(config)
}
