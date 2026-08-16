import { describe, expect, it, vi, afterEach } from "vitest"
import { OpenAICompatibleProvider } from "@/lib/agent-core/providers/openai-compatible"
import { ProviderInvalidResponseError } from "@/lib/agent-core/errors"

const CONFIG = {
  id: "nvidia",
  apiKey: "sk-test",
  baseUrl: "https://integrate.api.nvidia.com/v1",
  defaultModel: "modelo-free",
  displayName: "NVIDIA",
  envKeyName: "NVIDIA_API_KEY",
}

function mockFetch(impl: (url: string, init?: RequestInit) => Promise<Response>) {
  vi.stubGlobal("fetch", vi.fn(impl))
}

function jsonResponse(payload: unknown): Response {
  return new Response(JSON.stringify(payload), { status: 200, headers: { "Content-Type": "application/json" } })
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe("Provider tool calling (OpenAI-compatible)", () => {
  it("serializa tool_calls del assistant y tool results al wire", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ model: "m", choices: [{ message: { content: "ok" } }] }))
    mockFetch(fetchMock as never)
    const provider = new OpenAICompatibleProvider(CONFIG)

    await provider.chat(
      [
        { role: "user", content: "registra la venta" },
        {
          role: "assistant",
          content: "",
          toolCalls: [{ id: "call_1", name: "sales.create", arguments: '{"items":[]}' }],
        },
        { role: "tool", content: '{"ok":true}', toolCallId: "call_1" },
      ],
      {}
    )

    const [, init] = fetchMock.mock.calls[0]
    const body = JSON.parse(init!.body as string)
    expect(body.messages).toHaveLength(3)
    expect(body.messages[1]).toEqual({
      role: "assistant",
      content: "",
      tool_calls: [{ id: "call_1", type: "function", function: { name: "sales.create", arguments: '{"items":[]}' } }],
    })
    expect(body.messages[2]).toEqual({ role: "tool", content: '{"ok":true}', tool_call_id: "call_1" })
  })

  it("envía tools y tool_choice en el cuerpo de la request", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ model: "m", choices: [{ message: { content: "ok" } }] }))
    mockFetch(fetchMock as never)
    const provider = new OpenAICompatibleProvider(CONFIG)

    await provider.chat([{ role: "user", content: "hola" }], {
      tools: [
        {
          type: "function",
          function: { name: "sales.create", description: "Crea venta", parameters: { type: "object", properties: {} } },
        },
      ],
      toolChoice: "required",
    })

    const [, init] = fetchMock.mock.calls[0]
    const body = JSON.parse(init!.body as string)
    expect(body.tools).toEqual([
      {
        type: "function",
        function: { name: "sales.create", description: "Crea venta", parameters: { type: "object", properties: {} } },
      },
    ])
    expect(body.tool_choice).toBe("required")
  })

  it("parsea tool_calls del modelo y permite content vacío con toolCalls", async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({
        model: "modelo-free",
        choices: [
          {
            message: {
              content: null,
              tool_calls: [
                { id: "call_9", type: "function", function: { name: "inventory.getStock", arguments: '{"productId":"p1"}' } },
              ],
            },
          },
        ],
        usage: { prompt_tokens: 5, completion_tokens: 3, total_tokens: 8 },
      })
    )
    mockFetch(fetchMock as never)
    const provider = new OpenAICompatibleProvider(CONFIG)

    const result = await provider.chat([{ role: "user", content: "stock de p1" }], {})

    expect(result.toolCalls).toEqual([{ id: "call_9", name: "inventory.getStock", arguments: '{"productId":"p1"}' }])
    expect(result.content).toBe("")
    expect(result.usage).toEqual({ promptTokens: 5, completionTokens: 3, totalTokens: 8 })
  })

  it("descarta tool_calls sin nombre de función y exige contenido si no hay llamadas", async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({ model: "m", choices: [{ message: { content: null, tool_calls: [{ id: "x" }] } }] })
    )
    mockFetch(fetchMock as never)
    const provider = new OpenAICompatibleProvider(CONFIG)

    const err = await provider.chat([{ role: "user", content: "hola" }], {}).catch((e) => e)
    expect(err).toBeInstanceOf(ProviderInvalidResponseError)
  })

  it("lanza invalid_response si no hay contenido ni tool_calls", async () => {
    mockFetch(async () => jsonResponse({ model: "m", choices: [{ message: {} }] }))
    const provider = new OpenAICompatibleProvider(CONFIG)
    const err = await provider.chat([{ role: "user", content: "hola" }], {}).catch((e) => e)
    expect(err).toBeInstanceOf(ProviderInvalidResponseError)
  })

  it("devuelve contenido normal cuando no hay tool_calls", async () => {
    mockFetch(async () => jsonResponse({ model: "m", choices: [{ message: { content: "Hola mundo" } }] }))
    const provider = new OpenAICompatibleProvider(CONFIG)
    const result = await provider.chat([{ role: "user", content: "hola" }], {})
    expect(result.content).toBe("Hola mundo")
    expect(result.toolCalls).toBeUndefined()
  })
})
