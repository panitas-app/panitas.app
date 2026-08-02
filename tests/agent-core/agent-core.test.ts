import { describe, expect, it, vi, beforeEach } from "vitest"
import { PanitasAgent } from "@/lib/agent-core/agent-core"
import { RequestPipeline } from "@/lib/agent-core/pipeline"
import { ContextBuilder } from "@/lib/agent-core/context-builder"
import { PermissionChecker } from "@/lib/agent-core/permission-checker"
import { ToolResolver } from "@/lib/agent-core/tool-resolver"
import { ResponseFormatter } from "@/lib/agent-core/response-formatter"
import { SessionManager } from "@/lib/agent-core/session-manager"
import { ProviderMetrics } from "@/lib/agent-core/metrics"
import { NoopAuditLogger } from "@/lib/agent-core/audit-logger"
import { ModelRouter } from "@/lib/agent-core/model-router"
import type { AIProvider } from "@/lib/agent-core/providers/types"
import type { AgentRequest, AgentTaskType, ModelTaskConfig } from "@/lib/agent-core"

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
  chat = vi.fn(async () => ({ provider: "fake", model: "m-chat", content: "resp" }))
  complete = vi.fn(async () => ({ provider: "fake", model: "m-chat", content: "ok" }))
  generateStructuredOutput = vi.fn(async (input: string) => ({ input, parsed: true }))
}

function makeRoutes(): Record<AgentTaskType, ModelTaskConfig> {
  const base = (model: string): ModelTaskConfig => ({ model, provider: "fake", temperature: 0, maxTokens: 500 })
  return {
    chat: { model: "m-chat", provider: "fake", temperature: 0.7, maxTokens: 1000 },
    json: { model: "m-json", provider: "fake", temperature: 0, maxTokens: 2000 },
    business_analysis: base("m-biz"),
    classification: base("m-class"),
    summarization: base("m-sum"),
    reply_suggestion: base("m-reply"),
  }
}

function makeAgent(provider = new FakeProvider()) {
  const agent = new PanitasAgent({
    pipeline: new RequestPipeline({
      contextBuilder: new ContextBuilder(),
      permissionChecker: new PermissionChecker(),
      toolResolver: new ToolResolver(),
      provider,
      formatter: new ResponseFormatter(),
    }),
    sessions: new SessionManager(),
    metrics: new ProviderMetrics(),
    audit: new NoopAuditLogger(),
    formatter: new ResponseFormatter(),
    router: new ModelRouter(makeRoutes()),
    provider,
    contextBuilder: new ContextBuilder(),
    permissionChecker: new PermissionChecker(),
  })
  return agent
}

const request: AgentRequest = {
  userId: "u1",
  storeId: "s1",
  role: "admin",
  permissions: ["inventory.read"],
  message: "¿cuánto stock tengo?",
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe("PanitasAgent", () => {
  it("handle procesa, persiste mensajes en sesión y audita", async () => {
    vi.mocked(routeAgentIntent).mockReturnValue(null)
    const agent = makeAgent()
    const response = await agent.handle(request)

    expect(response.ok).toBe(true)
    expect(response.reply).toBe("resp")

    const session = await agent.getSession(response.sessionId)
    expect(session).not.toBeNull()
    expect(session!.messages).toHaveLength(2)
    expect(session!.messages[0].role).toBe("user")
    expect(session!.messages[1].role).toBe("assistant")
    expect(session!.messages[1].content).toBe("resp")
  })

  it("reutiliza la sesión del request entre llamadas", async () => {
    vi.mocked(routeAgentIntent).mockReturnValue(null)
    const agent = makeAgent()
    const first = await agent.handle(request)
    const second = await agent.handle({ ...request, sessionId: first.sessionId })
    expect(second.sessionId).toBe(first.sessionId)
    const session = await agent.getSession(first.sessionId)
    expect(session!.messages).toHaveLength(4)
  })

  it("ejecuta herramientas y las expone en la respuesta", async () => {
    vi.mocked(routeAgentIntent).mockReturnValue("inventory.check_stock")
    vi.mocked(getTool).mockReturnValue({ name: "inventory.check_stock", description: "S", permissions: ["inventory.read"], execute: vi.fn() })
    vi.mocked(executeTool).mockResolvedValue({ ok: true, data: { total: 3 } })
    const agent = makeAgent()
    const response = await agent.handle(request)
    expect(response.toolCalls).toHaveLength(1)
    expect(response.toolCalls[0].name).toBe("inventory.check_stock")
  })

  it("generateStructuredOutput devuelve salida estructurada", async () => {
    const agent = makeAgent()
    const response = await agent.generateStructuredOutput(request, { name: "stock_summary", jsonSchema: {} }, "json")
    expect(response.ok).toBe(true)
    expect(response.structured).toEqual({ input: "¿cuánto stock tengo?", parsed: true })
  })

  it("generateStructuredOutput reutiliza la última sesión activa", async () => {
    const agent = makeAgent()
    const a = await agent.handle(request)
    const b = await agent.generateStructuredOutput({ ...request, sessionId: a.sessionId }, { name: "s", jsonSchema: {} }, "json")
    expect(b.sessionId).toBe(a.sessionId)
  })

  it("listSessions agrupa por usuario", async () => {
    vi.mocked(routeAgentIntent).mockReturnValue(null)
    const agent = makeAgent()
    await agent.handle(request)
    await agent.handle({ ...request, message: "segunda" })
    await agent.handle({ ...request, userId: "u2", message: "otro usuario" })
    expect(await agent.listSessions("u1")).toHaveLength(2)
    expect(await agent.listSessions("u2")).toHaveLength(1)
  })
})
