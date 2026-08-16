import { describe, expect, it, vi } from "vitest"
import type { AIProvider, ProviderCallOptions, ProviderMessage, ProviderResponse, ProviderToolCall } from "@/lib/agent-core/providers/types"
import { AgenticToolRunner, nativeStepId, shortHash } from "@/lib/agent-core/tool-calling/runner"
import { ToolRegistry } from "@/lib/agent/tools/registry"
import { ToolExecutor } from "@/lib/agent/tools/executor"
import { NoopToolLogger } from "@/lib/agent/tools/logging"
import { ConfirmationSystem } from "@/lib/agent-intel/confirmation-system"
import type { AgentTool, ToolExecutionContext, ToolResponse } from "@/lib/agent/tools"
import type { AgentRequest } from "@/lib/agent-core/types"

function toolCall(id: string, name: string, args: string): ProviderToolCall {
  return { id, name, arguments: args }
}

function response(content: string, calls: ProviderToolCall[] = []): ProviderResponse {
  return { provider: "fake", model: "m1", content, ...(calls.length > 0 ? { toolCalls: calls } : {}) }
}

class FakeProvider implements AIProvider {
  calls: Array<{ messages: ProviderMessage[]; options?: ProviderCallOptions }> = []
  constructor(private readonly queue: ProviderResponse[], private readonly failOnEmpty = false) {}

  async chat(messages: ProviderMessage[], _taskType?: string, options?: ProviderCallOptions): Promise<ProviderResponse> {
    this.calls.push({ messages, options })
    const next = this.queue.shift()
    if (!next) {
      if (this.failOnEmpty) throw new Error("boom del proveedor")
      return response("Listo.")
    }
    return next
  }

  async complete(_p: string): Promise<ProviderResponse> {
    return response("ok")
  }

  async generateStructuredOutput<T>(): Promise<T> {
    return {} as T
  }
}

const ADMIN_PERMS = [
  "inventory.read",
  "inventory.update",
  "product.read",
  "product.create",
  "sales.read",
  "sales.create",
  "customer.read",
] as ToolExecutionContext["permissions"]

function makeCtx(overrides: Partial<ToolExecutionContext> = {}): ToolExecutionContext {
  return { userId: "u1", storeId: "s1", negocioId: null, plan: "business", role: "admin", permissions: ADMIN_PERMS, ...overrides }
}

function request(message: string): AgentRequest {
  return { userId: "u1", storeId: "s1", role: "admin", permissions: ADMIN_PERMS, message, plan: "business" }
}

function makeTool(name: string, requiredPermissions: string[], execute: AgentTool["execute"]): AgentTool {
  return {
    name,
    domain: name.split(".")[0] as AgentTool["domain"],
    description: `Tool ${name}`,
    requiredPermissions,
    inputSchema: { type: "object", properties: {} },
    execute,
  }
}

function okResponse(data: unknown): ToolResponse {
  return { success: true, data, error: null, metadata: {} }
}

function setup(queue: ProviderResponse[], ctx = makeCtx(), opts: { maxIterations?: number; toolChoice?: "auto" | "none" | "required" } = {}) {
  const readExecute = vi.fn(async () => okResponse({ stock: 8 }))
  const stockExecute = vi.fn(async () => okResponse({ id: "m1", type: "decrease" }))
  const refundExecute = vi.fn(async () => okResponse({ ok: true }))

  const registry = new ToolRegistry()
  registry.register(makeTool("inventory.readStock", ["inventory.read"], readExecute))
  registry.register(makeTool("inventory.updateStock", ["inventory.update"], stockExecute))
  registry.register(makeTool("sales.refund", ["sales.refund"], refundExecute))

  const executor = new ToolExecutor({ registry, logger: new NoopToolLogger() })
  const runner = new AgenticToolRunner({
    provider: new FakeProvider(queue),
    registry,
    executor,
    confirmation: new ConfirmationSystem(),
    options: { maxIterations: opts.maxIterations, toolChoice: opts.toolChoice },
  })
  return { runner, executor, registry, readExecute, stockExecute, refundExecute, ctx }
}

