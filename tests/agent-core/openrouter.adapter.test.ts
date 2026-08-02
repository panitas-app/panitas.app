import { describe, expect, it, vi, afterEach } from "vitest"
import { OpenRouterProvider } from "@/lib/agent-core/providers/openrouter"
import { ProviderHttpError, ProviderInvalidResponseError, ProviderMissingKeyError, ProviderNetworkError, ProviderTimeoutError } from "@/lib/agent-core/errors"

const CONFIG = {
  apiKey: "sk-test",
  baseUrl: "https://openrouter.ai/api/v1",
  appTitle: "Panitas",
  httpReferer: "https://panitas.app",
  defaultModel: "modelo-free",
}

function mockFetch(impl: (url: string, init?: RequestInit) => Promise<Response>) {
  vi.stubGlobal("fetch", vi.fn(impl))
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe("OpenRouterProvider", () => {
  it("chat envía payload correcto y normaliza la respuesta", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          model: "modelo-free",
          choices: [{ message: { content: "Hola" } }],
          usage: { prompt_tokens: 5, completion_tokens: 3, total_tokens: 8 },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    )
    mockFetch(fetchMock as never)

    const provider = new OpenRouterProvider(CONFIG)
    const result = await provider.chat([{ role: "user", content: "hola" }], { temperature: 0.7, maxTokens: 100 })

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe("https://openrouter.ai/api/v1/chat/completions")
    const body = JSON.parse(init!.body as string)
    expect(body.model).toBe("modelo-free")
    expect(body.temperature).toBe(0.7)
    expect(body.max_tokens).toBe(100)
    expect(result).toEqual({
      provider: "openrouter",
      model: "modelo-free",
      content: "Hola",
      usage: { promptTokens: 5, completionTokens: 3, totalTokens: 8 },
    })
    expect(init!.headers).toMatchObject({ Authorization: "Bearer sk-test" })
  })

  it("lanza missing_key si no hay API key (no hace fetch)", async () => {
    const fetchMock = vi.fn()
    mockFetch(fetchMock as never)
    const provider = new OpenRouterProvider({ ...CONFIG, apiKey: "" })
    await expect(provider.complete("hola")).rejects.toBeInstanceOf(ProviderMissingKeyError)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("mapea errores HTTP a ProviderHttpError con estado", async () => {
    mockFetch(async () => new Response("rate limited", { status: 429 }))
    const provider = new OpenRouterProvider(CONFIG)
    const err = await provider.complete("hola").catch((e) => e)
    expect(err).toBeInstanceOf(ProviderHttpError)
    expect(err.status).toBe(429)
    expect(err.kind).toBe("http")
  })

  it("mapea fallos de red a ProviderNetworkError", async () => {
    mockFetch(async () => {
      throw new TypeError("fetch failed")
    })
    const provider = new OpenRouterProvider(CONFIG)
    const err = await provider.complete("hola").catch((e) => e)
    expect(err).toBeInstanceOf(ProviderNetworkError)
    expect(err.kind).toBe("network")
  })

  it("mapea abort de señal a ProviderTimeoutError", async () => {
    mockFetch((_url, init) => {
      if (init?.signal?.aborted) return Promise.reject(new DOMException("aborted", "AbortError"))
      return new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")))
      })
    })
    const provider = new OpenRouterProvider(CONFIG)
    const controller = new AbortController()
    controller.abort()
    const err = await provider.chat([{ role: "user", content: "x" }], { signal: controller.signal }).catch((e) => e)
    expect(err).toBeInstanceOf(ProviderTimeoutError)
    expect(err.kind).toBe("timeout")
  })

  it("lanza invalid_response si no hay contenido", async () => {
    mockFetch(async () => new Response(JSON.stringify({ choices: [{ message: {} }] }), { status: 200 }))
    const provider = new OpenRouterProvider(CONFIG)
    const err = await provider.complete("hola").catch((e) => e)
    expect(err).toBeInstanceOf(ProviderInvalidResponseError)
  })

  it("generateStructuredOutput devuelve JSON parseado (limpia markdown)", async () => {
    mockFetch(async () =>
      new Response(
        JSON.stringify({ model: "modelo-free", choices: [{ message: { content: "```json\n{\"ok\":true}\n```" } }] }),
        { status: 200 }
      )
    )
    const provider = new OpenRouterProvider(CONFIG)
    const result = await provider.generateStructuredOutput<{ ok: boolean }>("algo", {
      name: "test",
      jsonSchema: { type: "object", properties: { ok: { type: "boolean" } } },
    })
    expect(result).toEqual({ ok: true })
  })

  it("generateStructuredOutput lanza invalid_response si el JSON es inválido", async () => {
    mockFetch(async () =>
      new Response(JSON.stringify({ model: "m", choices: [{ message: { content: "no es json" } }] }), { status: 200 })
    )
    const provider = new OpenRouterProvider(CONFIG)
    const err = await provider.generateStructuredOutput("x", { name: "t", jsonSchema: {} }).catch((e) => e)
    expect(err).toBeInstanceOf(ProviderInvalidResponseError)
  })
})
