import { describe, expect, it, vi, beforeEach } from "vitest"
import { ToolRegistry } from "@/lib/agent/tools/registry"
import { ToolExecutor } from "@/lib/agent/tools/executor"
import { NoopToolLogger } from "@/lib/agent/tools/logging"
import { ExecutionPlanner } from "@/lib/agent-intel/execution-planner"
import type { AgentTool, ToolExecutionContext } from "@/lib/agent/tools/types"
import type { ExecutionPlan, IntentClassification, PlannedStep } from "@/lib/agent-intel/types"

const INTENT: IntentClassification = {
  type: "consulta",
  confidence: 0.8,
  domains: [],
  message: "consulta",
  entities: {},
  destructive: false,
  needsTools: true,
  signals: [],
}

function makeTool(name: string, execute?: AgentTool["execute"]): AgentTool {
  return {
    name,
    domain: "inventory",
    description: `Tool ${name}`,
    requiredPermissions: [],
    inputSchema: { type: "object", properties: {} },
    execute: execute ?? (async () => ({ success: true, data: null, error: null, metadata: {} })),
  }
}

function makePlan(steps: PlannedStep[]): ExecutionPlan {
  return { id: "plan-test", intent: INTENT, steps, requiresConfirmation: false, domains: [] }
}

function step(id: string, tool: string, opts: Partial<PlannedStep> = {}): PlannedStep {
  return {
    id,
    tool,
    domain: "inventory",
    input: {},
    dependsOn: [],
    parallel: false,
    retryable: true,
    requiresConfirmation: false,
    rationale: "test",
    ...opts,
  }
}

const ctx: ToolExecutionContext = {
  userId: "u1",
  storeId: "s1",
  negocioId: null,
  plan: "business",
  role: "admin",
  permissions: ["inventory.read"],
}

