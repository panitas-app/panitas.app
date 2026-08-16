import { describe, expect, it, vi } from "vitest"
import { buildToolRegistry } from "@/lib/agent/tools/setup"
import { ToolExecutor } from "@/lib/agent/tools/executor"
import { NoopToolLogger } from "@/lib/agent/tools/logging"
import { AgenticToolRunner } from "@/lib/agent-core/tool-calling/runner"
import { ConfirmationSystem } from "@/lib/agent-intel/confirmation-system"
import type { AIProvider, ProviderMessage, ProviderResponse } from "@/lib/agent-core/providers/types"
import type { ToolDeps } from "@/lib/agent/tools/deps"
import type { ToolExecutionContext } from "@/lib/agent/tools/types"

const ctx: ToolExecutionContext = {
  userId: "u1",
  storeId: "s1",
  negocioId: null,
  plan: "business",
  role: "admin",
  permissions: ["product.read", "product.create"],
}

function makeExecutor() {
  const categoryService = {
    create: vi.fn().mockResolvedValue({ id: "cat-1", name: "Bebidas", slug: "bebidas" }),
    list: vi.fn().mockResolvedValue([{ id: "cat-1", name: "Bebidas", slug: "bebidas" }]),
    belongsToStore: vi.fn().mockResolvedValue(true),
  }
  const productService = {
    list: vi.fn().mockResolvedValue({ products: [], total: 0 }),
    getById: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue({ id: "p1", name: "Cola", price: 10, stock: 20 }),
    update: vi.fn().mockResolvedValue({}),
    remove: vi.fn().mockResolvedValue({}),
  }
  const registry = buildToolRegistry({
    categoryService: categoryService as unknown as ToolDeps["categoryService"],
    productService: productService as unknown as ToolDeps["productService"],
  })
  const executor = new ToolExecutor({ registry, logger: new NoopToolLogger() })
  return { executor, registry, categoryService, productService }
}

describe("categories.create", () => {
  it("exige el permiso product.create", async () => {
    const { executor } = makeExecutor()
    const noPerm: ToolExecutionContext = { ...ctx, permissions: ["product.read"] as ToolExecutionContext["permissions"] }
    const response = await executor.execute(noPerm, "categories.create", { name: "Bebidas" })
    expect(response.success).toBe(false)
    expect(response.error).toContain("Sin permisos")
  })

  it("crea la categoría aislada al negocio del contexto", async () => {
    const { executor, categoryService } = makeExecutor()
    const response = await executor.execute(ctx, "categories.create", { name: "Bebidas" })

    expect(response.success).toBe(true)
    expect(categoryService.create).toHaveBeenCalledWith(
      expect.objectContaining({ storeId: "s1", userId: "u1" }),
      { name: "Bebidas" }
    )
    expect(response.data).toMatchObject({ id: "cat-1" })
  })

  it("valida que name sea obligatorio", async () => {
    const { executor, categoryService } = makeExecutor()
    const response = await executor.execute(ctx, "categories.create", {})
    expect(response.success).toBe(false)
    expect(categoryService.create).not.toHaveBeenCalled()
  })
})

describe("categories.list", () => {
  it("lista las categorías del negocio", async () => {
    const { executor, categoryService } = makeExecutor()
    const response = await executor.execute(ctx, "categories.list", {})
    expect(response.success).toBe(true)
    expect(categoryService.list).toHaveBeenCalledWith(expect.objectContaining({ storeId: "s1" }))
    expect(response.data).toHaveLength(1)
  })

  it("exige el permiso product.read", async () => {
    const { executor } = makeExecutor()
    const noPerm: ToolExecutionContext = { ...ctx, permissions: [] as ToolExecutionContext["permissions"] }
    const response = await executor.execute(noPerm, "categories.list", {})
    expect(response.success).toBe(false)
  })
})

describe("flujo completo del usuario (tool calling nativo): categoría + producto + stock en un prompt", () => {
  class FakeProvider implements AIProvider {
    constructor(private readonly queue: ProviderResponse[]) {}
    async chat(messages: ProviderMessage[]): Promise<ProviderResponse> {
      const next = this.queue.shift()
      if (!next) return { provider: "fake", model: "m1", content: "Listo." }
      return next
    }
    async complete(): Promise<ProviderResponse> {
      return { provider: "fake", model: "m1", content: "ok" }
    }
    async generateStructuredOutput<T>(): Promise<T> {
      return {} as T
    }
  }

  it("el LLM crea la categoría, usa su id real para crear el producto con precios y stock, y confirma con la respuesta natural", async () => {
    const { executor, registry, categoryService, productService } = makeExecutor()

    const provider = new FakeProvider([
      {
        provider: "fake",
        model: "m1",
        content: "",
        toolCalls: [
          {
            id: "c1",
            name: "categories.create",
            arguments: JSON.stringify({ name: "Bebidas" }),
          },
        ],
      },
      {
        provider: "fake",
        model: "m1",
        content: "",
        toolCalls: [
          {
            id: "c2",
            name: "products.create",
            arguments: JSON.stringify({ name: "Cola", price: 10, costPrice: 5, stock: 20, categoryId: "cat-1" }),
          },
        ],
      },
      { provider: "fake", model: "m1", content: "Listo. Creé la categoría Bebidas y el producto Cola con 20 unidades." },
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
        message: "crea la categoría Bebidas, un producto Cola con precio 10 y costo 5, y agrega 20 unidades de stock",
        plan: "business",
      },
      toolContext: ctx,
    })

    expect(result.status).toBe("completed")
    expect(result.reply).toContain("Cola")

    expect(categoryService.create).toHaveBeenCalledTimes(1)
    expect(categoryService.create).toHaveBeenCalledWith(
      expect.objectContaining({ storeId: "s1" }),
      { name: "Bebidas" }
    )

    expect(productService.create).toHaveBeenCalledTimes(1)
    const [, productBody] = productService.create.mock.calls[0]
    expect(productBody).toMatchObject({
      name: "Cola",
      price: 10,
      costPrice: 5,
      stock: 20,
      categoryId: "cat-1",
    })

    expect(result.toolCalls).toHaveLength(2)
    expect(result.toolCalls.map((t) => t.name)).toEqual(["categories.create", "products.create"])
    expect(result.toolCalls.every((t) => t.ok)).toBe(true)
  })

  it("si el producto falla (categoría inexistente), el toolCall queda en error y NO se informa éxito", async () => {
    const { executor, registry, productService } = makeExecutor()
    productService.create.mockRejectedValueOnce(new Error("La categoría no existe o no pertenece a este negocio"))

    const provider = new FakeProvider([
      {
        provider: "fake",
        model: "m1",
        content: "",
        toolCalls: [
          {
            id: "c1",
            name: "products.create",
            arguments: JSON.stringify({ name: "Cola", price: 10, categoryId: "cat-inventada" }),
          },
        ],
      },
      { provider: "fake", model: "m1", content: "No pude crear el producto: la categoría no existe." },
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
        message: "crea un producto Cola en la categoría inexistente",
        plan: "business",
      },
      toolContext: ctx,
    })

    expect(result.status).toBe("completed")
    expect(result.toolCalls).toHaveLength(1)
    expect(result.toolCalls[0].name).toBe("products.create")
    expect(result.toolCalls[0].ok).toBe(false)
    expect(result.reply).toContain("categoría no existe")
  })
})
