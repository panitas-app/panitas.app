import { describe, expect, it, vi, beforeEach } from "vitest"
import { executeAction, ActionInputError, ActionExecutionError } from "@/lib/conversational-actions/executor"
import type { ExecutorDeps } from "@/lib/conversational-actions/executor"

const ctx = { storeId: "store-1", userId: "user-1", role: "admin", plan: "business", storeName: "Mi Tienda" }
const runtime = {
  userId: "user-1",
  storeId: "store-1",
  negocioId: null,
  plan: "business",
  role: "admin",
  permissions: ["product.create", "product.update", "product.delete", "inventory.write", "inventory.read", "sales.create", "customer.write", "order.read", "order.cancel", "report.read", "analytics.read", "expense.create", "expense.update", "supplier.pay", "credit.pay"],
}

function toolOk(data: unknown = {}) {
  return { success: true, data, error: null, metadata: {} }
}

function toolFail(error = "boom") {
  return { success: false, data: null, error, metadata: {} }
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
      update: vi.fn().mockResolvedValue({ id: "e1", amount: 9 }),
      remove: vi.fn().mockResolvedValue({ id: "e1" }),
    },
    salesService: {},
    creditService: {
      listByCustomer: vi.fn().mockResolvedValue([
        { orderId: "o1", orderNumber: "ORD-001", customerName: "maria", pending: 80, overdueDays: 5 },
      ]),
    },
    collectionService: {
      recommendations: vi.fn().mockResolvedValue([
        { orderId: "o1", orderNumber: "ORD-001", customerName: "maria", customerPhone: "5551234", customerId: "c1", pending: 80, overdueDays: 5, nextDueDate: null, daysSinceLastContact: null, attempts: 0, suggestedLevel: 2, suggestedCategory: "segundo_recordatorio" },
      ]),
      prepareReminder: vi.fn().mockResolvedValue({
        logId: "log1",
        orderId: "o1",
        orderNumber: "ORD-001",
        customerName: "maria",
        customerPhone: "5551234",
        customerId: "c1",
        category: "primer_recordatorio",
        templateName: "Recordatorio amistoso",
        level: 1,
        suggestedLevel: 1,
        overdueDays: 5,
        dueDate: null,
        pending: 80,
        message: "Hola maria, tu saldo es $80.00.",
        whatsappUrl: "https://wa.me/5551234?text=Hola",
      }),
    },
    supplierService: {
      list: vi.fn().mockResolvedValue({
        kpis: { totalPayable: 300, pendingInvoices: 3, overdueInvoices: 1, overdueAmount: 100, dueNext7Days: 100, paidThisMonth: 50, activeSuppliers: 1 },
        suppliers: [
          { id: "s1", name: "Mercantil", ruc: "", phone: "", email: "", category: "abarrotes", isActive: true, balance: 200, totalPurchased: 300, totalPaid: 100, pendingInvoices: 2, overdueInvoices: 1, nextDueDate: null, lastPurchaseAt: null, lastPaymentAt: null, state: "vencido", createdAt: new Date().toISOString() },
        ],
      }),
      registerPayment: vi.fn().mockResolvedValue({
        id: "s1", name: "Mercantil", ruc: "", phone: "", email: "", category: "abarrotes", address: "", notes: null, isActive: true, balance: 50, totalPurchased: 300, totalPaid: 250, pendingInvoices: 1, overdueInvoices: 0, nextDueDate: null, lastPurchaseAt: null, lastPaymentAt: null, state: "al_dia", createdAt: new Date().toISOString(), invoices: [], payments: [], timeline: [],
      }),
    },
    toolExecutor: { execute: vi.fn().mockResolvedValue(toolOk({})) },
    ...overrides,
  } as unknown as ExecutorDeps
}

function run(deps: ExecutorDeps, actionId: string, known: Record<string, string>) {
  return executeAction(deps, { actionId, known, message: "", ctx, runtime })
}

