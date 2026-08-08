import { describe, expect, it, beforeEach, vi } from "vitest"
import { ToolRegistry } from "@/lib/agent/tools/registry"
import { ToolExecutor } from "@/lib/agent/tools/executor"
import { NoopToolLogger } from "@/lib/agent/tools/logging"
import { IntelligenceLayer } from "@/lib/agent-intel/agent-intelligence"
import { TaskPlanner } from "@/lib/agent-intel/task-planner"
import { ExecutionPlanner } from "@/lib/agent-intel/execution-planner"
import type { AgentTool, ToolExecutionContext } from "@/lib/agent/tools/types"
import type { AgentRequest } from "@/lib/agent-core/types"

function makeTool(name: string, execute?: AgentTool["execute"]): AgentTool {
  return {
    name,
    domain: "inventory",
    description: `Tool ${name}`,
    requiredPermissions: [],
    inputSchema: { type: "object", properties: {} },
    execute: execute ?? (async () => ({ success: true, data: { ok: 1 }, error: null, metadata: {} })),
  }
}

const CATALOG = [
  { name: "inventory.searchProduct", domain: "inventory", description: "", requiredPermissions: [], inputSchema: { type: "object", properties: {} } },
  { name: "inventory.getLowStock", domain: "inventory", description: "", requiredPermissions: [], inputSchema: { type: "object", properties: {} } },
  { name: "orders.updateStatus", domain: "orders", description: "", requiredPermissions: [], inputSchema: { type: "object", properties: {} } },
  { name: "analytics.businessSummary", domain: "analytics", description: "", requiredPermissions: [], inputSchema: { type: "object", properties: {} } },
  { name: "analytics.businessAlerts", domain: "analytics", description: "", requiredPermissions: [], inputSchema: { type: "object", properties: {} } },
] as const

const toolCtx: ToolExecutionContext = {
  userId: "u1",
  storeId: "s1",
  negocioId: null,
  plan: "business",
  role: "admin",
  permissions: ["inventory.read", "inventory.write", "order.cancel", "product.delete"],
}

function makeRequest(message: string): AgentRequest {
  return {
    userId: "u1",
    storeId: "s1",
    negocioId: null,
    plan: "business",
    role: "admin",
    permissions: toolCtx.permissions,
    message,
    taskType: "chat",
  }
}

describe("IntelligenceLayer", () => {
  let registry: ToolRegistry

  beforeEach(() => {
    registry = new ToolRegistry()
  })

  function buildLayer(): IntelligenceLayer {
    const executor = new ToolExecutor({ registry, logger: new NoopToolLogger() })
    return new IntelligenceLayer({
      planner: new TaskPlanner({ catalog: CATALOG }),
      execution: new ExecutionPlanner(),
      toolExecutor: executor,
    })
  }

  it("completa una consulta con evidencia y contexto para el LLM", async () => {
    registry.register(makeTool("inventory.searchProduct"))
    const layer = buildLayer()

    const result = await layer.run({ request: makeRequest("¿cuánto stock hay de abrazadera?"), toolContext: toolCtx })

    expect(result.status).toBe("completed")
    expect(result.toolResults).toHaveLength(1)
    expect(result.toolResults[0].status).toBe("ok")
    expect(result.synthesizedContext).toBeTruthy()
    expect(result.synthesizedContext).toContain("INTENCION_DETECTADA: consulta")
    expect(result.reply).toBeUndefined()
    expect(result.trace.steps).toHaveLength(1)
  })

  it("exige confirmación para acciones destructivas sin ejecutar nada", async () => {
    const spy = vi.fn(async () => ({ success: true, data: null, error: null, metadata: {} }))
    registry.register(makeTool("orders.updateStatus", spy))
    const layer = buildLayer()

    const result = await layer.run({ request: makeRequest("cancelar el pedido #123"), toolContext: toolCtx })

    expect(result.status).toBe("confirmation_required")
    expect(result.confirmation?.confirmCodes).toEqual(["confirm:step-1"])
    expect(result.reply).toMatch(/confirm/i)
    expect(spy).not.toHaveBeenCalled()
    expect(result.toolResults).toHaveLength(0)
  })

  it("ejecuta la acción cuando el usuario confirma", async () => {
    const spy = vi.fn(async () => ({ success: true, data: null, error: null, metadata: {} }))
    registry.register(makeTool("orders.updateStatus", spy))
    const layer = buildLayer()

    const result = await layer.run({
      request: makeRequest("cancelar el pedido #123"),
      toolContext: toolCtx,
      confirmedStepIds: ["step-1"],
    })

    expect(result.status).toBe("completed")
    expect(spy).toHaveBeenCalledTimes(1)
    expect(result.toolResults[0].status).toBe("ok")
  })

  it("cae a respuesta determinista cuando todas las tools fallan", async () => {
    const layer = buildLayer()

    const result = await layer.run({ request: makeRequest("¿cuánto stock hay de abrazadera?"), toolContext: toolCtx })

    expect(result.status).toBe("completed")
    expect(result.synthesizedContext).toBeUndefined()
    expect(result.reply).toBeTruthy()
    expect(result.reply).toContain("No pude completar")
  })

  it("delega conversación sin tools", async () => {
    const layer = buildLayer()
    const result = await layer.run({ request: makeRequest("hola, ¿cómo estás?"), toolContext: toolCtx })
    expect(result.status).toBe("no_tools")
    expect(result.toolResults).toHaveLength(0)
  })

  it("incluye explicaciones generadas desde las alertas del negocio", async () => {
    registry.register(makeTool("analytics.businessSummary"))
    registry.register(
      makeTool("analytics.businessAlerts", async () => ({
        success: true,
        data: [{ severity: "warning", type: "low_stock", message: "El stock de Abrazadera está bajo" }],
        error: null,
        metadata: {},
      }))
    )
    registry.register(makeTool("inventory.getLowStock"))
    const layer = buildLayer()

    const result = await layer.run({ request: makeRequest("analiza el rendimiento del inventario"), toolContext: toolCtx })

    expect(result.status).toBe("completed")
    expect(result.synthesizedContext).toContain("EXPLICACIONES:")
    expect(result.synthesizedContext).toContain("reponer existencias")
  })
})
