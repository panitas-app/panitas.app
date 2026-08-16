import { describe, expect, it, vi, beforeEach } from "vitest"
import { ConversationalActionsEngine } from "@/lib/conversational-actions/engine"
import type { ExecutorDeps } from "@/lib/conversational-actions/executor"
import type { ActionsEngineInput } from "@/lib/conversational-actions/engine"

const ctx = { storeId: "store-1", userId: "user-1", role: "admin", plan: "business", storeName: "Mi Tienda" }
const runtime = {
  userId: "user-1",
  storeId: "store-1",
  negocioId: null,
  plan: "business",
  role: "admin",
  permissions: [
    "inventory.read",
    "inventory.write",
    "product.create",
    "product.update",
    "product.delete",
    "sales.create",
    "sales.read",
    "customer.read",
    "customer.write",
    "order.read",
    "order.cancel",
    "report.read",
    "analytics.read",
    "expense.create",
    "expense.update",
    "supplier.pay",
    "credit.pay",
  ],
}

function toolOk(data: unknown = {}) {
  return { success: true, data, error: null, metadata: {} }
}

function makeDeps(overrides: Record<string, unknown> = {}) {
  return {
    productService: {
      list: vi.fn().mockResolvedValue({ products: [{ id: "p1", name: "cocacola", price: 2, stock: 20 }], total: 1 }),
    },
    customerService: {
      list: vi.fn().mockResolvedValue({ customers: [{ id: "c1", name: "maria", phone: "5551234" }], total: 1 }),
    },
    orderService: {
      create: vi.fn().mockResolvedValue({ id: "o1", orderNumber: "ORD-001", total: 4 }),
      getById: vi.fn().mockResolvedValue(null),
      list: vi.fn().mockResolvedValue({ orders: [{ id: "o1", orderNumber: "ORD-001" }], total: 1 }),
    },
    expenseService: {
      create: vi.fn().mockResolvedValue({ id: "e1", description: "transporte", amount: 5, category: "transporte" }),
      getById: vi.fn().mockResolvedValue(null),
      list: vi.fn().mockResolvedValue({ expenses: [], total: 0 }),
      totalsByCategory: vi.fn().mockResolvedValue([]),
      update: vi.fn().mockResolvedValue({ id: "e1" }),
      remove: vi.fn().mockResolvedValue({ id: "e1" }),
    },
    salesService: {},
    toolExecutor: { execute: vi.fn().mockResolvedValue(toolOk({})) },
    ...overrides,
  } as unknown as ExecutorDeps
}

function makeEngine(deps: ExecutorDeps = makeDeps()) {
  return new ConversationalActionsEngine({ executor: deps })
}

function input(message: string, previous?: ActionsEngineInput["previous"]): ActionsEngineInput {
  return { message, ctx, runtime, previous }
}