describe("executeAction", () => {
  beforeEach(() => vi.clearAllMocks())

  it("crea un producto mapeando a products.create", async () => {
    const deps = makeDeps()
    const res = await run(deps, "crear_producto", { nombre: "pan", precio: "3.50", stock: "12" })
    expect(deps.toolExecutor.execute).toHaveBeenCalledWith(
      expect.objectContaining({ permissions: expect.arrayContaining(["product.create"]) }),
      "products.create",
      expect.objectContaining({ name: "pan", price: 3.5, stock: 12 })
    )
    expect(res.reply).toBe('Listo, el producto "pan" quedó creado.')
    expect(res.rich?.kind).toBe("card")
  })

  it("lanza ActionInputError cuando falta el precio del producto", async () => {
    const deps = makeDeps()
    await expect(run(deps, "crear_producto", { nombre: "pan" })).rejects.toThrow(ActionInputError)
  })

  it("registra una venta con descuento porcentual y pago", async () => {
    const deps = makeDeps()
    const res = await run(deps, "registrar_venta", { items: JSON.stringify([{ producto: "cocacola", cantidad: 2 }]), descuento: "50%", metodo_pago: "cash" })
    const call = deps.orderService.create.mock.calls[0]
    expect(call[0]).toBe(ctx)
    expect(call[1]).toMatchObject({
      source: "pos",
      customerName: "Cliente sin registrar",
      items: [{ productId: "p1", quantity: 2, price: 1 }],
      payments: [{ method: "cash", amount: 2, status: "verified" }],
    })
    expect(res.reply).toContain("ORD-001")
  })

  it("registra una venta con cliente resuelto por nombre", async () => {
    const deps = makeDeps()
    await run(deps, "registrar_venta", { items: JSON.stringify([{ producto: "cocacola", cantidad: 1 }]), cliente: "maria" })
    const call = deps.orderService.create.mock.calls[0]
    expect(call[1]).toMatchObject({ customerName: "maria", customerPhone: "5551234" })
  })

  it("lanza ActionInputError si no hay items en la venta", async () => {
    const deps = makeDeps()
    await expect(run(deps, "registrar_venta", {})).rejects.toThrow(ActionInputError)
  })

  it("registra un gasto vía ExpenseService", async () => {
    const deps = makeDeps()
    const res = await run(deps, "registrar_gasto", { descripcion: "luz", monto: "80", categoria: "servicios" })
    expect(deps.expenseService.create).toHaveBeenCalledWith(ctx, expect.objectContaining({ description: "luz", amount: 80, category: "servicios" }))
    expect(res.reply).toContain("$80.00")
  })

  it("rechaza registrar_gasto sin permiso expense.create sin tocar BD", async () => {
    const deps = makeDeps()
    const restricted = { ...runtime, permissions: ["report.read"] }
    await expect(executeAction(deps, { actionId: "registrar_gasto", known: { descripcion: "luz", monto: "80" }, message: "", ctx, runtime: restricted })).rejects.toThrow(ActionExecutionError)
    expect(deps.expenseService.create).not.toHaveBeenCalled()
  })

  it("rechaza registrar_abono sin permiso credit.pay", async () => {
    const deps = makeDeps()
    const restricted = { ...runtime, permissions: ["report.read"] }
    await expect(executeAction(deps, { actionId: "registrar_abono", known: { cliente: "maria", monto: "20" }, message: "", ctx, runtime: restricted })).rejects.toThrow(ActionExecutionError)
  })

  it("registra una compra a proveedor con vendor", async () => {
    const deps = makeDeps()
    const res = await run(deps, "registrar_compra_proveedor", { vendor: "mercantil", monto: "150", metodo_pago: "transfer" })
    expect(deps.expenseService.create).toHaveBeenCalledWith(ctx, expect.objectContaining({ vendor: "mercantil", amount: 150, category: "compras", paymentMethod: "transfer" }))
    expect(res.reply).toContain("mercantil")
  })

  it("edita un gasto resolviéndolo por descripción", async () => {
    const deps = makeDeps({
      expenseService: {
        ...makeDeps().expenseService,
        getById: vi.fn().mockResolvedValue(null),
        list: vi.fn().mockResolvedValue({ expenses: [{ id: "e9", description: "transporte", amount: 4 }], total: 1 }),
        update: vi.fn().mockResolvedValue({ id: "e9", amount: 9 }),
      },
    })
    const res = await run(deps, "editar_gasto", { gasto: "transporte", monto: "9" })
    expect(deps.expenseService.update).toHaveBeenCalledWith(ctx, "e9", expect.objectContaining({ amount: 9 }))
    expect(res.reply).toBe("El gasto quedó actualizado.")
  })

  it("cancela un pedido mapeando a orders.updateStatus", async () => {
    const deps = makeDeps()
    const res = await run(deps, "cancelar_pedido", { pedido: "ORD-001" })
    expect(deps.toolExecutor.execute).toHaveBeenCalledWith(expect.anything(), "orders.updateStatus", expect.objectContaining({ id: "o1", status: "cancelled" }))
    expect(res.reply).toContain("cancelado")
  })

  it("buscar_producto extrae productos del shape {products, total} que devuelve productService.list", async () => {
    const deps = makeDeps()
    deps.toolExecutor.execute = vi.fn().mockResolvedValue(
      toolOk({ products: [{ id: "p1", name: "cocacola", price: 2, stock: 20 }], total: 1 })
    )
    const res = await run(deps, "buscar_producto", { termino: "pan" })
    expect(res.reply).toBe("Encontré 1 producto(s).")
    expect(res.rich?.kind).toBe("table")
  })

  it("buscar_producto no devuelve resultados cuando la tool responde array vacío", async () => {
    const deps = makeDeps()
    deps.toolExecutor.execute = vi.fn().mockResolvedValue(toolOk({ products: [], total: 0 }))
    const res = await run(deps, "buscar_producto", { termino: "pan" })
    expect(res.reply).toBe("No encontré productos para esa búsqueda.")
  })

  it("buscar_producto soporta tool que responde array directo", async () => {
    const deps = makeDeps()
    deps.toolExecutor.execute = vi.fn().mockResolvedValue(toolOk([{ id: "p1", name: "cocacola", price: 2, stock: 20 }]))
    const res = await run(deps, "buscar_producto", { termino: "pan" })
    expect(res.reply).toBe("Encontré 1 producto(s).")
  })

  it("traduce el fallo de una tool a ActionExecutionError", async () => {
    const deps = makeDeps({
      toolExecutor: { execute: vi.fn().mockResolvedValue(toolFail("No tienes permiso")) },
    })
    await expect(run(deps, "buscar_producto", { termino: "pan" })).rejects.toThrow(ActionExecutionError)
  })

  it("no expone el nombre de la tool en el mensaje de error", async () => {
    const deps = makeDeps({
      toolExecutor: { execute: vi.fn().mockResolvedValue(toolFail("error interno")) },
    })
    try {
      await run(deps, "buscar_producto", { termino: "pan" })
      expect.unreachable()
    } catch (err) {
      expect(err).toBeInstanceOf(ActionExecutionError)
      expect(String((err as Error).message)).not.toMatch(/products\.create|searchProduct|inventory\./)
    }
  })

  it("contactar_hoy devuelve recomendaciones de contacto", async () => {
    const deps = makeDeps()
    const res = await run(deps, "contactar_hoy", {})
    expect(deps.collectionService.recommendations).toHaveBeenCalledWith(ctx, { limit: 10 })
    expect(res.reply).toContain("maria")
    expect(res.reply).toContain("1")
    expect(res.rich?.kind).toBe("summary")
  })

  it("sin_recordatorio solo devuelve créditos nunca contactados", async () => {
    const deps = makeDeps({
      collectionService: {
        ...makeDeps().collectionService,
        recommendations: vi.fn().mockResolvedValue([
          { orderId: "o1", orderNumber: "ORD-001", customerName: "maria", customerPhone: "5551234", customerId: "c1", pending: 80, overdueDays: 5, nextDueDate: null, daysSinceLastContact: 2, attempts: 1, suggestedLevel: 2, suggestedCategory: "segundo_recordatorio" },
          { orderId: "o2", orderNumber: "ORD-002", customerName: "ana", customerPhone: "5555678", customerId: "c2", pending: 40, overdueDays: 0, nextDueDate: null, daysSinceLastContact: null, attempts: 0, suggestedLevel: 1, suggestedCategory: "primer_recordatorio" },
        ]),
      },
    })
    const res = await run(deps, "sin_recordatorio", {})
    expect(res.data.payload).toHaveLength(1)
    expect(res.data.payload[0].customerName).toBe("ana")
    expect(res.reply).toContain("1")
  })

  it("creditos_dos_intentos filtra créditos con 2 o más intentos", async () => {
    const deps = makeDeps({
      collectionService: {
        ...makeDeps().collectionService,
        recommendations: vi.fn().mockResolvedValue([
          { orderId: "o1", orderNumber: "ORD-001", customerName: "maria", customerPhone: "5551234", customerId: "c1", pending: 80, overdueDays: 9, nextDueDate: null, daysSinceLastContact: 4, attempts: 3, suggestedLevel: 3, suggestedCategory: "ultimo_aviso" },
          { orderId: "o2", orderNumber: "ORD-002", customerName: "ana", customerPhone: "5555678", customerId: "c2", pending: 40, overdueDays: 0, nextDueDate: null, daysSinceLastContact: null, attempts: 0, suggestedLevel: 1, suggestedCategory: "primer_recordatorio" },
        ]),
      },
    })
    const res = await run(deps, "creditos_dos_intentos", {})
    expect(res.data.payload).toHaveLength(1)
    expect(res.data.payload[0].customerName).toBe("maria")
    expect(res.reply).toContain("1")
  })

  it("preparar_aviso prepara un recordatorio sin enviarlo", async () => {
    const deps = makeDeps()
    const res = await run(deps, "preparar_aviso", { cliente: "maria" })
    expect(deps.collectionService.prepareReminder).toHaveBeenCalledWith(
      ctx,
      expect.objectContaining({ orderId: "o1", category: undefined, channel: "whatsapp" })
    )
    expect(res.data.title).toBe("Recordatorio preparado")
    expect(res.reply).toContain("no lo envié")
  })

  it("preparar_aviso mapea el tipo a la categoría", async () => {
    const deps = makeDeps()
    await run(deps, "preparar_aviso", { cliente: "maria", tipo: "segundo recordatorio" })
    const call = deps.collectionService.prepareReminder.mock.calls[0]
    expect(call[1].category).toBe("segundo_recordatorio")
  })

  it("preparar_aviso lanza ActionInputError sin cliente", async () => {
    const deps = makeDeps()
    await expect(run(deps, "preparar_aviso", {})).rejects.toThrow(ActionInputError)
  })

  it("preparar_aviso lanza ActionInputError si el cliente no existe", async () => {
    const deps = makeDeps({
      customerService: { list: vi.fn().mockResolvedValue({ customers: [], total: 0 }) },
    })
    await expect(run(deps, "preparar_aviso", { cliente: "nadie" })).rejects.toThrow(ActionInputError)
  })

  // ─── Proveedores / Cuentas por pagar (FASE 6C) ──────────────────────────

  it("deuda_total resume el total pendiente con proveedores", async () => {
    const deps = makeDeps()
    const res = await run(deps, "deuda_total", {})
    expect(deps.supplierService.list).toHaveBeenCalledWith(ctx, { status: "all", limit: 100 })
    expect(res.reply).toContain("$300.00")
    expect(res.reply).toContain("3 factura(s)")
    expect(res.rich?.kind).toBe("summary")
    expect(res.data.payload.kpis.totalPayable).toBe(300)
  })

  it("pagar_esta_semana consulta proveedores por vencer", async () => {
    const deps = makeDeps()
    const res = await run(deps, "pagar_esta_semana", {})
    expect(deps.supplierService.list).toHaveBeenCalledWith(ctx, { status: "por_vencer", limit: 100 })
    expect(res.reply).toContain("por vencer esta semana")
    expect(res.reply).toContain("$100.00")
  })

  it("pagar_esta_semana responde positivo sin pagos por vencer", async () => {
    const deps = makeDeps({
      supplierService: {
        ...makeDeps().supplierService,
        list: vi.fn().mockResolvedValue({ kpis: { totalPayable: 0, pendingInvoices: 0, overdueInvoices: 0, overdueAmount: 0, dueNext7Days: 0, paidThisMonth: 0, activeSuppliers: 0 }, suppliers: [] }),
      },
    })
    const res = await run(deps, "pagar_esta_semana", {})
    expect(res.reply).toContain("No tienes pagos por vencer")
  })

  it("registrar_pago_proveedor aplica el pago y responde el saldo restante", async () => {
    const deps = makeDeps()
    const res = await run(deps, "registrar_pago_proveedor", { vendor: "mercantil", monto: "150", metodo_pago: "transfer" })
    expect(deps.supplierService.list).toHaveBeenCalledWith(ctx, expect.objectContaining({ search: "mercantil" }))
    expect(deps.supplierService.registerPayment).toHaveBeenCalledWith(
      ctx,
      expect.objectContaining({ supplierId: "s1", amount: 150, paymentMethod: "transfer" })
    )
    expect(res.reply).toContain("Pago de $150.00 registrado a Mercantil")
    expect(res.reply).toContain("$50.00")
    expect(res.rich?.kind).toBe("card")
  })

  it("registrar_pago_proveedor lanza ActionInputError sin proveedor", async () => {
    const deps = makeDeps()
    await expect(run(deps, "registrar_pago_proveedor", { monto: "50" })).rejects.toThrow(ActionInputError)
  })

  it("registrar_pago_proveedor lanza ActionInputError si el proveedor no existe", async () => {
    const deps = makeDeps({
      supplierService: {
        ...makeDeps().supplierService,
        list: vi.fn().mockResolvedValue({ kpis: { totalPayable: 0, pendingInvoices: 0, overdueInvoices: 0, overdueAmount: 0, dueNext7Days: 0, paidThisMonth: 0, activeSuppliers: 0 }, suppliers: [] }),
      },
    })
    await expect(run(deps, "registrar_pago_proveedor", { vendor: "nadie", monto: "50" })).rejects.toThrow(ActionInputError)
  })

  it("facturas_vencidas lista proveedores con vencimientos atrasados", async () => {
    const deps = makeDeps()
    const res = await run(deps, "facturas_vencidas", {})
    expect(deps.supplierService.list).toHaveBeenCalledWith(ctx, { status: "vencido", limit: 100 })
    expect(res.reply).toContain("1 factura(s) vencida(s)")
    expect(res.reply).toContain("$100.00")
  })

  it("facturas_vencidas responde positivo sin vencidas", async () => {
    const deps = makeDeps({
      supplierService: {
        ...makeDeps().supplierService,
        list: vi.fn().mockResolvedValue({ kpis: { totalPayable: 0, pendingInvoices: 0, overdueInvoices: 0, overdueAmount: 0, dueNext7Days: 0, paidThisMonth: 0, activeSuppliers: 0 }, suppliers: [] }),
      },
    })
    const res = await run(deps, "facturas_vencidas", {})
    expect(res.reply).toContain("No tienes facturas de proveedores vencidas")
  })

  it("mayor_deuda ordena por saldo y nombra al proveedor líder", async () => {
    const deps = makeDeps()
    const res = await run(deps, "mayor_deuda", {})
    expect(res.reply).toContain("Mercantil encabeza la deuda")
    expect(res.reply).toContain("$200.00")
  })
})
