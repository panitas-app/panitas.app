import { describe, expect, it, vi } from "vitest"
import { AIProviderManager } from "@/lib/agent-core/providers/manager"
import { ModelRouter } from "@/lib/agent-core/model-router"
import { ProviderMetrics } from "@/lib/agent-core/metrics"
import { ProviderError } from "@/lib/agent-core/errors"
import type { LLMProvider, ProviderMessage } from "@/lib/agent-core/providers/types"
import type { AgentTaskType, ModelTaskConfig } from "@/lib/agent-core"

function makeRoutes(): Record<AgentTaskType, ModelTaskConfig> {
  return {
    chat: { model: "m-chat", provider: "fake", temperature: 0.7, maxTokens: 1000 },
    json: { model: "m-json", provider: "fake", temperature: 0, maxTokens: 2000 },
    business_analysis: { model: "m-biz", provider: "fake", temperature: 0.2, maxTokens: 2000 },
    classification: { model: "m-class", provider: "fake", temperature: 0, maxTokens: 300 },
    summarization: { model: "m-sum", provider: "fake", temperature: 0.3, maxTokens: 800 },
    reply_suggestion: { model: "m-reply", provider: "fake", temperature: 0.6, maxTokens: 400 },
  }
}

function makeProvider(overrides: Partial<LLMProvider> = {}): LLMProvider {
  return {
    id: "fake",
    chat: vi.fn(async (messages: ProviderMessage[]) => ({ provider: "fake", model: "m-chat", content: `resp ${messages[0]?.content}` })),
    complete: vi.fn(async () => ({ provider: "fake", model: "m-chat", content: "ok" })),
    generateStructuredOutput: vi.fn(async () => ({ ok: true })),
    ...overrides,
  }
}

function makeManager(provider: LLMProvider, metrics?: ProviderMetrics) {
  const router = new ModelRouter(makeRoutes() as never)
  const manager = new AIProviderManager({
    providers: { fake: provider },
    router,
    metrics,
    defaults: { timeoutMs: 5000, retries: 2 },
    logger: vi.fn(),
  })
  return { manager, router, provider }
}

describe("AIProviderManager", () => {
  it("chat resuelve modelo por tarea y delega en el proveedor", async () => {
    const { manager, provider } = makeManager(makeProvider())
    const result = await manager.chat([{ role: "user", content: "hola" }], "chat")
    expect(result.content).toBe("resp hola")
    expect(provider.chat).toHaveBeenCalledWith([{ role: "user", content: "hola" }], expect.objectContaining({ model: "m-chat" }))
  })

  it("registra métricas de éxito con proveedor/modelo/tarea", async () => {
    const metrics = new ProviderMetrics()
    const { manager } = makeManager(makeProvider(), metrics)
    await manager.complete("hola", "chat")
    const summary = metrics.summary()
    expect(summary.total).toBe(1)
    expect(summary.success).toBe(1)
    expect(summary.byModel["m-chat"]).toBe(1)
    expect(summary.byTask.chat).toBe(1)
    expect(metrics.snapshot()[0].attempts).toBe(1)
  })

  it("reintenta errores reintentables y registra attempts", async () => {
    const flaky = makeProvider({
      chat: vi.fn()
        .mockRejectedValueOnce(new ProviderError("timeout", "timeout"))
        .mockRejectedValueOnce(new ProviderError("timeout", "timeout"))
        .mockResolvedValueOnce({ provider: "fake", model: "m-chat", content: "ok tras reintentos" }),
    })
    const { manager } = makeManager(flaky)
    const result = await manager.chat([{ role: "user", content: "x" }], "chat", { retries: 2 })
    expect(result.content).toBe("ok tras reintentos")
    expect(flaky.chat).toHaveBeenCalledTimes(3)
    const metrics = manager.getMetrics().snapshot()
    expect(metrics[0].attempts).toBe(3)
    expect(metrics[0].status).toBe("success")
  })

  it("no reintenta errores no reintentables", async () => {
    const bad = makeProvider({
      chat: vi.fn().mockRejectedValue(new ProviderError("invalid_response", "json malo")),
    })
    const { manager } = makeManager(bad)
    await expect(manager.chat([{ role: "user", content: "x" }], "chat", { retries: 3 })).rejects.toThrow("json malo")
    expect(bad.chat).toHaveBeenCalledTimes(1)
    const metrics = manager.getMetrics().snapshot()
    expect(metrics[0].status).toBe("error")
    expect(metrics[0].attempts).toBe(1)
  })

  it("no reintenta si la señal del caller fue abortada", async () => {
    const flaky = makeProvider({
      chat: vi.fn().mockRejectedValue(new ProviderError("timeout", "timeout")),
    })
    const { manager } = makeManager(flaky)
    const controller = new AbortController()
    controller.abort()
    await expect(manager.chat([{ role: "user", content: "x" }], "chat", { retries: 2, signal: controller.signal })).rejects.toBeInstanceOf(ProviderError)
    expect(flaky.chat).toHaveBeenCalledTimes(1)
  })

  it("generateStructuredOutput delega con el modelo de la tarea json", async () => {
    const { manager, provider } = makeManager(makeProvider())
    await manager.generateStructuredOutput("extrae", { name: "t", jsonSchema: {} }, "json")
    expect(provider.generateStructuredOutput).toHaveBeenCalledWith(
      "extrae",
      { name: "t", jsonSchema: {} },
      expect.objectContaining({ model: "m-json", temperature: 0 })
    )
  })

  it("lanza si el proveedor no está registrado", async () => {
    const router = new ModelRouter(makeRoutes() as never)
    const manager = new AIProviderManager({ providers: {}, router, logger: vi.fn() })
    await expect(manager.chat([{ role: "user", content: "x" }], "chat")).rejects.toThrow("no registrado")
  })
})
