import { describe, expect, it } from "vitest"
import { ToolRegistry } from "@/lib/agent/tools/registry"
import type { AgentTool, ToolDomain } from "@/lib/agent/tools/types"

function makeTool(name: string, domain: ToolDomain = "inventory", requiredPermissions: string[] = []): AgentTool {
  return {
    name,
    domain,
    description: `Tool ${name}`,
    requiredPermissions: requiredPermissions as AgentTool["requiredPermissions"],
    inputSchema: { type: "object", properties: {} },
    execute: async () => ({ success: true, data: { done: true }, error: null, metadata: {} }),
  }
}

describe("ToolRegistry", () => {
  it("registers, gets and lists tools in order", () => {
    const registry = new ToolRegistry()
    registry.register(makeTool("a.one")).register(makeTool("b.two"))
    expect(registry.size).toBe(2)
    expect(registry.get("a.one")).toBeDefined()
    expect(registry.has("b.two")).toBe(true)
    expect(registry.has("nope")).toBe(false)
    expect(registry.list().map((t) => t.name)).toEqual(["a.one", "b.two"])
  })

  it("throws on duplicate tool names", () => {
    const registry = new ToolRegistry()
    registry.register(makeTool("dup.x"))
    expect(() => registry.register(makeTool("dup.x"))).toThrow(/ya registrada/)
  })

  it("throws when registering a tool without name", () => {
    const registry = new ToolRegistry()
    const tool = makeTool("ok.x")
    ;(tool as { name: string }).name = ""
    expect(() => registry.register(tool)).toThrow(/nombre/)
  })

  it("lists tools by domain and exposes safe metadata", () => {
    const registry = new ToolRegistry()
    registry.registerAll([makeTool("inventory.a", "inventory"), makeTool("sales.a", "sales")])
    expect(registry.listByDomain("inventory").map((t) => t.name)).toEqual(["inventory.a"])
    const metadata = registry.metadata()
    expect(metadata).toHaveLength(2)
    expect(metadata[0]).toEqual(
      expect.objectContaining({ name: "inventory.a", domain: "inventory" })
    )
    expect(metadata[0]).not.toHaveProperty("execute")
  })

  it("registerAll registers every tool", () => {
    const registry = new ToolRegistry()
    registry.registerAll([makeTool("x.1"), makeTool("x.2"), makeTool("x.3")])
    expect(registry.size).toBe(3)
  })

  it("clear empties the registry", () => {
    const registry = new ToolRegistry()
    registry.register(makeTool("x.1"))
    registry.clear()
    expect(registry.size).toBe(0)
  })
})
