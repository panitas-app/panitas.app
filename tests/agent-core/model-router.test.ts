import { describe, expect, it } from "vitest"
import { ModelRouter } from "@/lib/agent-core/model-router"
import type { ModelTaskConfig } from "@/lib/agent-core/config"

function routes(overrides: Partial<Record<string, ModelTaskConfig>> = {}): Record<string, ModelTaskConfig> {
  return {
    chat: { model: "m-chat", provider: "openrouter", temperature: 0.7, maxTokens: 1000 },
    business_analysis: { model: "m-business", provider: "openrouter", temperature: 0.2, maxTokens: 2000 },
    json: { model: "m-json", provider: "openrouter", temperature: 0, maxTokens: 2000 },
    classification: { model: "m-class", provider: "openrouter", temperature: 0, maxTokens: 300 },
    summarization: { model: "m-sum", provider: "openrouter", temperature: 0.3, maxTokens: 800 },
    reply_suggestion: { model: "m-reply", provider: "openrouter", temperature: 0.6, maxTokens: 400 },
    ...overrides,
  } as Record<string, ModelTaskConfig>
}

describe("ModelRouter", () => {
  it("resuelve la ruta exacta de cada tarea", () => {
    const router = new ModelRouter(routes())
    expect(router.resolve("business_analysis")).toMatchObject({ task: "business_analysis", model: "m-business", provider: "openrouter" })
    expect(router.resolve("json")).toMatchObject({ task: "json", model: "m-json", temperature: 0 })
  })

  it("usa chat como fallback si la tarea no está configurada", () => {
    const router = new ModelRouter(routes() as never)
    const route = router.resolve("summarization" as never)
    expect(route.model).toBe("m-sum")
  })

  it("lista todas las rutas con su tarea", () => {
    const router = new ModelRouter(routes())
    const all = router.list()
    expect(all).toHaveLength(6)
    expect(all.map((r) => r.task)).toEqual(["chat", "business_analysis", "json", "classification", "summarization", "reply_suggestion"])
  })

  it("permite cambiar el modelo de una tarea en runtime sin tocar el Core", () => {
    const router = new ModelRouter(routes())
    const updated = router.update("chat", { model: "m-premium" })
    expect(updated.model).toBe("m-premium")
    expect(router.resolve("chat").model).toBe("m-premium")
    expect(router.resolve("json").model).toBe("m-json")
  })
})
