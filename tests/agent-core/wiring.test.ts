import { describe, expect, it, vi } from "vitest"
import { buildToolRegistry, toolRegistry } from "@/lib/agent/tools/setup"
import { toLegacyAgentTool } from "@/lib/agent/tools/bridge"
import type { AgentTool } from "@/lib/agent/tools/types"
import type { AgentContext } from "@/lib/agent/types"

function makeTool(name: string, overrides: Record<string, unknown> = {}): AgentTool {
  return {
    name,
    domain: "inventory",
    description: `Tool ${name}`,
    requiredPermissions: ["inventory.read"] as AgentTool["requiredPermissions"],
    inputSchema: { type: "object", properties: {} },
    execute: async () => ({ success: true, data: { ok: true }, error: null, metadata: {} }),
    ...overrides,
  } as AgentTool
}

describe("Cableado tools 3B -> agente 3A (gap documentado)", () => {
  it("buildToolRegistry registra tools de todos los dominios", () => {
    const registry = buildToolRegistry()
    expect(registry.size).toBeGreaterThan(0)
    const domains = new Set(registry.list().map((t) => t.domain))
    for (const d of ["inventory", "products", "sales", "customers", "orders", "reports", "analytics"]) {
      expect(domains.has(d), `el dominio ${d} debería tener tools registradas`).toBe(true)
    }
  })

  it("el singleton toolRegistry está poblado y expone metadata segura", () => {
    expect(toolRegistry.size).toBeGreaterThan(0)
    const metadata = toolRegistry.metadata()
    expect(metadata).toHaveLength(toolRegistry.size)
    expect(metadata[0]).not.toHaveProperty("execute")
  })

  it("toLegacyAgentTool adapta el contrato 3B al contrato 1C", () => {
    const tool = makeTool("inventory.check_stock", {
      inputSchema: {
        type: "object",
        properties: { q: { type: "string", description: "Consulta", required: true } },
      },
    })
    const legacy = toLegacyAgentTool(tool)
    expect(legacy.name).toBe("inventory.check_stock")
    expect(legacy.permissions).toEqual(["inventory.read"])
    expect(legacy.input_schema).toEqual({
      type: "object",
      properties: { q: { type: "string", description: "Consulta" } },
      required: ["q"],
    })
  })

  it("el bridge ejecuta la tool mapeando el contexto legacy", async () => {
    const execute = vi
      .fn()
      .mockResolvedValue({ success: false, data: null, error: "sin stock", metadata: {} })
    const legacy = toLegacyAgentTool(makeTool("inventory.check_stock", { execute }))
    const legacyCtx = {
      userId: "u1",
      storeId: "s1",
      negocioId: "n1",
      plan: "business",
      role: "admin",
      permissions: ["inventory.read"],
    } as unknown as AgentContext

    const result = await legacy.execute(legacyCtx, { q: "abrazadera" })

    expect(execute).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "u1",
        storeId: "s1",
        negocioId: "n1",
        plan: "business",
        role: "admin",
        permissions: ["inventory.read"],
      }),
      { q: "abrazadera" }
    )
    expect(result).toEqual({ ok: false, data: null, error: "sin stock" })
  })
})
