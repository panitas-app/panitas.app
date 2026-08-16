import { describe, expect, it, vi } from "vitest"
import { buildToolRegistry } from "@/lib/agent/tools/setup"
import { ToolExecutor } from "@/lib/agent/tools/executor"
import { NoopToolLogger } from "@/lib/agent/tools/logging"
import { AgenticToolRunner } from "@/lib/agent-core/tool-calling/runner"
import { ConfirmationSystem } from "@/lib/agent-intel/confirmation-system"
import type { AIProvider, ProviderCallOptions, ProviderMessage, ProviderResponse } from "@/lib/agent-core/providers/types"
import type { ToolDeps } from "@/lib/agent/tools/deps"
import type { ToolExecutionContext } from "@/lib/agent/tools/types"

const ctx: ToolExecutionContext = {
  userId: "u1",
  storeId: "s1",
  negocioId: null,
  plan: "business",
  role: "admin",
  permissions: ["sales.read", "sales.create", "customer.read"],
}

function makeExecutor() {
  const orderService = {
    create: vi.fn().mockResolvedValue({ id: "o1", orderNumber: "V-2026-0001", total: 100 }),
    getPending: vi.fn().mockResolvedValue([]),
    getById: vi.fn().mockResolvedValue(null),
    updateStatus: vi.fn().mockResolvedValue({}),
  }
  const productService = {
    list: vi.fn().mockResolvedValue({ products: [], total: 0 }),
    getById: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue({}),
    update: vi.fn().mockResolvedValue({}),
    remove: vi.fn().mockResolvedValue({}),
  }
  const inventoryService = {
    lowStock: vi.fn().mockResolvedValue([]),
    getStock: vi.fn().mockResolvedValue({}),
    applyMovement: vi.fn().mockResolvedValue({}),
    list: vi.fn().mockResolvedValue([]),
  }
  const salesService = {
    dailySummary: vi.fn().mockResolvedValue({}),
    summary: vi.fn().mockResolvedValue({}),
    productsSold: vi.fn().mockResolvedValue([]),
    recent: vi.fn().mockResolvedValue([]),
  }
  const customerService = {
    list: vi.fn().mockResolvedValue({ customers: [], total: 0 }),
    getHistory: vi.fn().mockResolvedValue({ orders: [] }),
    findOrCreateByPhone: vi.fn().mockResolvedValue({ customer: {}, created: false }),
  }
  const registry = buildToolRegistry({
    orderService: orderService as unknown as ToolDeps["orderService"],
    productService: productService as unknown as ToolDeps["productService"],
    inventoryService: inventoryService as unknown as ToolDeps["inventoryService"],
    salesService: salesService as unknown as ToolDeps["salesService"],
    customerService: customerService as unknown as ToolDeps["customerService"],
  })
  const executor = new ToolExecutor({ registry, logger: new NoopToolLogger() })
  return { executor, orderService, registry }
}

