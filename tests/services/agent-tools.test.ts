import { describe, expect, it, vi, beforeEach } from "vitest"
import { readFileSync, readdirSync } from "node:fs"
import { join } from "node:path"

vi.mock("@/lib/agent/audit", () => ({
  agentAudit: { record: vi.fn(), list: vi.fn(() => []), clear: vi.fn() },
}))

import { registerTool, getTool, listTools, executeTool } from "@/lib/agent/registry"
import { availableTools } from "@/lib/agent/tools"
import { agentAudit } from "@/lib/agent/audit"
import type { AgentTool, AgentContext } from "@/lib/agent/types"

const ctx: AgentContext = {
  userId: "u1",
  storeId: "s1",
  negocioId: null,
  plan: "free",
  role: "admin",
  permissions: ["inventory.read", "inventory.update", "sales.read", "customer.read"],
}

function makeTool(name: string, permissions: AgentTool["permissions"]): AgentTool {
  return {
    name,
    description: name,
    permissions,
    execute: async () => ({ ok: true, data: { done: true } }),
  }
}

describe("availableTools", () => {
  it("exposes all tool modules", () => {
    const names = availableTools.map((t) => t.name)
    for (const expected of [
      "inventory.check_stock",
      "inventory.adjust_stock",
      "inventory.movements",
      "product.list",
      "product.get",
      "product.create",
      "product.update",
      "product.delete",
      "sales.summary",
      "sales.create_order",
      "order.list",
      "order.get",
      "order.create",
      "customers.list",
      "customers.create",
      "agenda.list",
      "agenda.create",
      "agenda.cancel",
      "report.sales",
      "report.today",
    ]) {
      expect(names).toContain(expected)
    }
  })

  it("every tool declares permissions, description and execute", () => {
    for (const tool of availableTools) {
      expect(tool.permissions.length).toBeGreaterThan(0)
      expect(typeof tool.description).toBe("string")
      expect(typeof tool.execute).toBe("function")
    }
  })
})

describe("registry", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("registers, gets and lists tools", () => {
    registerTool(makeTool("test.tool", ["inventory.read"]))
    expect(getTool("test.tool")).toBeDefined()
    expect(listTools().map((t) => t.name)).toContain("test.tool")
  })

  it("executes an authorized tool", async () => {
    registerTool(makeTool("test.ok", ["inventory.read"]))
    const result = await executeTool(ctx, "test.ok", {})
    expect(result.ok).toBe(true)
    expect(result.data).toEqual({ done: true })
  })

  it("rejects a tool without required permission", async () => {
    registerTool(makeTool("test.critical", ["sales.refund"]))
    const result = await executeTool(ctx, "test.critical", {})
    expect(result.ok).toBe(false)
    expect(result.error).toContain("Sin permisos")
    expect(agentAudit.record).toHaveBeenCalledWith(
      expect.objectContaining({ tool: "test.critical", result: "error" })
    )
  })

  it("returns an error for an unknown tool", async () => {
    const result = await executeTool(ctx, "no.existe", {})
    expect(result.ok).toBe(false)
    expect(result.error).toContain("desconocida")
  })

  it("audits successful executions", async () => {
    registerTool(makeTool("test.audited", ["inventory.read"]))
    await executeTool(ctx, "test.audited", { q: "x" })
    expect(agentAudit.record).toHaveBeenCalledWith(
      expect.objectContaining({ tool: "test.audited", result: "success", userId: "u1" })
    )
  })
})

describe("tool layering", () => {
  const toolsDir = join(process.cwd(), "src/lib/agent/tools")
  const files = readdirSync(toolsDir).filter((f) => f.endsWith(".tools.ts"))

  it("tools never import prisma or repositories directly", () => {
    expect(files.length).toBeGreaterThan(0)
    for (const file of files) {
      const source = readFileSync(join(toolsDir, file), "utf8")
      expect(source, `${file} must not import @/lib/prisma`).not.toContain("@/lib/prisma")
      expect(source, `${file} must not import @/repositories`).not.toContain("@/repositories")
      expect(source, `${file} must call services`).toMatch(/@\/services\//)
    }
  })
})
