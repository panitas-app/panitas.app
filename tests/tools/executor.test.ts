import { describe, expect, it, vi, beforeEach } from "vitest"
import { ToolRegistry } from "@/lib/agent/tools/registry"
import { ToolExecutor } from "@/lib/agent/tools/executor"
import { NoopToolLogger, type ToolLogger } from "@/lib/agent/tools/logging"
import type { AgentTool, ToolExecutionContext, ToolLogEntry } from "@/lib/agent/tools/types"

function makeTool(name: string, requiredPermissions: string[] = [], execute?: AgentTool["execute"]): AgentTool {
  return {
    name,
    domain: "inventory",
    description: `Tool ${name}`,
    requiredPermissions: requiredPermissions as AgentTool["requiredPermissions"],
    inputSchema: { type: "object", properties: {} },
    execute:
      execute ??
      (async () => ({ success: true, data: { ok: 1 }, error: null, metadata: {} })),
  }
}

function makeCtx(overrides: Partial<ToolExecutionContext> = {}): ToolExecutionContext {
  return {
    userId: "u1",
    storeId: "s1",
    negocioId: null,
    plan: "free",
    role: "admin",
    permissions: ["inventory.read"],
    ...overrides,
  }
}

class SpyLogger implements ToolLogger {
  entries: ToolLogEntry[] = []
  log(entry: ToolLogEntry): void {
    this.entries.push(entry)
  }
}

describe("ToolExecutor", () => {
  let registry: ToolRegistry
  let logger: SpyLogger
  let executor: ToolExecutor

  beforeEach(() => {
    registry = new ToolRegistry()
    logger = new SpyLogger()
    executor = new ToolExecutor({ registry, logger })
  })

  it("returns a standardized success response", async () => {
    registry.register(makeTool("test.one"))
    const response = await executor.execute(makeCtx(), "test.one", {})
    expect(response).toEqual(
      expect.objectContaining({
        success: true,
        data: { ok: 1 },
        error: null,
      })
    )
    expect(response.metadata).toMatchObject({ tool: "test.one" })
    expect(typeof response.metadata.durationMs).toBe("number")
  })

  it("fails for an unknown tool without executing", async () => {
    const response = await executor.execute(makeCtx(), "no.existe")
    expect(response.success).toBe(false)
    expect(response.error).toContain("Herramienta desconocida")
    expect(registry.get("no.existe")).toBeUndefined()
  })

  it("fails when the context has no store (aislamiento de negocio)", async () => {
    registry.register(makeTool("test.store"))
    const response = await executor.execute(makeCtx({ storeId: "" }), "test.store")
    expect(response.success).toBe(false)
    expect(response.error).toContain("sin negocio")
  })

  it("rejects a tool the user has no permission for", async () => {
    registry.register(makeTool("test.secret", ["sales.refund"]))
    const response = await executor.execute(makeCtx(), "test.secret")
    expect(response.success).toBe(false)
    expect(response.error).toContain("Sin permisos")
    expect(response.metadata.required).toEqual(["sales.refund"])
  })

  it("allows a tool when the user holds any required permission", async () => {
    registry.register(makeTool("test.any", ["order.update", "inventory.read"]))
    const response = await executor.execute(makeCtx(), "test.any")
    expect(response.success).toBe(true)
  })

  it("validates required input before executing", async () => {
    const spy = vi.fn(async () => ({ success: true, data: null, error: null, metadata: {} }))
    registry.register({
      ...makeTool("test.validate", [], spy),
      inputSchema: {
        type: "object",
        properties: { id: { type: "string", required: true } },
      },
    })
    const response = await executor.execute(makeCtx(), "test.validate", {})
    expect(response.success).toBe(false)
    expect(response.error).toContain("id")
    expect(spy).not.toHaveBeenCalled()
  })

  it("accepts valid input per the schema", async () => {
    const spy = vi.fn(async () => ({ success: true, data: null, error: null, metadata: {} }))
    registry.register({
      ...makeTool("test.valid", [], spy),
      inputSchema: {
        type: "object",
        properties: { id: { type: "string", required: true }, take: { type: "number" } },
      },
    })
    const response = await executor.execute(makeCtx(), "test.valid", { id: "p1", take: 5 })
    expect(response.success).toBe(true)
    expect(spy).toHaveBeenCalledWith(expect.anything(), { id: "p1", take: 5 })
  })

  it("catches tool errors and returns them as toolFail (never throws)", async () => {
    registry.register(
      makeTool("test.throw", [], async () => {
        throw new Error("boom interno")
      })
    )
    const response = await executor.execute(makeCtx(), "test.throw")
    expect(response.success).toBe(false)
    expect(response.error).toBe("boom interno")
    expect(response.data).toBeNull()
  })

  it("honors a custom permission guard", async () => {
    const guard = vi.fn(() => false)
    executor = new ToolExecutor({ registry, logger, permissionGuard: guard })
    registry.register(makeTool("test.guard", ["inventory.read"]))
    const response = await executor.execute(makeCtx(), "test.guard")
    expect(response.success).toBe(false)
    expect(guard).toHaveBeenCalled()
  })

  it("logs called, success and failed events", async () => {
    registry.register(makeTool("test.logged"))
    await executor.execute(makeCtx(), "test.logged")
    const events = logger.entries.map((e) => e.event)
    expect(events).toContain("tool.called")
    expect(events).toContain("tool.success")
    const success = logger.entries.find((e) => e.event === "tool.success")!
    expect(success).toMatchObject({ userId: "u1", storeId: "s1", tool: "test.logged", result: "success" })
  })

  it("logs failures with the tool name", async () => {
    await executor.execute(makeCtx(), "missing.tool")
    expect(logger.entries.some((e) => e.event === "tool.failed" && e.error)).toBe(true)
  })

  it("defaults to a no-op-free audit logger without crashing", async () => {
    const plain = new ToolExecutor({ registry, logger: new NoopToolLogger() })
    registry.register(makeTool("test.noop"))
    const response = await plain.execute(makeCtx(), "test.noop")
    expect(response.success).toBe(true)
  })
})