describe("sales.create", () => {
  it("exige el permiso sales.create", async () => {
    const { executor } = makeExecutor()
    const noPerm: ToolExecutionContext = { ...ctx, permissions: ["sales.read"] as ToolExecutionContext["permissions"] }
    const response = await executor.execute(noPerm, "sales.create", { items: [{ type: "PRODUCT", productId: "p1", quantity: 1 }] })
    expect(response.success).toBe(false)
    expect(response.error).toContain("Sin permisos")
  })

  it("registra una venta con productos reales (type PRODUCT, source assistant)", async () => {
    const { executor, orderService } = makeExecutor()
    const response = await executor.execute(ctx, "sales.create", {
      items: [{ type: "PRODUCT", productId: "p1", quantity: 2 }],
      customerName: "Ana",
      customerPhone: "+584120000000",
    })

    expect(response.success).toBe(true)
    expect(orderService.create).toHaveBeenCalledWith(
      expect.objectContaining({ storeId: "s1", userId: "u1" }),
      expect.objectContaining({
        source: "assistant",
        storeId: "s1",
        items: [{ type: "PRODUCT", productId: "p1", quantity: 2 }],
        customerName: "Ana",
        customerPhone: "+584120000000",
      })
    )
  })

  it("registra conceptos adicionales (type CUSTOM sin productId)", async () => {
    const { executor, orderService } = makeExecutor()
    await executor.execute(ctx, "sales.create", {
      items: [{ type: "CUSTOM", productName: "Envío express", quantity: 1, price: 5 }],
    })

    expect(orderService.create).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        items: [{ type: "CUSTOM", productName: "Envío express", quantity: 1, price: 5 }],
      })
    )
  })

  it("propaga crédito, pagos, envío y caja al servicio", async () => {
    const { executor, orderService } = makeExecutor()
    await executor.execute(ctx, "sales.create", {
      items: [{ type: "PRODUCT", productId: "p1", quantity: 1 }],
      creditTerm: "15_dias",
      creditDays: 15,
      downPayment: 10,
      payments: [{ method: "cash", amount: 10, reference: "ref-1" }],
      shippingCost: 3,
      cashRegisterSessionId: "caja-1",
    })

    expect(orderService.create).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        items: [{ type: "PRODUCT", productId: "p1", quantity: 1 }],
        creditTerm: "15_dias",
        creditDays: 15,
        downPayment: 10,
        payments: [{ method: "cash", amount: 10, reference: "ref-1" }],
        shippingCost: 3,
        cashRegisterSessionId: "caja-1",
      })
    )
  })

  it("valida que items sea obligatorio", async () => {
    const { executor, orderService } = makeExecutor()
    const response = await executor.execute(ctx, "sales.create", {})
    expect(response.success).toBe(false)
    expect(orderService.create).not.toHaveBeenCalled()
  })

  it("nunca acepta storeId desde el input (aislamiento: viene del contexto)", async () => {
    const { executor, orderService } = makeExecutor()
    await executor.execute(ctx, "sales.create", {
      items: [{ type: "PRODUCT", productId: "p1", quantity: 1 }],
      storeId: "otra-tienda",
    })

    const [, body] = orderService.create.mock.calls[0]
    expect(body.storeId).toBe("s1")
    expect(body.storeId).not.toBe("otra-tienda")
  })
})

describe("sales.create — flujo AI completo (tool calling nativo)", () => {
  class FakeProvider implements AIProvider {
    calls: ProviderMessage[][] = []
    constructor(private readonly queue: ProviderResponse[]) {}
    async chat(messages: ProviderMessage[]): Promise<ProviderResponse> {
      this.calls.push(messages)
      const next = this.queue.shift()
      if (!next) return { provider: "fake", model: "m1", content: "Listo." }
      return next
    }
    async complete(_p: string): Promise<ProviderResponse> {
      return { provider: "fake", model: "m1", content: "ok" }
    }
    async generateStructuredOutput<T>(): Promise<T> {
      return {} as T
    }
  }

  it("el LLM elige sales.create con un concepto CUSTOM y el runner devuelve la respuesta natural", async () => {
    const { executor, orderService, registry } = makeExecutor()
    const provider = new FakeProvider([
      {
        provider: "fake",
        model: "m1",
        content: "",
        toolCalls: [
          {
            id: "c1",
            name: "sales.create",
            arguments: JSON.stringify({ items: [{ type: "CUSTOM", productName: "Mano de obra", quantity: 2, price: 15 }] }),
          },
        ],
      },
      { provider: "fake", model: "m1", content: "Listo, agregué el concepto 'Mano de obra' (x2) por $30.00." },
    ])
    const runner = new AgenticToolRunner({
      provider,
      registry,
      executor,
      confirmation: new ConfirmationSystem(),
    })

    const result = await runner.run({
      request: {
        userId: "u1",
        storeId: "s1",
        role: "admin",
        permissions: ctx.permissions,
        message: "agrega un concepto de mano de obra de 15 por unidad, 2 unidades",
        plan: "business",
      },
      toolContext: ctx,
    })

    expect(result.status).toBe("completed")
    expect(result.reply).toContain("Mano de obra")
    expect(orderService.create).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        source: "assistant",
        storeId: "s1",
        items: [{ type: "CUSTOM", productName: "Mano de obra", quantity: 2, price: 15 }],
      })
    )
    expect(result.toolCalls).toHaveLength(1)
    expect(result.toolCalls[0]).toMatchObject({ name: "sales.create", ok: true })
  })
})
