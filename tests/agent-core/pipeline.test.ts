import { describe, expect, it, vi, beforeEach } from "vitest"
import { RequestPipeline } from "@/lib/agent-core/pipeline"
import { ContextBuilder } from "@/lib/agent-core/context-builder"
import { PermissionChecker } from "@/lib/agent-core/permission-checker"
import { ToolResolver } from "@/lib/agent-core/tool-resolver"
import { ResponseFormatter } from "@/lib/agent-core/response-formatter"
import type { AIProvider } from "@/lib/agent-core/providers/types"
import type { AgentRequest, AgentSession } from "@/lib/agent-core"

vi.mock("@/lib/agent/registry", () => ({
  getTool: vi.fn(),
  listTools: vi.fn(),
  executeTool: vi.fn(),
}))

vi.mock("@/lib/agent/router", () => ({
  routeAgentIntent: vi.fn(),
}))

import { getTool, executeTool } from "@/lib/agent/registry"
import { routeAgentIntent } from "@/lib/agent/router"

class FakeProvider implements AIProvider {
  chat = vi.fn(async () => ({ provider: "fake", model: "m-chat", content: "resp del asistente" }))
  complete = vi.fn(async () => ({ provider: "fake", model: "m-chat", content: "ok" }))
  generateStructuredOutput = vi.fn(async () => ({ parsed: true }))
}

const request: AgentRequest = {
  userId: "u1",
  storeId: "s1",
  role: "admin",
  permissions: ["inventory.read"],
  message: "¿cuánto stock tengo?",
}

const session: AgentSession = {
  id: "sess-1",
  userId: "u1",
  storeId: "s1",
  plan: "business",
  status: "active",
  messages: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

function makePipeline(provider = new FakeProvider()) {
  const pipeline = new RequestPipeline({
    contextBuilder: new ContextBuilder(),
    permissionChecker: new PermissionChecker(),
    toolResolver: new ToolResolver(),
    provider,
    formatter: new ResponseFormatter(),
  })
  return pipeline
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe("RequestPipeline", () => {
  it("ejecuta el flujo completo y devuelve respuesta normalizada con tool results", async () => {
    vi.mocked(routeAgentIntent).mockReturnValue("inventory.check_stock")
    vi.mocked(getTool).mockReturnValue({
      name: "inventory.check_stock",
      description: "Stock",
      permissions: ["inventory.read"],
      execute: vi.fn(),
    })
    vi.mocked(executeTool).mockResolvedValue({ ok: true, data: { total: 3 } })

    const provider = new FakeProvider()
    const response = await makePipeline(provider).run(request, session)

    expect(response.ok).toBe(true)
    expect(response.reply).toBe("resp del asistente")
    expect(response.taskType).toBe("chat")
    expect(response.toolCalls).toHaveLength(1)
    expect(response.toolCalls[0].name).toBe("inventory.check_stock")
    expect(response.toolCalls[0].ok).toBe(true)
    expect(provider.chat).toHaveBeenCalledTimes(1)
  })

  it("pasa el contexto enriquecido al proveedor cuando hay tool results", async () => {
    vi.mocked(routeAgentIntent).mockReturnValue("inventory.check_stock")
    vi.mocked(getTool).mockReturnValue({ name: "inventory.check_stock", description: "S", permissions: ["inventory.read"], execute: vi.fn() })
    vi.mocked(executeTool).mockResolvedValue({ ok: true, data: { total: 5 } })

    const provider = new FakeProvider()
    await makePipeline(provider).run(request, session)
    const [messages] = provider.chat.mock.calls[0]
    const system = messages.find((m: { role: string }) => m.role === "system")
    expect(system?.content).toContain("inventory.check_stock")
    expect(system?.content).toContain('"total":5')
  })

  it("deniega acceso a nivel de request sin llamar al proveedor", async () => {
    const pipeline = new RequestPipeline({
      contextBuilder: new ContextBuilder(),
      permissionChecker: new PermissionChecker({ assistantPermission: "report.read" }),
      toolResolver: new ToolResolver(),
      provider: new FakeProvider(),
      formatter: new ResponseFormatter(),
    })
    const response = await pipeline.run({ ...request, permissions: ["inventory.read"] }, session)
    expect(response.ok).toBe(false)
    expect(response.error).toContain("report.read")
  })

  it("normaliza errores del proveedor sin lanzar", async () => {
    vi.mocked(routeAgentIntent).mockReturnValue(null)
    const provider = new FakeProvider()
    provider.chat.mockRejectedValue(new Error("rate limited"))
    const response = await makePipeline(provider).run(request, session)
    expect(response.ok).toBe(false)
    expect(response.error).toBe("rate limited")
    expect(response.toolCalls).toEqual([])
  })

  it("sin intención, el contexto va sin tool results", async () => {
    vi.mocked(routeAgentIntent).mockReturnValue(null)
    const provider = new FakeProvider()
    await makePipeline(provider).run(request, session)
    const [messages] = provider.chat.mock.calls[0]
    expect(messages.some((m: { role: string }) => m.role === "tool")).toBe(false)
  })
})
