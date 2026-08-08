import { describe, expect, it, vi, afterEach } from "vitest"
import { NvidiaNimProvider } from "@/lib/agent-core/providers/nvidia"
import { ProviderHttpError, ProviderInvalidResponseError, ProviderMissingKeyError, ProviderNetworkError, ProviderTimeoutError } from "@/lib/agent-core/errors"

const CONFIG = {
  apiKey: "nvapi-test",
  baseUrl: "https://integrate.api.nvidia.com/v1",
  defaultModel: "nvidia/nemotron-3-ultra-550b-a55b",
}

function mockFetch(impl: (url: string, init?: RequestInit) => Promise<Response>) {
  vi.stubGlobal("fetch", vi.fn(impl))
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe("NvidiaNimProvider", () => {
  it("chat envía payload correcto y normaliza la respuesta", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          model: "nvidia/nemotron-3-ultra-550b-a55b",
          choices: [{ message: { content: "Hola" } }],
          usage: { prompt_tokens: 5, completion_tokens: 3, total_tokens: 8 },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    )
    mockFetch(fetchMock as never)

    const provider = new NvidiaNimProvider(CONFIG)
    const result = await provider.chat([{ role: "user", content: "hola" }], { temperature: 0.7, maxTokens: 100 })

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe("https://integrate.api.nvidia.com/v1/chat/completions")
    const body = JSON.parse(init!.body as string)
    expect(body.model).toBe("nvidia/nemotron-3-ultra-550b-a55b")
    expect(body.temperature).toBe(0.7)
    expect(body.max_tokens).toBe(100)
    expect(body.stream).toBe(false)
    expect(result).toEqual({
      provider: "nvidia",
      model: "nvidia/nemotron-3-ultra-550b-a55b",
      content: "Hola",
      usage: { promptTokens: 5, completionTokens: 3, totalTokens: 8 },
    })
    expect(init!.headers).toMatchObject({ Authorization: "Bearer nvapi-test" })
    expect(init!.headers).not.toHaveProperty("HTTP-Referer")
  })

  it("lanza missing_key si no hay API key (no hace fetch)", async () => {
    const fetchMock = vi.fn()
    mockFetch(fetchMock as never)
    const provider = new NvidiaNimProvider({ ...CONFIG, apiKey: "" })
    await expect(provider.complete("hola")).rejects.toBeInstanceOf(ProviderMissingKeyError)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("mapea errores HTTP a ProviderHttpError con estado", async () => {
    mockFetch(async () => new Response("gone", { status: 410 }))
    const provider = new NvidiaNimProvider(CONFIG)
    const err = await provider.complete("hola").catch((e) => e)
    expect(err).toBeInstanceOf(ProviderHttpError)
    expect(err.status).toBe(410)
    expect(err.kind).toBe("http")
  })

  it("mapea fallos de red a ProviderNetworkError", async () => {
    mockFetch(async () => {
      throw new TypeError("fetch failed")
    })
    const provider = new NvidiaNimProvider(CONFIG)
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
    const provider = new NvidiaNimProvider(CONFIG)
    const controller = new AbortController()
    controller.abort()
    const err = await provider.chat([{ role: "user", content: "x" }], { signal: controller.signal }).catch((e) => e)
    expect(err).toBeInstanceOf(ProviderTimeoutError)
    expect(err.kind).toBe("timeout")
  })

  it("lanza invalid_response si no hay contenido", async () => {
    mockFetch(async () => new Response(JSON.stringify({ choices: [{ message: {} }] }), { status: 200 }))
    const provider = new NvidiaNimProvider(CONFIG)
    const err = await provider.complete("hola").catch((e) => e)
    expect(err).toBeInstanceOf(ProviderInvalidResponseError)
  })

  it("generateStructuredOutput devuelve JSON parseado (limpia markdown)", async () => {
    mockFetch(async () =>
      new Response(
        JSON.stringify({ model: "m", choices: [{ message: { content: "```json\n{\"ok\":true}\n```" } }] }),
        { status: 200 }
      )
    )
    const provider = new NvidiaNimProvider(CONFIG)
    const result = await provider.generateStructuredOutput<{ ok: boolean }>("algo", {
      name: "test",
      jsonSchema: { type: "object", properties: { ok: { type: "boolean" } } },
    })
    expect(result).toEqual({ ok: true })
  })
})