describe("ConversationalActionsEngine.run", () => {
  beforeEach(() => vi.clearAllMocks())

  it("delega al flujo normal cuando el mensaje no es una acción", async () => {
    const deps = makeDeps()
    const result = await makeEngine(deps).run(input("hola, como estas?"))

    expect(result.status).toBe("no_action")
    expect(deps.toolExecutor.execute).not.toHaveBeenCalled()
    expect(deps.orderService.create).not.toHaveBeenCalled()
  })

  it("crea un producto en varios turnos rellenando parámetros", async () => {
    const deps = makeDeps()
    const engine = makeEngine(deps)

    const t1 = await engine.run(input("crear producto"))
    expect(t1.status).toBe("awaiting_details")
    expect(t1.actionId).toBe("crear_producto")
    expect(t1.pendingParams?.some((p) => p.key === "nombre")).toBe(true)

    const t2 = await engine.run(input("pan", { actionId: t1.actionId, knownParams: t1.knownParams, status: "awaiting_details" }))
    expect(t2.status).toBe("awaiting_details")
    expect(t2.knownParams).toMatchObject({ nombre: "pan" })

    const t3 = await engine.run(input("10", { actionId: t2.actionId, knownParams: t2.knownParams, status: "awaiting_details" }))
    expect(t3.status).toBe("completed")
    expect(t3.reply).toContain("pan")
    expect(t3.rich).toBeDefined()
    expect(deps.toolExecutor.execute).toHaveBeenCalledWith(
      expect.objectContaining({ storeId: "store-1", userId: "user-1" }),
      "products.create",
      expect.objectContaining({ name: "pan", price: 10 })
    )
  })

  it("registra una venta completa y llama a orderService.create con items y pago", async () => {
    const deps = makeDeps()
    const result = await makeEngine(deps).run(input("vendo 2 cocacolas por efectivo"))

    expect(result.status).toBe("completed")
    expect(result.reply).toBe("Venta #ORD-001 registrada.")
    expect(deps.orderService.create).toHaveBeenCalledWith(
      ctx,
      expect.objectContaining({
        source: "pos",
        customerName: "Cliente sin registrar",
        items: [{ productId: "p1", quantity: 2 }],
        payments: [{ method: "cash", amount: 4, status: "verified" }],
      })
    )
  })

  it("registra un gasto con descripción, monto y categoría implícita", async () => {
    const deps = makeDeps()
    const result = await makeEngine(deps).run(input("registra un gasto de transporte 5 dolares"))

    expect(result.status).toBe("completed")
    expect(result.reply).toContain("$5.00")
    expect(deps.expenseService.create).toHaveBeenCalledWith(
      ctx,
      expect.objectContaining({ description: "transporte", amount: 5, category: "transporte" })
    )
  })

  it("consulta gastos del mes", async () => {
    const deps = makeDeps()
    const result = await makeEngine(deps).run(input("cuanto gaste este mes"))

    expect(result.status).toBe("completed")
    expect(deps.expenseService.list).toHaveBeenCalledWith(
      ctx,
      expect.objectContaining({ category: undefined, from: expect.any(String), to: expect.any(String) })
    )
  })

  it("crea un cliente usando el teléfono como dato mínimo", async () => {
    const deps = makeDeps()
    const result = await makeEngine(deps).run(input("crear un cliente con telefono 5551234"))

    expect(result.status).toBe("completed")
    expect(deps.toolExecutor.execute).toHaveBeenCalledWith(
      expect.anything(),
      "customers.create",
      expect.objectContaining({ phone: "5551234" })
    )
  })

  it("registra una compra a proveedor como gasto con vendor", async () => {
    const deps = makeDeps()
    const result = await makeEngine(deps).run(input("compre a mercantil 100 dolares"))

    expect(result.status).toBe("completed")
    expect(deps.expenseService.create).toHaveBeenCalledWith(
      ctx,
      expect.objectContaining({ vendor: "mercantil", amount: 100, category: "compras" })
    )
  })

  it("no ejecuta nada cuando un cambio de precio requiere confirmación", async () => {
    const deps = makeDeps()
    const result = await makeEngine(deps).run(input("cambiar precio de cocacola a 10"))

    expect(result.status).toBe("confirmation_required")
    expect(result.confirmation?.confirmCodes).toContain("confirm-cambiar_precio")
    expect(deps.toolExecutor.execute).not.toHaveBeenCalled()
  })

  it("ejecuta la confirmación al responder afirmativamente", async () => {
    const deps = makeDeps()
    const engine = makeEngine(deps)
    const t1 = await engine.run(input("cambiar precio de cocacola a 10"))
    expect(t1.status).toBe("confirmation_required")

    const t2 = await engine.run(
      input("sí", { actionId: t1.actionId, knownParams: t1.knownParams, status: "awaiting_confirmation", confirmed: t1.confirmation?.confirmCodes })
    )
    expect(t2.status).toBe("completed")
    expect(t2.reply).toBe("El precio quedó en $10.00.")
    expect(deps.toolExecutor.execute).toHaveBeenCalledWith(
      expect.anything(),
      "products.update",
      expect.objectContaining({ id: "p1", price: 10 })
    )
  })

  it("cancela la confirmación al responder negativamente", async () => {
    const deps = makeDeps()
    const engine = makeEngine(deps)
    const t1 = await engine.run(input("cambiar precio de cocacola a 10"))
    const t2 = await engine.run(
      input("mejor no", { actionId: t1.actionId, knownParams: t1.knownParams, status: "awaiting_confirmation", confirmed: t1.confirmation?.confirmCodes })
    )

    expect(t2.status).toBe("completed")
    expect(t2.reply).toMatch(/cancel/)
    expect(deps.toolExecutor.execute).not.toHaveBeenCalled()
  })

  it("repite la confirmación cuando la respuesta es ambigua", async () => {
    const deps = makeDeps()
    const engine = makeEngine(deps)
    const t1 = await engine.run(input("cambiar precio de cocacola a 10"))
    const t2 = await engine.run(
      input("quizas", { actionId: t1.actionId, knownParams: t1.knownParams, status: "awaiting_confirmation", confirmed: t1.confirmation?.confirmCodes })
    )

    expect(t2.status).toBe("confirmation_required")
    expect(deps.toolExecutor.execute).not.toHaveBeenCalled()
  })

  it("eliminar producto es destructivo: pide confirmación y borra solo al confirmar", async () => {
    const deps = makeDeps()
    const engine = makeEngine(deps)

    const t1 = await engine.run(input("elimina el producto cocacola"))
    expect(t1.status).toBe("confirmation_required")
    expect(deps.toolExecutor.execute).not.toHaveBeenCalled()

    const t2 = await engine.run(
      input("si, confirmo", { actionId: t1.actionId, knownParams: t1.knownParams, status: "awaiting_confirmation", confirmed: t1.confirmation?.confirmCodes })
    )
    expect(t2.status).toBe("completed")
    expect(deps.toolExecutor.execute).toHaveBeenCalledWith(expect.anything(), "products.delete", expect.objectContaining({ id: "p1" }))
  })

  it("un aumento de stock no pide confirmación pero una reducción sí", async () => {
    const deps = makeDeps()
    const engine = makeEngine(deps)

    const up = await engine.run(input("aumentar stock de cocacola en 5"))
    expect(up.status).toBe("completed")
    expect(deps.toolExecutor.execute).toHaveBeenCalledWith(
      expect.anything(),
      "inventory.updateStock",
      expect.objectContaining({ productId: "p1", type: "increase", quantity: 5 })
    )

    vi.clearAllMocks()
    const down = await engine.run(input("bajar stock de cocacola en 5"))
    expect(down.status).toBe("confirmation_required")
    expect(deps.toolExecutor.execute).not.toHaveBeenCalled()
  })

  it("recupera de un producto no encontrado y rellena la entidad en el reintento", async () => {
    const productService = {
      list: vi.fn(async (_ctx: unknown, opts: { q?: string }) =>
        opts?.q === "inexistente"
          ? { products: [], total: 0 }
          : { products: [{ id: "p1", name: "cocacola", price: 2, stock: 20 }], total: 1 }
      ),
    } as unknown as ProductService
    const deps = makeDeps({ productService })
    const engine = makeEngine(deps)

    const t1 = await engine.run(input("editar producto inexistente"))
    expect(t1.status).toBe("awaiting_retry")
    expect(t1.reply).toMatch(/no encontr/i)

    const t2 = await engine.run(input("pan", { actionId: t1.actionId, knownParams: t1.knownParams, status: "awaiting_retry" }))
    expect(t2.status).toBe("completed")
    expect(t2.knownParams).toMatchObject({ producto: "pan" })
    expect(deps.toolExecutor.execute).toHaveBeenCalledWith(expect.anything(), "products.update", expect.objectContaining({ id: "p1" }))
  })

  it("cambia de tema y reinicia el flujo", async () => {
    const deps = makeDeps()
    const engine = makeEngine(deps)

    const t1 = await engine.run(input("crear producto"))
    expect(t1.status).toBe("awaiting_details")

    const t2 = await engine.run(input("mejor registra un gasto de transporte 5 dolares", { actionId: t1.actionId, knownParams: t1.knownParams, status: t1.status }))
    expect(t2.status).toBe("completed")
    expect(t2.actionId).toBe("registrar_gasto")
    expect(deps.expenseService.create).toHaveBeenCalled()
  })

  it("registra un crédito multi-turno usando el cliente resuelto y un plazo por defecto", async () => {
    const deps = makeDeps()
    const engine = makeEngine(deps)

    const t1 = await engine.run(input("quiero fiarle a maria"))
    expect(t1.status).toBe("awaiting_details")
    expect(t1.pendingParams?.some((p) => p.key === "items")).toBe(true)

    const t2 = await engine.run(input("a maria", { actionId: t1.actionId, knownParams: t1.knownParams, status: "awaiting_details" }))
    expect(t2.status).toBe("awaiting_details")
    expect(t2.knownParams).toMatchObject({ cliente: "maria" })

    const t3 = await engine.run(input("2 cocacolas", { actionId: t2.actionId, knownParams: t2.knownParams, status: "awaiting_details" }))
    expect(t3.status).toBe("completed")
    expect(deps.orderService.create).toHaveBeenCalledWith(
      ctx,
      expect.objectContaining({
        customerName: "maria",
        customerPhone: "5551234",
        creditTerm: "cuotas_3_15d",
        items: [{ productId: "p1", quantity: 2 }],
      })
    )
  })

  it("responde el resumen del negocio usando los services a través de tools", async () => {
    const deps = makeDeps()
    const result = await makeEngine(deps).run(input("como va el negocio"))

    expect(result.status).toBe("completed")
    expect(deps.toolExecutor.execute).toHaveBeenCalledWith(expect.anything(), "analytics.businessSummary", {})
    expect(result.rich?.kind).toBe("summary")
  })
})