describe("ExecutionPlanner", () => {
  let registry: ToolRegistry
  let executor: ToolExecutor
  let planner: ExecutionPlanner

  beforeEach(() => {
    registry = new ToolRegistry()
    executor = new ToolExecutor({ registry, logger: new NoopToolLogger() })
    planner = new ExecutionPlanner()
  })

  it("ejecuta pasos en paralelo cuando no tienen dependencias", async () => {
    const spies = [vi.fn(), vi.fn()].map((fn) => vi.fn(async () => ({ success: true, data: { spy: fn() }, error: null, metadata: {} })))
    registry.register(makeTool("a.one", spies[0]))
    registry.register(makeTool("b.two", spies[1]))

    const outcome = await planner.execute(
      makePlan([step("s1", "a.one", { parallel: true }), step("s2", "b.two", { parallel: true })]),
      ctx,
      executor
    )

    expect(outcome.ok).toBe(true)
    expect(outcome.partialFailures).toBe(false)
    expect(outcome.results).toHaveLength(2)
    expect(outcome.results.every((r) => r.status === "ok")).toBe(true)
    expect(spies[0]).toHaveBeenCalledTimes(1)
    expect(spies[1]).toHaveBeenCalledTimes(1)
  })

  it("respeta dependencias secuenciales", async () => {
    const order: string[] = []
    registry.register(
      makeTool("a.first", async () => {
        order.push("a")
        return { success: true, data: null, error: null, metadata: {} }
      })
    )
    registry.register(
      makeTool("b.second", async () => {
        order.push("b")
        return { success: true, data: null, error: null, metadata: {} }
      })
    )

    const outcome = await planner.execute(
      makePlan([step("s1", "a.first"), step("s2", "b.second", { dependsOn: ["s1"] })]),
      ctx,
      executor
    )

    expect(outcome.ok).toBe(true)
    expect(order).toEqual(["a", "b"])
  })

  it("NUNCA ejecuta un paso sin confirmación (awaiting_confirmation)", async () => {
    const spy = vi.fn(async () => ({ success: true, data: null, error: null, metadata: {} }))
    registry.register(makeTool("orders.updateStatus", spy))

    const outcome = await planner.execute(
      makePlan([step("s1", "orders.updateStatus", { requiresConfirmation: true })]),
      ctx,
      executor
    )

    expect(spy).not.toHaveBeenCalled()
    expect(outcome.results[0].status).toBe("awaiting_confirmation")
  })

  it("ejecuta un paso que sí está confirmado", async () => {
    const spy = vi.fn(async () => ({ success: true, data: null, error: null, metadata: {} }))
    registry.register(makeTool("orders.updateStatus", spy))

    const outcome = await planner.execute(
      makePlan([step("s1", "orders.updateStatus", { requiresConfirmation: true })]),
      ctx,
      executor,
      { confirmedStepIds: ["s1"] }
    )

    expect(spy).toHaveBeenCalledTimes(1)
    expect(outcome.results[0].status).toBe("ok")
  })

  it("reintenta un error retryable y luego falla", async () => {
    const flaky = vi.fn(async () => ({
      success: false,
      data: null,
      error: "timeout del proveedor",
      metadata: {},
    }))
    registry.register(makeTool("a.flaky", flaky))

    const outcome = await planner.execute(
      makePlan([step("s1", "a.flaky", { retryable: true })]),
      ctx,
      executor,
      { maxRetries: 3, retryDelayMs: 1 }
    )

    expect(flaky).toHaveBeenCalledTimes(3)
    expect(outcome.results[0].status).toBe("error")
    expect(outcome.ok).toBe(false)
  })

  it("no reintenta errores no retryable", async () => {
    const spy = vi.fn(async () => ({ success: false, data: null, error: "input inválido", metadata: {} }))
    registry.register(makeTool("a.strict", spy))

    await planner.execute(makePlan([step("s1", "a.strict", { retryable: true })]), ctx, executor, { maxRetries: 3 })

    expect(spy).toHaveBeenCalledTimes(1)
  })

  it("marca como skipped los dependientes de un paso fallido", async () => {
    registry.register(
      makeTool("a.fail", async () => ({ success: false, data: null, error: "boom", metadata: {} }))
    )
    const spy = vi.fn(async () => ({ success: true, data: null, error: null, metadata: {} }))
    registry.register(makeTool("b.child", spy))

    const outcome = await planner.execute(
      makePlan([step("s1", "a.fail"), step("s2", "b.child", { dependsOn: ["s1"] })]),
      ctx,
      executor
    )

    expect(spy).not.toHaveBeenCalled()
    expect(outcome.results.find((r) => r.stepId === "s1")?.status).toBe("error")
    expect(outcome.results.find((r) => r.stepId === "s2")?.status).toBe("skipped")
    expect(outcome.ok).toBe(false)
  })

  it("reporta errores parciales pero continúa con pasos independientes", async () => {
    registry.register(
      makeTool("a.fail", async () => ({ success: false, data: null, error: "boom", metadata: {} }))
    )
    registry.register(makeTool("b.ok", async () => ({ success: true, data: { x: 1 }, error: null, metadata: {} })))

    const outcome = await planner.execute(
      makePlan([step("s1", "a.fail", { parallel: true }), step("s2", "b.ok", { parallel: true })]),
      ctx,
      executor
    )

    expect(outcome.partialFailures).toBe(true)
    expect(outcome.ok).toBe(false)
    expect(outcome.results.some((r) => r.status === "ok")).toBe(true)
  })

  it("consolida resultados con duración e intentos", async () => {
    registry.register(makeTool("a.meta"))
    const outcome = await planner.execute(makePlan([step("s1", "a.meta")]), ctx, executor)
    const r = outcome.results[0]
    expect(r.stepId).toBe("s1")
    expect(r.attempts).toBe(1)
    expect(typeof r.durationMs).toBe("number")
    expect(r.output).toMatchObject({ success: true })
  })
})
