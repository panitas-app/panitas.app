import { describe, expect, it } from "vitest"
import { loadAgentConfig, DEFAULT_FREE_MODEL, DEFAULT_PROVIDER, DEFAULT_OPENROUTER_BASE_URL } from "@/lib/agent-core/config"

describe("loadAgentConfig", () => {
  it("usa defaults válidos sin entorno (modelo gratuito, openrouter, sin API key)", () => {
    const config = loadAgentConfig({})
    expect(config.openrouter.apiKey).toBe("")
    expect(config.openrouter.baseUrl).toBe(DEFAULT_OPENROUTER_BASE_URL)
    expect(config.defaults.timeoutMs).toBe(30000)
    expect(config.defaults.retries).toBe(2)
    for (const task of Object.keys(config.models)) {
      expect(config.models[task as keyof typeof config.models].model).toBe(DEFAULT_FREE_MODEL)
      expect(config.models[task as keyof typeof config.models].provider).toBe(DEFAULT_PROVIDER)
    }
  })

  it("permite configurar cada tarea con su propio modelo (sin acoplar el Core)", () => {
    const config = loadAgentConfig({
      OPENROUTER_API_KEY: "sk-test",
      CHAT_MODEL: "modelo-gratis",
      BUSINESS_MODEL: "modelo-premium",
      JSON_MODEL: "modelo-json",
    })
    expect(config.openrouter.apiKey).toBe("sk-test")
    expect(config.models.chat.model).toBe("modelo-gratis")
    expect(config.models.business_analysis.model).toBe("modelo-premium")
    expect(config.models.json.model).toBe("modelo-json")
    expect(config.models.summarization.model).toBe(DEFAULT_FREE_MODEL)
  })

  it("respeta parámetros por tarea (temperatura y maxTokens)", () => {
    const config = loadAgentConfig({
      JSON_MODEL_TEMPERATURE: "0",
      JSON_MODEL_MAX_TOKENS: "4096",
      AI_TIMEOUT_MS: "15000",
      AI_RETRIES: "1",
    })
    expect(config.models.json.temperature).toBe(0)
    expect(config.models.json.maxTokens).toBe(4096)
    expect(config.defaults.timeoutMs).toBe(15000)
    expect(config.defaults.retries).toBe(1)
  })

  it("permite proveedor por tarea", () => {
    const config = loadAgentConfig({
      AI_PROVIDER: "openrouter",
      BUSINESS_MODEL_PROVIDER: "openrouter",
    })
    expect(config.models.business_analysis.provider).toBe("openrouter")
    expect(config.models.chat.provider).toBe("openrouter")
  })
})
