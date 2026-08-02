import { describe, expect, it, vi, beforeEach } from "vitest"
import { ToolResolver } from "@/lib/agent-core/tool-resolver"
import { PermissionChecker } from "@/lib/agent-core/permission-checker"
import type { AgentRequest } from "@/lib/agent-core"

vi.mock("@/lib/agent/registry", () => ({
  getTool: vi.fn(),
  listTools: vi.fn(),
  executeTool: vi.fn(),
}))

vi.mock("@/lib/agent/router", () => ({
  routeAgentIntent: vi.fn(),
}))

import { getTool, listTools, executeTool } from "@/lib/agent/registry"
import { routeAgentIntent } from "@/lib/agent/router"

const request: AgentRequest = {
  userId: "u1",
  storeId: "s1",
  role: "admin",
  permissions: ["inventory.read"],
  message: "¿cuánto stock tengo de abrazadera?",
}

const checker = new PermissionChecker()

function mockTool(overrides: Record<string, unknown> = {}) {
  return {
    name: "inventory.check_stock",
    description: "Consulta stock",
    permissions: ["inventory.read"],
    input_schema: { type: "object" },
    execute: vi.fn(),
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe("ToolResolver", () => {
  it("usa request.tool si viene explícito", () => {
    const resolver = new ToolResolver()
    expect(resolver.detectIntent({ ...request, tool: "report.today" })).toBe("report.today")
    expect(routeAgentIntent).not.toHaveBeenCalled()
  })

  it("delega en el router heurístico si no hay tool explícito", () => {
    vi.mocked(routeAgentIntent).mockReturnValue("inventory.check_stock")
    const resolver = new ToolResolver()
    expect(resolver.detectIntent(request)).toBe("inventory.check_stock")
  })

  it("no ejecuta nada si no detecta intención", async () => {
    vi.mocked(routeAgentIntent).mockReturnValue(null)
    const resolver = new ToolResolver()
    const results = await resolver.resolveAndExecute(request, checker)
    expect(results).toEqual([])
    expect(executeTool).not.toHaveBeenCalled()
  })

  it("devuelve error para herramienta desconocida", async () => {
    vi.mocked(routeAgentIntent).mockReturnValue("no.existe")
    vi.mocked(getTool).mockReturnValue(undefined)
    const resolver = new ToolResolver()
    const results = await resolver.resolveAndExecute(request, checker)
    expect(results).toHaveLength(1)
    expect(results[0].ok).toBe(false)
    expect(results[0].error).toContain("no.existe")
  })

  it("bloquea si el usuario no tiene el permiso requerido", async () => {
    vi.mocked(routeAgentIntent).mockReturnValue("inventory.adjust_stock")
    vi.mocked(getTool).mockReturnValue(mockTool({ name: "inventory.adjust_stock", permissions: ["inventory.update"] }))
    const resolver = new ToolResolver()
    const results = await resolver.resolveAndExecute(request, checker)
    expect(results[0].ok).toBe(false)
    expect(results[0].error).toContain("Sin permisos")
    expect(executeTool).not.toHaveBeenCalled()
  })

  it("ejecuta la herramienta y normaliza el resultado a string", async () => {
    vi.mocked(routeAgentIntent).mockReturnValue("inventory.check_stock")
    vi.mocked(getTool).mockReturnValue(mockTool())
    vi.mocked(executeTool).mockResolvedValue({ ok: true, data: { total: 3, products: [] } })
    const resolver = new ToolResolver()
    const results = await resolver.resolveAndExecute(request, checker)
    expect(results).toHaveLength(1)
    expect(results[0].ok).toBe(true)
    expect(results[0].output).toBe(JSON.stringify({ total: 3, products: [] }))
    expect(executeTool).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "u1", storeId: "s1", plan: "business", permissions: ["inventory.read"] }),
      "inventory.check_stock",
      { q: request.message }
    )
  })

  it("lista descriptores de todas las herramientas", () => {
    vi.mocked(listTools).mockReturnValue([mockTool() as never])
    const resolver = new ToolResolver()
    const descriptors = resolver.listDescriptors()
    expect(descriptors).toEqual([
      { name: "inventory.check_stock", description: "Consulta stock", permissions: ["inventory.read"], inputSchema: { type: "object" } },
    ])
  })
})