describe("AgenticToolRunner", () => {
  it("nativoStepId es estable y liga tool+argumentos", () => {
    expect(nativeStepId("inventory.updateStock", { productId: "p1", quantity: 2 })).toBe(
      nativeStepId("inventory.updateStock", { productId: "p1", quantity: 2 })
    )
    expect(nativeStepId("inventory.updateStock", { productId: "p1", quantity: 2 })).not.toBe(
      nativeStepId("inventory.updateStock", { productId: "p1", quantity: 5 })
    )
    expect(shortHash("abc")).toBe(shortHash("abc"))
    expect(shortHash("abc")).not.toBe(shortHash("abd"))
  })

  it("ejecuta una tool no destructiva y devuelve completed con el resultado", async () => {
    const { runner, readExecute } = setup([
      response("", [toolCall("c1", "inventory.readStock", '{"productId":"p1"}')]),
      response("El stock de p1 es 8."),
    ])
    const result = await runner.run({ request: request("¿cuál es el stock de p1?"), toolContext: makeCtx() })

    expect(result.status).toBe("completed")
    expect(result.reply).toBe("El stock de p1 es 8.")
    expect(result.toolCalls).toHaveLength(1)
    expect(result.toolCalls[0]).toMatchObject({ name: "inventory.readStock", ok: true })
    expect(JSON.parse(result.toolCalls[0].output!)).toEqual({ stock: 8 })
    expect(readExecute).toHaveBeenCalledWith(expect.anything(), { productId: "p1" })
  })

  it("responde completed sin toolCalls cuando el modelo responde directo", async () => {
    const { runner } = setup([response("Hola, ¿en qué te ayudo?")])
    const result = await runner.run({ request: request("hola"), toolContext: makeCtx() })
    expect(result.status).toBe("completed")
    expect(result.reply).toBe("Hola, ¿en qué te ayudo?")
    expect(result.toolCalls).toHaveLength(0)
  })

  it("bloquea acciones destructivas: confirmation_required y NO ejecuta nada", async () => {
    const { runner, stockExecute } = setup([
      response("", [toolCall("c1", "inventory.updateStock", '{"productId":"p1","type":"decrease","quantity":2}')]),
    ])
    const result = await runner.run({ request: request("descuenta 2 de p1"), toolContext: makeCtx() })

    expect(result.status).toBe("confirmation_required")
    expect(result.confirmation).toBeDefined()
    expect(result.confirmation!.actions).toHaveLength(1)
    expect(result.confirmation!.actions[0].stepId).toBe(nativeStepId("inventory.updateStock", { productId: "p1", type: "decrease", quantity: 2 }))
    expect(result.confirmation!.actions[0].description).toContain("Reducir el stock")
    expect(stockExecute).not.toHaveBeenCalled()
  })

  it("ejecuta la acción destructiva en la segunda vuelta con los ids confirmados", async () => {
    const { runner, stockExecute } = setup([
      response("", [toolCall("c1", "inventory.updateStock", '{"productId":"p1","type":"decrease","quantity":2}')]),
      response("Listo, stock actualizado."),
    ])
    const stepId = nativeStepId("inventory.updateStock", { productId: "p1", type: "decrease", quantity: 2 })
    const result = await runner.run({
      request: request("sí, confirma"),
      toolContext: makeCtx(),
      confirmedStepIds: [stepId],
    })

    expect(result.status).toBe("completed")
    expect(stockExecute).toHaveBeenCalled()
    expect(result.toolCalls[0].ok).toBe(true)
  })

  it("no ejecuta si la confirmación es para OTRA entidad (ids ligados a argumentos)", async () => {
    const { runner, stockExecute } = setup([
      response("", [toolCall("c1", "inventory.updateStock", '{"productId":"p1","type":"decrease","quantity":5}')]),
    ])
    const otherStepId = nativeStepId("inventory.updateStock", { productId: "p1", type: "decrease", quantity: 2 })
    const result = await runner.run({
      request: request("sí"),
      toolContext: makeCtx(),
      confirmedStepIds: [otherStepId],
    })

    expect(result.status).toBe("confirmation_required")
    expect(stockExecute).not.toHaveBeenCalled()
  })

  it("exponen al modelo solo las tools permitidas por el rol", async () => {
    const sellerCtx = makeCtx({ role: "seller", permissions: ["inventory.read"] as ToolExecutionContext["permissions"] })
    const { runner } = setup([response("ok")], sellerCtx)

    const allowed = runner.allowedTools(sellerCtx).map((t) => t.name)
    expect(allowed).toContain("inventory.readStock")
    expect(allowed).not.toContain("inventory.updateStock")
    expect(allowed).not.toContain("sales.refund")
  })

  it("no envía tools al proveedor si ninguna está permitida", async () => {
    const ctx = makeCtx({ permissions: [] as ToolExecutionContext["permissions"] })
    const { runner } = setup([response("no puedo con eso")], ctx)
    const provider = (runner as unknown as { provider: FakeProvider }).provider

    await runner.run({ request: request("algo"), toolContext: ctx })

    expect(provider.calls[0].options?.tools).toBeUndefined()
  })

  it("encadena: los resultados de las tools vuelven al modelo con rol tool", async () => {
    const { runner } = setup([
      response("", [toolCall("c1", "inventory.readStock", '{"productId":"p1"}')]),
      response("Confirmado: 8 unidades."),
    ])
    const provider = (runner as unknown as { provider: FakeProvider }).provider

    await runner.run({ request: request("stock de p1"), toolContext: makeCtx() })

    const secondCall = provider.calls[1].messages
    const assistant = secondCall.find((m) => m.role === "assistant" && m.toolCalls)
    const toolMsg = secondCall.find((m) => m.role === "tool")
    expect(assistant).toBeDefined()
    expect(toolMsg).toMatchObject({ role: "tool", toolCallId: "c1" })
    expect(toolMsg!.content).toContain('"ok":true')
  })

  it("argumentos JSON inválidos se parsean de forma tolerante a {}", async () => {
    const { runner, readExecute } = setup([
      response("", [toolCall("c1", "inventory.readStock", "{no es json")]),
      response("ok"),
    ])
    await runner.run({ request: request("stock"), toolContext: makeCtx() })
    expect(readExecute).toHaveBeenCalledWith(expect.anything(), {})
  })

  it("argumentos malformados pero con JSON embebido se recuperan", async () => {
    const { runner, readExecute } = setup([
      response("", [toolCall("c1", "inventory.readStock", 'aquí está: {"productId":"p1"} fin')]),
      response("ok"),
    ])
    await runner.run({ request: request("stock"), toolContext: makeCtx() })
    expect(readExecute).toHaveBeenCalledWith(expect.anything(), { productId: "p1" })
  })

  it("error del proveedor → status error con el mensaje", async () => {
    const provider = new FakeProvider([], true)
    const registry = new ToolRegistry()
    const executor = new ToolExecutor({ registry, logger: new NoopToolLogger() })
    const runner = new AgenticToolRunner({ provider, registry, executor, confirmation: new ConfirmationSystem() })

    const result = await runner.run({ request: request("hola"), toolContext: makeCtx() })
    expect(result.status).toBe("error")
    expect(result.error).toContain("boom del proveedor")
  })

  it("alcanza maxIterations → error max_iterations sin colgarse", async () => {
    const { runner, stockExecute } = setup(
      [
        response("", [toolCall("c1", "inventory.updateStock", '{"productId":"p1","type":"increase","quantity":1}')]),
        response("", [toolCall("c2", "inventory.updateStock", '{"productId":"p1","type":"increase","quantity":1}')]),
        response("", [toolCall("c3", "inventory.updateStock", '{"productId":"p1","type":"increase","quantity":1}')]),
      ],
      makeCtx(),
      { maxIterations: 2 }
    )

    const result = await runner.run({ request: request("aumenta 1"), toolContext: makeCtx(), confirmedStepIds: [] })
    expect(result.status).toBe("error")
    expect(result.error).toBe("max_iterations")
    expect(stockExecute).toHaveBeenCalledTimes(2)
    expect(result.toolCalls).toHaveLength(2)
  })
})
