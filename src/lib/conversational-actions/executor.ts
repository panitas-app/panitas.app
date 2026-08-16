/**
 * Executor del Conversational Actions Engine (FASE 5D).
 *
 * Convierte una acción + parámetros en una ejecución concreta:
 *   - acciones respaldadas por tools 3B → las ejecuta vía `ToolExecutor`,
 *   - acciones sin tool (ventas, gastos, proveedores) → llama a los services 1B
 *     directamente (NUNCA crea tools nuevas en el registro 3B).
 *
 * Resuelve entidades (producto/cliente/pedido por nombre o referencia),
 * valida los datos y produce `ActionResultData` para el renderizado rico.
 */
import type { StoreServiceContext } from "@/services/context"
import type { ProductService } from "@/services/product.service"
import type { CustomerService } from "@/services/customer.service"
import type { OrderService } from "@/services/order.service"
import type { ExpenseService } from "@/services/expense.service"
import type { SalesService } from "@/services/sales.service"
import type { CreditService, CreditSummary } from "@/services/credit.service"
import type { CollectionService, CollectionTemplateCategory } from "@/services/collection.service"
import type { SupplierService, SupplierSummary } from "@/services/supplier.service"
import type { FinancialEngine } from "@/lib/financial-intelligence"
import { periodRange } from "@/lib/financial-intelligence"
import type { ToolExecutor } from "@/lib/agent/tools"
import type { ToolExecutionContext } from "@/lib/agent/tools/types"
import { hasPermission } from "@/lib/agent/permissions"
import type { AgentPermission } from "@/lib/agent/permissions"
import type { ActionResultData, ActionRuntimeContext, KnownParams, RichBlock } from "./types"
import { extractPaymentMethod, extractDiscount } from "./params"
import { money, productCard, productsTable, saleSummary, expenseCard, expensesTable, expensesSummary, customerCard, customersTable, customerHistory, ordersTable, orderCard, salesSummary, salesOverviewSummary, kpiBlock, chartBlock, monitorBlock, creditsSummary, creditCard, creditsList, creditsTable, collectionRecommendationsList, suppliersSummary, suppliersList, suppliersTable, supplierCard, financialHealthBlocks, financialReviewBlocks, financialCobrarVsPagarBlocks, financialTopDebtorsBlock, financialTopPayablesBlock, financialGastosBlocks } from "./rich"
import type { RichResponse } from "./types"
import { productActions, customerActions, expenseActions, vendorActions, saleActions } from "@/lib/conversational/action-factories"

export class ActionInputError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "ActionInputError"
  }
}

export class ActionExecutionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "ActionExecutionError"
  }
}

export interface ExecutorDeps {
  productService: ProductService
  customerService: CustomerService
  orderService: OrderService
  expenseService: ExpenseService
  salesService: SalesService
  creditService: CreditService
  collectionService: CollectionService
  supplierService: SupplierService
  financialService: FinancialEngine
  toolExecutor: ToolExecutor
}

export interface ExecutionResult {
  data: ActionResultData
  rich: RichResponse
  /** Respuesta corta en lenguaje natural (para el reply). */
  reply: string
}

export interface ExecutorInput {
  actionId: string
  known: KnownParams
  message: string
  ctx: StoreServiceContext
  runtime: ActionRuntimeContext
}

function toToolContext(ctx: StoreServiceContext, runtime: ActionRuntimeContext): ToolExecutionContext {
  return {
    userId: runtime.userId ?? ctx.userId,
    storeId: runtime.storeId ?? ctx.storeId,
    negocioId: runtime.negocioId ?? ctx.negocioId ?? null,
    plan: runtime.plan ?? ctx.plan ?? "business",
    role: runtime.role ?? ctx.role ?? "admin",
    permissions: (runtime.permissions ?? []) as ToolExecutionContext["permissions"],
    metadata: { storeName: ctx.storeName },
  }
}

function num(value: string | undefined): number | null {
  if (!value) return null
  const n = parseFloat(value.replace(",", "."))
  return Number.isFinite(n) ? n : null
}

/** Resuelve un producto por nombre; devuelve el id o lista de candidatos. */
async function resolveProduct(deps: ExecutorDeps, ctx: StoreServiceContext, name: string): Promise<{ id: string }> {
  const { products } = await deps.productService.list(ctx, { q: name, take: 5 })
  if (!products || products.length === 0) {
    throw new ActionInputError(`No encontré un producto llamado "${name}". ¿Puedes revisar el nombre?`)
  }
  const exact = products.find((p) => p.name.toLowerCase() === name.toLowerCase())
  if (exact) return { id: exact.id }
  if (products.length === 1) return { id: products[0].id }
  throw new ActionInputError(
    `Encontré varios productos parecidos a "${name}": ${products.map((p) => `"${p.name}"`).join(", ")}. Escribe cuál es.`
  )
}

/** Resuelve un cliente por nombre o teléfono. */
async function resolveCustomer(deps: ExecutorDeps, ctx: StoreServiceContext, ref: string): Promise<{ id: string; name: string; phone: string }> {
  const isPhone = /^\+?\d{7,15}$/.test(ref.trim())
  const { customers } = await deps.customerService.list(ctx, { q: ref.trim(), take: 5 })
  if (!customers || customers.length === 0) {
    throw new ActionInputError(`No encontré un cliente llamado "${ref}". Puedes crearlo primero.`)
  }
  const exact = customers.find((c) => c.name.toLowerCase() === ref.trim().toLowerCase() || (isPhone && c.phone === ref.trim()))
  const chosen = exact ?? (customers.length === 1 ? customers[0] : null)
  if (!chosen) {
    throw new ActionInputError(`Encontré varios clientes parecidos a "${ref}": ${customers.map((c) => `"${c.name}"`).join(", ")}. Escribe cuál es.`)
  }
  return { id: chosen.id, name: chosen.name, phone: chosen.phone }
}

/** Resuelve un pedido por ID o número de orden. */
async function resolveOrder(deps: ExecutorDeps, ctx: StoreServiceContext, ref: string): Promise<string> {
  const trimmed = ref.trim()
  try {
    const byId = await deps.orderService.getById(ctx, trimmed)
    if (byId) return byId.id
  } catch {
    // se intenta por número de orden
  }
  const { orders } = await deps.orderService.list(ctx, { take: 20 })
  const found = orders.find((o) => o.orderNumber === trimmed || (o.orderNumber ?? "").includes(trimmed)) ?? orders[0]
  if (!found) throw new ActionInputError(`No encontré un pedido con la referencia "${trimmed}".`)
  return found.id
}

/** Resuelve un gasto por descripción o ID. */
async function resolveExpense(deps: ExecutorDeps, ctx: StoreServiceContext, ref: string): Promise<string> {
  try {
    const byId = await deps.expenseService.getById(ctx, ref.trim())
    if (byId) return byId.id
  } catch {
    // se intenta por descripción
  }
  const { expenses } = await deps.expenseService.list(ctx, { search: ref.trim(), take: 5 })
  const found = expenses[0]
  if (!found) throw new ActionInputError(`No encontré un gasto que diga "${ref}".`)
  return found.id
}

function periodToRange(period: string | undefined): { from?: string; to?: string } {
  if (!period) return {}
  const now = new Date()
  const start = (d: Date) => {
    const copy = new Date(d)
    copy.setHours(0, 0, 0, 0)
    return copy
  }
  const end = (d: Date) => {
    const copy = new Date(d)
    copy.setHours(23, 59, 59, 999)
    return copy
  }
  const day = new Date(now)
  switch (period) {
    case "hoy":
      return { from: start(day).toISOString(), to: end(day).toISOString() }
    case "ayer": {
      const prev = new Date(now)
      prev.setDate(prev.getDate() - 1)
      return { from: start(prev).toISOString(), to: end(prev).toISOString() }
    }
    case "esta_semana": {
      const monday = start(now)
      const dow = (monday.getDay() + 6) % 7
      monday.setDate(monday.getDate() - dow)
      const sunday = end(new Date(monday))
      sunday.setDate(monday.getDate() + 6)
      return { from: monday.toISOString(), to: sunday.toISOString() }
    }
    case "semana_pasada": {
      const monday = start(now)
      const dow = (monday.getDay() + 6) % 7
      monday.setDate(monday.getDate() - dow - 7)
      const sunday = end(new Date(monday))
      sunday.setDate(monday.getDate() + 6)
      return { from: monday.toISOString(), to: sunday.toISOString() }
    }
    case "este_mes": {
      const first = start(now)
      first.setDate(1)
      return { from: first.toISOString(), to: end(now).toISOString() }
    }
    case "mes_pasado": {
      const first = start(now)
      first.setDate(1)
      first.setMonth(first.getMonth() - 1)
      const last = end(new Date(first))
      last.setMonth(first.getMonth() + 1, 0)
      return { from: first.toISOString(), to: last.toISOString() }
    }
    default: {
      const date = new Date(period)
      if (Number.isNaN(date.getTime())) return {}
      return { from: start(date).toISOString(), to: end(date).toISOString() }
    }
  }
}

async function runTool(
  deps: ExecutorDeps,
  ctx: StoreServiceContext,
  runtime: ActionRuntimeContext,
  name: string,
  input: Record<string, unknown>
): Promise<unknown> {
  const result = await deps.toolExecutor.execute(toToolContext(ctx, runtime), name, input)
  if (!result.success) {
    throw new ActionExecutionError(result.error ?? "No pude completar la acción.")
  }
  return result.data
}

/** Prepara items de una venta: resuelve productos y precios de lista. */
async function buildSaleItems(
  deps: ExecutorDeps,
  ctx: StoreServiceContext,
  items: Array<{ producto: string; cantidad: number }>
): Promise<Array<{ productId: string; quantity: number; name: string; retail: number }>> {
  const out: Array<{ productId: string; quantity: number; name: string; retail: number }> = []
  for (const item of items) {
    if (!item.producto || !item.cantidad || item.cantidad <= 0) continue
    const { id } = await resolveProduct(deps, ctx, item.producto)
    const { products } = await deps.productService.list(ctx, { q: item.producto, take: 5 })
    const product = products.find((p) => p.id === id)
    out.push({ productId: id, quantity: item.cantidad, name: product?.name ?? item.producto, retail: product?.price ?? 0 })
  }
  if (out.length === 0) throw new ActionInputError("No pude identificar los productos de la venta.")
  return out
}

function toRichCredit(c: CreditSummary): import("./rich").RichCredit {
  return {
    customerName: c.customerName,
    orderNumber: c.orderNumber,
    pending: c.pending,
    paidPercent: Math.round(c.paidPercent),
    state: c.state,
    nextDueDate: c.nextDueDate,
    overdueDays: c.overdueDays,
  }
}

/** Resuelve el crédito activo de un cliente (el que tiene saldo pendiente). */
async function resolveCreditByCustomer(deps: ExecutorDeps, ctx: StoreServiceContext, ref: string): Promise<CreditSummary> {
  const customer = await resolveCustomer(deps, ctx, ref)
  const credits = await deps.creditService.listByCustomer(ctx, customer.id)
  if (credits.length === 0) {
    throw new ActionInputError(`El cliente ${customer.name} no tiene créditos activos con saldo pendiente.`)
  }
  return credits[0]
}

/** Registra un abono a un crédito desde el agente. */
async function registerCreditPayment(deps: ExecutorDeps, ctx: StoreServiceContext, ref: string, amount: number, method?: string): Promise<{ credit: CreditSummary; payment: unknown }> {
  const credit = await resolveCreditByCustomer(deps, ctx, ref)
  const payment = await deps.creditService.registerPayment(ctx, {
    orderId: credit.orderId,
    amount,
    method: method ?? "cash",
    notes: "Abono registrado por el asistente",
  })
  return { credit, payment }
}

function toRichSupplier(s: SupplierSummary): import("./rich").RichSupplier {
  return {
    name: s.name,
    balance: s.balance,
    totalPurchased: s.totalPurchased,
    totalPaid: s.totalPaid,
    pendingInvoices: s.pendingInvoices,
    overdueInvoices: s.overdueInvoices,
    nextDueDate: s.nextDueDate,
    category: s.category || null,
    state: s.state,
  }
}

/** Resuelve un proveedor por nombre o RIF. */
async function resolveSupplier(deps: ExecutorDeps, ctx: StoreServiceContext, ref: string): Promise<SupplierSummary> {
  const trimmed = ref.trim()
  const { suppliers } = await deps.supplierService.list(ctx, { search: trimmed, limit: 10 })
  if (!suppliers || suppliers.length === 0) {
    throw new ActionInputError(`No encontré un proveedor llamado "${trimmed}". Puedes registrarlo primero en el Centro de Proveedores.`)
  }
  const exact = suppliers.find((s) => s.name.toLowerCase() === trimmed.toLowerCase() || (s.ruc && s.ruc.toLowerCase() === trimmed.toLowerCase()))
  const chosen = exact ?? (suppliers.length === 1 ? suppliers[0] : null)
  if (!chosen) {
    throw new ActionInputError(`Encontré varios proveedores parecidos a "${trimmed}": ${suppliers.map((s) => `"${s.name}"`).join(", ")}. Escribe cuál es.`)
  }
  return chosen
}

/**
 * Acciones de escritura que NO pasan por el ToolExecutor (llaman services 1B
 * directamente): exigen el permiso correspondiente ANTES de tocar la BD.
 */
const ACTION_REQUIRED_PERMISSIONS: Partial<Record<string, AgentPermission>> = {
  registrar_venta: "sales.create",
  registrar_credito: "sales.create",
  registrar_gasto: "expense.create",
  editar_gasto: "expense.update",
  registrar_compra_proveedor: "expense.create",
  registrar_pago_proveedor: "supplier.pay",
  registrar_abono: "credit.pay",
}

/** Ejecuta una acción con sus parámetros. */
export async function executeAction(deps: ExecutorDeps, input: ExecutorInput): Promise<ExecutionResult> {
  const { actionId, known, ctx, runtime } = input

  const requiredPermission = ACTION_REQUIRED_PERMISSIONS[actionId]
  if (requiredPermission && !hasPermission((runtime.permissions as AgentPermission[]) ?? [], requiredPermission)) {
    throw new ActionExecutionError("No tienes permisos para realizar esta acción.")
  }

  switch (actionId) {
    // ─── Inventario / Productos ───────────────────────────────────────────
    case "crear_producto": {
      const name = known.nombre
      const price = num(known.precio)
      if (!name || price === null) throw new ActionInputError("Falta el nombre o el precio del producto.")
      const product = await runTool(deps, ctx, runtime, "products.create", {
        name,
        price,
        stock: num(known.stock) ?? 0,
        ...(known.descripcion ? { description: known.descripcion } : {}),
      })
      return {
        data: { title: "Producto creado", payload: product },
        rich: productCard(product as Parameters<typeof productCard>[0], { actions: productActions(name) }),
        reply: `Listo, el producto "${name}" quedó creado.`,
      }
    }

    case "editar_producto": {
      const { id } = await resolveProduct(deps, ctx, known.producto)
      const body: Record<string, unknown> = { id }
      if (known.nombre) body.name = known.nombre
      if (known.precio !== undefined) {
        const price = num(known.precio)
        if (price === null) throw new ActionInputError("El precio no es válido.")
        body.price = price
      }
      if (known.descripcion) body.description = known.descripcion
      const product = await runTool(deps, ctx, runtime, "products.update", body)
      return {
        data: { title: "Producto actualizado", payload: product },
        rich: productCard(product as Parameters<typeof productCard>[0], { actions: productActions(String((product as { name?: string }).name ?? known.nombre ?? "")) }),
        reply: "El producto quedó actualizado.",
      }
    }

    case "cambiar_precio": {
      const { id } = await resolveProduct(deps, ctx, known.producto)
      const price = num(known.precio)
      if (price === null) throw new ActionInputError("El precio no es válido.")
      const product = await runTool(deps, ctx, runtime, "products.update", { id, price })
      return {
        data: { title: "Precio actualizado", payload: product },
        rich: productCard(product as Parameters<typeof productCard>[0], { actions: productActions(String((product as { name?: string }).name ?? known.producto)) }),
        reply: `El precio quedó en ${money(price)}.`,
      }
    }

    case "ajustar_stock": {
      const { id } = await resolveProduct(deps, ctx, known.producto)
      const quantity = num(known.cantidad)
      if (quantity === null || quantity <= 0) throw new ActionInputError("La cantidad no es válida.")
      const type = (known.tipo as "increase" | "decrease" | "adjustment") ?? "adjustment"
      const movement = await runTool(deps, ctx, runtime, "inventory.updateStock", {
        productId: id,
        type,
        quantity,
        concept: "Ajuste desde el asistente",
      })
      return {
        data: { title: "Stock actualizado", payload: movement },
        rich: productCard(movement as Parameters<typeof productCard>[0], { actions: productActions(known.producto), lowStock: type === "decrease" }),
        reply: "El stock quedó actualizado.",
      }
    }

    case "eliminar_producto": {
      const { id } = await resolveProduct(deps, ctx, known.producto)
      await runTool(deps, ctx, runtime, "products.delete", { id })
      return {
        data: { title: "Producto eliminado", payload: null },
        rich: { kind: "card", title: "Producto eliminado", blocks: [{ kind: "text", text: `El producto "${known.producto}" fue eliminado.` }] },
        reply: `El producto "${known.producto}" fue eliminado.`,
      }
    }

    case "buscar_producto": {
      const result = await runTool(deps, ctx, runtime, "inventory.searchProduct", { q: known.termino, take: 10 })
      const list = Array.isArray(result)
        ? result
        : Array.isArray((result as { products?: unknown[] })?.products)
          ? (result as { products: unknown[] }).products
          : []
      return {
        data: { title: "Búsqueda de productos", payload: list },
        rich: list.length > 0 ? productsTable(list) : { kind: "card", title: "Sin resultados", blocks: [{ kind: "text", text: "No encontré productos para esa búsqueda." }] },
        reply: list.length > 0 ? `Encontré ${list.length} producto(s).` : "No encontré productos para esa búsqueda.",
      }
    }

    // ─── Ventas ───────────────────────────────────────────────────────────
    case "registrar_venta":
    case "registrar_credito": {
      let items: Array<{ producto: string; cantidad: number }> = []
      try {
        items = known.items ? (JSON.parse(known.items) as Array<{ producto: string; cantidad: number }>) : []
      } catch {
        items = []
      }
      if (items.length === 0) throw new ActionInputError("No pude identificar los productos vendidos.")
      const resolved = await buildSaleItems(deps, ctx, items)

      // Precio de lista (el servidor re-valida; el descuento se aplica por unidad).
      const subtotal = resolved.reduce((s, i) => s + i.retail * i.quantity, 0)
      let discountAmount = 0
      const discountValue = known.descuento
      if (discountValue) {
        if (discountValue.endsWith("%")) {
          const pct = parseFloat(discountValue.replace("%", ""))
          discountAmount = (subtotal * pct) / 100
        } else {
          discountAmount = parseFloat(discountValue) || 0
        }
      }
      const expectedTotal = Math.max(0, subtotal - discountAmount)

      // Cliente: teléfono o nombre.
      let customerPhone: string | undefined
      let customerName = "Cliente sin registrar"
      if (known.telefono) {
        customerPhone = known.telefono
        if (known.nombre) customerName = known.nombre
      } else if (known.cliente) {
        try {
          const customer = await resolveCustomer(deps, ctx, known.cliente)
          customerPhone = customer.phone
          customerName = customer.name
        } catch {
          customerPhone = undefined
        }
      }

      const isCredit = actionId === "registrar_credito" || Boolean(known.credito)
      const creditTerm = known.credito ?? "cuotas_3_15d"

      const order = await deps.orderService.create(ctx, {
        source: "pos",
        items: resolved.map((i): { productId: string; quantity: string | number; price?: string | number } => {
          if (discountValue && subtotal > 0) {
            const unitDiscount = (discountAmount / subtotal) * i.retail
            const unitPrice = Number((i.retail - unitDiscount).toFixed(2))
            if (unitPrice > 0) return { productId: i.productId, quantity: i.quantity, price: unitPrice }
          }
          return { productId: i.productId, quantity: i.quantity }
        }),
        customerName,
        ...(customerPhone ? { customerPhone } : {}),
        ...(isCredit ? { creditTerm } : {}),
        ...(known.metodo_pago && !isCredit
          ? { payments: [{ method: known.metodo_pago, amount: Number(expectedTotal.toFixed(2)), status: "verified" }] }
          : {}),
      })

      return {
        data: { title: "Venta registrada", payload: order },
        rich: saleSummary(order as Parameters<typeof saleSummary>[0]),
        reply: `Venta #${(order as { orderNumber?: string }).orderNumber} registrada.`,
      }
    }

    case "ver_ventas": {
      if (known.fecha) {
        const { from, to } = periodToRange(known.fecha)
        const data = await runTool(deps, ctx, runtime, "reports.sales", { from, to })
        return {
          data: { title: "Reporte de ventas", payload: data },
          rich: salesSummary(data as Parameters<typeof salesSummary>[0]),
          reply: "Aquí tienes el resumen de ventas.",
        }
      }
      const data = await runTool(deps, ctx, runtime, "sales.getTodaySummary", {})
      return {
        data: { title: "Resumen de ventas", payload: data },
        rich: salesOverviewSummary(data as Record<string, unknown>),
        reply: "Aquí tienes el resumen de ventas.",
      }
    }

    // ─── Clientes ─────────────────────────────────────────────────────────
    case "crear_cliente": {
      const result = await runTool(deps, ctx, runtime, "customers.create", {
        phone: known.telefono,
        ...(known.nombre ? { name: known.nombre } : {}),
        ...(known.email ? { email: known.email } : {}),
      })
      const payload = result as { customer?: Record<string, unknown>; created?: boolean }
      const customer = payload.customer ?? (payload as Record<string, unknown>)
      return {
        data: { title: "Cliente listo", payload: customer },
        rich: customerCard(customer as Parameters<typeof customerCard>[0], { actions: customerActions(String(customer.name ?? known.nombre ?? "cliente")) }),
        reply: payload.created ? "Cliente creado correctamente." : "Ese cliente ya existía.",
      }
    }

    case "ver_historial_cliente": {
      const customer = await resolveCustomer(deps, ctx, known.cliente)
      const history = await runTool(deps, ctx, runtime, "customers.getHistory", { customerId: customer.id, take: 10 })
      const orders = (history as { orders?: Array<Record<string, unknown>> }).orders ?? []
      return {
        data: { title: "Historial del cliente", payload: history },
        rich: customerHistory({ name: customer.name }, orders as Parameters<typeof customerHistory>[1]),
        reply: `El cliente ${customer.name} tiene ${orders.length} pedido(s) en el historial.`,
      }
    }

    case "buscar_cliente": {
      const customers = await runTool(deps, ctx, runtime, "customers.search", { q: known.termino, take: 10 })
      const list = Array.isArray(customers) ? customers : []
      return {
        data: { title: "Búsqueda de clientes", payload: list },
        rich: list.length > 0 ? customersTable(list) : { kind: "card", title: "Sin resultados", blocks: [{ kind: "text", text: "No encontré clientes para esa búsqueda." }] },
        reply: list.length > 0 ? `Encontré ${list.length} cliente(s).` : "No encontré clientes para esa búsqueda.",
      }
    }

    // ─── Gastos ───────────────────────────────────────────────────────────
    case "registrar_gasto": {
      const monto = num(known.monto)
      if (monto === null || monto <= 0) throw new ActionInputError("El monto del gasto no es válido.")
      const expense = await deps.expenseService.create(ctx, {
        description: known.descripcion || known.categoria || "Gasto",
        amount: monto,
        category: known.categoria || "otros",
        ...(known.vendor ? { vendor: known.vendor } : {}),
        ...(known.metodo_pago ? { paymentMethod: known.metodo_pago } : {}),
        ...(known.fecha ? { date: new Date(periodToRange(known.fecha).from ?? new Date()) } : {}),
      })
      return {
        data: { title: "Gasto registrado", payload: expense },
        rich: expenseCard(expense as Parameters<typeof expenseCard>[0], { actions: expenseActions(String(expense.description ?? "")) }),
        reply: `Gasto de ${money(monto)} registrado.`,
      }
    }

    case "consultar_gastos": {
      const { from, to } = periodToRange(known.fecha)
      const { expenses, total } = await deps.expenseService.list(ctx, { category: known.categoria, from, to, take: 50 })
      const byCategory = await deps.expenseService.totalsByCategory(ctx)
      const grandTotal = total ?? expenses.reduce((s, e) => s + e.amount, 0)
      const blocks: RichBlock[] = [
        kpiBlock("Resumen de gastos", [
          { label: "Total", value: money(grandTotal), emphasis: "strong" },
          { label: "Registros", value: expenses.length },
        ]),
      ]
      if (byCategory.length >= 2) {
        blocks.push(chartBlock("Gastos por categoría", "donut", byCategory.map((c) => ({ label: c.category, value: c.total })), { currency: true, minPoints: 2 }))
      }
      if (expenses.length > 0) {
        blocks.push(...expensesTable(expenses).blocks)
      } else {
        blocks.push(...expensesSummary(grandTotal, expenses.length, byCategory).blocks)
      }
      return {
        data: { title: "Gastos", payload: { expenses, total } },
        rich: { kind: "summary", title: "Resumen de gastos", blocks },
        reply: `Tienes ${expenses.length} gasto(s) registrados.`,
      }
    }

    case "editar_gasto": {
      const id = await resolveExpense(deps, ctx, known.gasto)
      const monto = num(known.monto)
      const expense = await deps.expenseService.update(ctx, id, {
        ...(monto !== null ? { amount: monto } : {}),
        ...(known.descripcion ? { description: known.descripcion } : {}),
        ...(known.categoria ? { category: known.categoria } : {}),
      })
      return {
        data: { title: "Gasto actualizado", payload: expense },
        rich: expenseCard(expense as Parameters<typeof expenseCard>[0]),
        reply: "El gasto quedó actualizado.",
      }
    }

    // ─── Proveedores (gasto con vendor) ───────────────────────────────────
    case "registrar_compra_proveedor": {
      const monto = num(known.monto)
      if (monto === null || monto <= 0) throw new ActionInputError("El monto de la compra no es válido.")
      const expense = await deps.expenseService.create(ctx, {
        description: known.descripcion || `Compra a ${known.vendor}`,
        amount: monto,
        category: known.categoria || "compras",
        vendor: known.vendor,
        ...(known.metodo_pago ? { paymentMethod: known.metodo_pago } : {}),
        ...(known.fecha ? { date: new Date(periodToRange(known.fecha).from ?? new Date()) } : {}),
      })
      return {
        data: { title: "Compra registrada", payload: expense },
        rich: expenseCard(expense as Parameters<typeof expenseCard>[0], { actions: vendorActions(known.vendor ?? "") }),
        reply: `Compra a ${known.vendor} por ${money(monto)} registrada.`,
      }
    }

    // ─── Proveedores / Cuentas por pagar (FASE 6C) ───────────────────────
    case "deuda_total": {
      const { kpis, suppliers } = await deps.supplierService.list(ctx, { status: "all", limit: 100 })
      const blocks: RichBlock[] = [suppliersSummary(kpis).blocks[0]]
      if (kpis.overdueInvoices > 0) {
        blocks.push(monitorBlock("warning", `${kpis.overdueInvoices} factura(s) vencida(s) por ${money(kpis.overdueAmount)}.`, { icon: "alert-triangle", severity: "warning", actions: [{ label: "Ver centro de proveedores", action: "abre el centro de proveedores" }] }))
      }
      if (suppliers.length > 0) {
        blocks.push(suppliersList(suppliers.map(toRichSupplier), { title: "Proveedores con saldo" }))
      }
      return {
        data: { title: "Deuda total con proveedores", payload: { kpis, suppliers } },
        rich: { kind: "summary", title: "Deuda total con proveedores", blocks },
        reply: `Debes ${money(kpis.totalPayable)} en ${kpis.pendingInvoices} factura(s) a ${kpis.activeSuppliers} proveedor(es) activo(s).`,
      }
    }

    case "pagar_esta_semana": {
      const { kpis, suppliers } = await deps.supplierService.list(ctx, { status: "por_vencer", limit: 100 })
      const blocks: RichBlock[] = []
      if (suppliers.length === 0) {
        blocks.push(monitorBlock("success", "No tienes pagos a proveedores por vencer en los próximos 7 días.", { icon: "check-circle-2", severity: "info" }))
      } else {
        blocks.push(monitorBlock("info", `${suppliers.length} proveedor(es) con pagos por vencer por ${money(kpis.dueNext7Days)}.`, { icon: "calendar-clock", severity: "info", actions: [{ label: "Ver centro de proveedores", action: "abre el centro de proveedores" }] }))
        blocks.push(suppliersList(suppliers.map(toRichSupplier), { title: "Pagos que vencen esta semana" }))
      }
      return {
        data: { title: "Pagos por vencer", payload: { kpis, suppliers } },
        rich: { kind: "summary", title: "Pagos de esta semana", blocks },
        reply: suppliers.length > 0 ? `Tienes ${money(kpis.dueNext7Days)} en pagos a proveedores por vencer esta semana.` : "No tienes pagos por vencer en los próximos 7 días.",
      }
    }

    case "registrar_pago_proveedor": {
      if (!known.vendor) throw new ActionInputError("Dime a qué proveedor le registrarás el pago.")
      const amount = num(known.monto)
      if (amount === null || amount <= 0) throw new ActionInputError("El monto del pago no es válido.")
      const supplier = await resolveSupplier(deps, ctx, known.vendor)
      const method = typeof known.metodo === "string" ? known.metodo : typeof known.metodo_pago === "string" ? known.metodo_pago : undefined
      const detail = await deps.supplierService.registerPayment(ctx, {
        supplierId: supplier.id,
        amount,
        paymentMethod: method,
        notes: "Pago registrado por el asistente",
      })
      return {
        data: { title: "Pago registrado", payload: detail },
        rich: supplierCard(toRichSupplier(detail), {
          subtitle: detail.category || undefined,
          actions: [{ label: "Ver detalle del proveedor", action: "muéstrame el detalle de este proveedor" }],
        }),
        reply: `Pago de ${money(amount)} registrado a ${detail.name}. Saldo pendiente: ${money(detail.balance)}.`,
      }
    }

    case "facturas_vencidas": {
      const { kpis, suppliers } = await deps.supplierService.list(ctx, { status: "vencido", limit: 100 })
      const blocks: RichBlock[] = []
      if (suppliers.length === 0) {
        blocks.push(monitorBlock("success", "No tienes facturas de proveedores vencidas.", { icon: "check-circle-2", severity: "info" }))
      } else {
        blocks.push(monitorBlock("warning", `${kpis.overdueInvoices} factura(s) vencida(s) por ${money(kpis.overdueAmount)}.`, { icon: "alert-triangle", severity: "warning", actions: [{ label: "Ver centro de proveedores", action: "abre el centro de proveedores" }] }))
        blocks.push(suppliersList(suppliers.map(toRichSupplier), { title: "Proveedores con facturas vencidas" }))
      }
      return {
        data: { title: "Facturas vencidas", payload: { kpis, suppliers } },
        rich: { kind: "summary", title: "Facturas vencidas de proveedores", blocks },
        reply: suppliers.length > 0 ? `Tienes ${kpis.overdueInvoices} factura(s) vencida(s) por ${money(kpis.overdueAmount)}.` : "No tienes facturas de proveedores vencidas.",
      }
    }

    case "mayor_deuda": {
      const { suppliers } = await deps.supplierService.list(ctx, { status: "all", limit: 100 })
      const ordered = [...suppliers].sort((a, b) => b.balance - a.balance).slice(0, 5)
      const blocks: RichBlock[] = []
      if (ordered.length === 0 || ordered[0].balance <= 0) {
        blocks.push(monitorBlock("success", "No tienes deudas pendientes con proveedores.", { icon: "check-circle-2", severity: "info" }))
      } else {
        blocks.push(suppliersTable(ordered.map(toRichSupplier), { title: "Proveedores con mayor deuda" }).blocks[0])
      }
      return {
        data: { title: "Proveedor con mayor deuda", payload: ordered },
        rich: { kind: "summary", title: "Mayor deuda con proveedores", blocks },
        reply: ordered.length > 0 && ordered[0].balance > 0 ? `${ordered[0].name} encabeza la deuda con ${money(ordered[0].balance)}.` : "No tienes deudas pendientes con proveedores.",
      }
    }

    // ─── Pedidos ──────────────────────────────────────────────────────────
    case "ver_pedidos": {
      const orders = await runTool(deps, ctx, runtime, "orders.getPending", { take: 10 })
      const list = Array.isArray(orders) ? orders : []
      return {
        data: { title: "Pedidos pendientes", payload: list },
        rich: list.length > 0 ? ordersTable(list) : { kind: "card", title: "Sin pedidos pendientes", blocks: [{ kind: "text", text: "No hay pedidos pendientes de atender." }] },
        reply: list.length > 0 ? `Tienes ${list.length} pedido(s) pendiente(s).` : "No hay pedidos pendientes.",
      }
    }

    case "ver_pedido": {
      const id = await resolveOrder(deps, ctx, known.pedido)
      const order = await runTool(deps, ctx, runtime, "orders.getDetails", { id })
      return {
        data: { title: "Detalle del pedido", payload: order },
        rich: orderCard(order as Parameters<typeof orderCard>[0], { actions: saleActions(String((order as { orderNumber?: string }).orderNumber ?? "")) }),
        reply: "Aquí tienes el detalle del pedido.",
      }
    }

    case "cancelar_pedido": {
      const id = await resolveOrder(deps, ctx, known.pedido)
      const order = await runTool(deps, ctx, runtime, "orders.updateStatus", { id, status: "cancelled" })
      return {
        data: { title: "Pedido cancelado", payload: order },
        rich: { kind: "card", title: "Pedido cancelado", subtitle: (order as { orderNumber?: string }).orderNumber ?? undefined, blocks: [{ kind: "text", text: "El pedido fue cancelado y el stock fue restaurado." }] },
        reply: "El pedido fue cancelado y el stock fue restaurado.",
      }
    }

    // ─── Reportes ─────────────────────────────────────────────────────────
    case "reporte_ventas": {
      const { from, to } = periodToRange(known.fecha)
      const data = await runTool(deps, ctx, runtime, "reports.sales", { from, to })
      return {
        data: { title: "Reporte de ventas", payload: data },
        rich: salesSummary(data as Parameters<typeof salesSummary>[0]),
        reply: "Aquí tienes el reporte de ventas.",
      }
    }

    case "reporte_stock_bajo": {
      const products = await runTool(deps, ctx, runtime, "inventory.getLowStock", { threshold: 5, take: 20 })
      const list = Array.isArray(products) ? products : []
      const blocks: RichBlock[] = []
      if (list.length > 0) {
        blocks.push(monitorBlock("warning", `${list.length} producto(s) requieren reposición.`, { icon: "package", severity: "warning", actions: [{ label: "Ver productos", action: "muéstrame los productos con stock bajo" }] }))
        blocks.push(...productsTable(list).blocks)
      } else {
        blocks.push({ kind: "text", text: "No hay productos con stock bajo." })
      }
      return {
        data: { title: "Stock bajo", payload: list },
        rich: { kind: "summary", title: "Stock bajo", blocks },
        reply: list.length > 0 ? `Tienes ${list.length} producto(s) con stock bajo.` : "No hay productos con stock bajo.",
      }
    }

    case "reporte_clientes": {
      const customers = await runTool(deps, ctx, runtime, "customers.getTopCustomers", { take: 10 })
      const list = Array.isArray(customers) ? customers : []
      return {
        data: { title: "Mejores clientes", payload: list },
        rich: list.length > 0 ? customersTable(list) : { kind: "card", title: "Sin datos", blocks: [{ kind: "text", text: "Aún no hay clientes frecuentes." }] },
        reply: list.length > 0 ? "Aquí tienes tus clientes más frecuentes." : "Aún no hay clientes frecuentes.",
      }
    }

    case "reporte_productos": {
      const products = await runTool(deps, ctx, runtime, "sales.getTopProducts", { take: 10 })
      const list = Array.isArray(products) ? products : []
      const blocks: RichBlock[] = []
      const withNames = list.map((p) => ({ name: (p as { name?: string }).name ?? "Producto", quantity: (p as { quantity?: number }).quantity ?? 0 }))
      if (withNames.length >= 2) {
        blocks.push(chartBlock("Productos más vendidos", "bar", withNames.map((p) => ({ label: p.name, value: p.quantity })), { minPoints: 2 }))
      }
      if (withNames.length > 0) {
        blocks.push(...productsTable(withNames.map((p) => ({ name: p.name, price: undefined, stock: p.quantity }))).blocks)
      } else {
        blocks.push({ kind: "text", text: "Aún no hay productos vendidos." })
      }
      return {
        data: { title: "Productos más vendidos", payload: list },
        rich: { kind: "summary", title: "Productos más vendidos", blocks },
        reply: list.length > 0 ? "Aquí tienes los productos más vendidos." : "Aún no hay productos vendidos.",
      }
    }

    case "resumen_negocio": {
      const data = await runTool(deps, ctx, runtime, "analytics.businessSummary", {})
      const payload = data as {
        sales?: { today?: Record<string, unknown>; month?: Record<string, unknown> }
        inventory?: { lowStockCount?: number }
        pendingOrders?: { count?: number }
      }
      const sales = payload.sales ?? {}
      const today = (sales.today ?? {}) as Record<string, unknown>
      const month = (sales.month ?? {}) as Record<string, unknown>
      const lowStock = payload.inventory?.lowStockCount ?? 0
      const pending = payload.pendingOrders?.count ?? 0
      const blocks: RichBlock[] = [
        kpiBlock("Indicadores del negocio", [
          { label: "Ventas hoy", value: money(typeof today.revenue === "number" ? today.revenue : 0), emphasis: "strong" },
          { label: "Ventas del mes", value: money(typeof month.revenue === "number" ? month.revenue : 0), emphasis: "strong" },
          { label: "Stock bajo", value: lowStock, emphasis: lowStock > 0 ? "strong" : "normal" },
          { label: "Pedidos pendientes", value: pending, emphasis: pending > 0 ? "strong" : "normal" },
        ]),
      ]
      if (lowStock > 0) {
        blocks.push(monitorBlock("warning", `${lowStock} producto(s) requieren reposición.`, { icon: "package", severity: "warning", actions: [{ label: "Ver productos", action: "muéstrame los productos con stock bajo" }] }))
      }
      if (pending > 0) {
        blocks.push(monitorBlock("info", `${pending} pedido(s) pendientes de atender.`, { icon: "package-check", severity: "info", actions: [{ label: "Ver pedidos", action: "muéstrame los pedidos pendientes" }] }))
      }
      return {
        data: { title: "Resumen del negocio", payload },
        rich: {
          kind: "summary",
          title: "Indicadores del negocio",
          blocks,
        },
        reply: "Aquí tienes el resumen de tu negocio.",
      }
    }

    // ─── Cobranza (FASE 6A) ───────────────────────────────────────────────
    case "consultar_vencidos": {
      const { kpis, credits } = await deps.creditService.list(ctx, { status: "overdue", limit: 20 })
      const blocks: RichBlock[] = []
      if (credits.length === 0) {
        blocks.push(monitorBlock("success", "No tienes créditos vencidos.", { icon: "check-circle-2", severity: "info" }))
      } else {
        blocks.push(monitorBlock("warning", `${kpis.overdueCredits} crédito(s) vencido(s) por ${money(kpis.overdueAmount)}.`, { icon: "alert-triangle", severity: "warning", actions: [{ label: "Ver centro de cobranza", action: "abre el centro de cobranza" }] }))
        blocks.push(creditsList(credits.map(toRichCredit), { title: "Créditos vencidos" }))
      }
      return {
        data: { title: "Créditos vencidos", payload: { kpis, credits } },
        rich: { kind: "summary", title: "Créditos vencidos", blocks },
        reply: credits.length > 0 ? `Tienes ${kpis.overdueCredits} crédito(s) vencido(s) por ${money(kpis.overdueAmount)}.` : "No tienes créditos vencidos.",
      }
    }

    case "quien_debe_mas": {
      const { credits } = await deps.creditService.list(ctx, { status: "overdue", limit: 100 })
      const ordered = [...credits].sort((a, b) => b.pending - a.pending).slice(0, 5)
      const blocks: RichBlock[] = []
      if (ordered.length === 0) {
        blocks.push(monitorBlock("success", "Nadie tiene deudas vencidas por ahora.", { icon: "check-circle-2", severity: "info" }))
      } else {
        blocks.push(creditsTable(ordered.map(toRichCredit), { title: "Mayores deudores" }).blocks[0])
      }
      return {
        data: { title: "Mayores deudores", payload: ordered },
        rich: { kind: "summary", title: "Mayores deudores", blocks },
        reply: ordered.length > 0 ? `${ordered[0].customerName} encabeza la deuda con ${money(ordered[0].pending)}.` : "No hay deudores pendientes.",
      }
    }

    case "proximos_vencimientos": {
      const { kpis, credits } = await deps.creditService.list(ctx, { status: "upcoming", limit: 20 })
      const blocks: RichBlock[] = []
      if (credits.length === 0) {
        blocks.push(monitorBlock("success", "No hay cuotas por vencer en los próximos 7 días.", { icon: "check-circle-2", severity: "info" }))
      } else {
        blocks.push(monitorBlock("info", `${credits.length} crédito(s) con cuotas por vencer por ${money(kpis.dueNext7Days)}.`, { icon: "calendar-check", severity: "info", actions: [{ label: "Ver centro de cobranza", action: "abre el centro de cobranza" }] }))
        blocks.push(creditsList(credits.map(toRichCredit), { title: "Próximos vencimientos (7 días)" }))
      }
      return {
        data: { title: "Próximos vencimientos", payload: { kpis, credits } },
        rich: { kind: "summary", title: "Próximos vencimientos", blocks },
        reply: credits.length > 0 ? `Tienes ${credits.length} crédito(s) con cuotas por vencer (${money(kpis.dueNext7Days)}).` : "No hay cuotas por vencer en los próximos 7 días.",
      }
    }

    case "total_pendiente": {
      const { kpis } = await deps.creditService.list(ctx, { status: "all", limit: 100 })
      const blocks: RichBlock[] = [creditsSummary(kpis).blocks[0]]
      if (kpis.overdueCredits > 0) {
        blocks.push(monitorBlock("warning", `${kpis.overdueCredits} crédito(s) vencido(s) por ${money(kpis.overdueAmount)}.`, { icon: "alert-triangle", severity: "warning", actions: [{ label: "Ver vencidos", action: "muéstrame los créditos vencidos" }] }))
      }
      return {
        data: { title: "Total pendiente", payload: kpis },
        rich: { kind: "summary", title: "Resumen de cobranza", blocks },
        reply: `Tienes ${money(kpis.totalPending)} por cobrar en ${kpis.activeCredits} crédito(s) activo(s).`,
      }
    }

    case "registrar_abono": {
      const amount = num(known.monto)
      if (amount === null || amount <= 0) throw new ActionInputError("El monto del abono no es válido.")
      if (!known.cliente) throw new ActionInputError("Dime a qué cliente le registrarás el abono.")
      const method = typeof known.metodo === "string" ? known.metodo : undefined
      const { credit, payment } = await registerCreditPayment(deps, ctx, known.cliente, amount, method)
      const detail = await deps.creditService.getDetail(ctx, credit.orderId)
      return {
        data: { title: "Abono registrado", payload: payment },
        rich: creditCard(toRichCredit(detail), {
          subtitle: `Orden #${credit.orderNumber}`,
          actions: [{ label: "Ver detalle del crédito", action: "muéstrame el detalle de este crédito" }],
        }),
        reply: `Abono de ${money(amount)} registrado para ${credit.customerName}. Saldo pendiente: ${money(credit.pending - amount > 0 ? credit.pending - amount : 0)}.`,
      }
    }

    // ─── Cobranza Inteligente (FASE 6B) ───────────────────────────────────
    case "contactar_hoy": {
      const recommendations = await deps.collectionService.recommendations(ctx, { limit: 10 })
      const blocks: RichBlock[] = []
      if (recommendations.length === 0) {
        blocks.push(monitorBlock("success", "No hay créditos pendientes que contactar hoy.", { icon: "check-circle-2", severity: "info" }))
      } else {
        const overdue = recommendations.filter((r) => r.overdueDays > 0).length
        blocks.push(monitorBlock("info", `${recommendations.length} cliente(s) para contactar hoy (${overdue} vencido(s)).`, { icon: "megaphone", severity: "info", actions: [{ label: "Abrir asistente de cobranza", action: "abre el asistente de cobranza" }] }))
        blocks.push(collectionRecommendationsList(recommendations, { title: "Contactos sugeridos hoy" }))
      }
      return {
        data: { title: "Contactos sugeridos", payload: recommendations },
        rich: { kind: "summary", title: "¿A quién contactar hoy?", blocks },
        reply: recommendations.length > 0 ? `Hoy te sugiero contactar a ${recommendations.length} cliente(s), empezando por ${recommendations[0].customerName} (${money(recommendations[0].pending)} pendiente).` : "No hay créditos pendientes que contactar hoy.",
      }
    }

    case "sin_recordatorio": {
      const recommendations = await deps.collectionService.recommendations(ctx, { limit: 20 })
      const never = recommendations.filter((r) => r.daysSinceLastContact === null)
      const blocks: RichBlock[] = []
      if (never.length === 0) {
        blocks.push(monitorBlock("success", "Todos tus créditos pendientes ya recibieron algún recordatorio.", { icon: "check-circle-2", severity: "info" }))
      } else {
        blocks.push(collectionRecommendationsList(never, { title: "Créditos sin recordatorio" }))
      }
      return {
        data: { title: "Sin recordatorio", payload: never },
        rich: { kind: "summary", title: "Créditos sin recordatorio", blocks },
        reply: never.length > 0 ? `${never.length} crédito(s) pendiente(s) nunca han recibido un recordatorio.` : "Todos los créditos pendientes ya fueron contactados.",
      }
    }

    case "creditos_dos_intentos": {
      const recommendations = await deps.collectionService.recommendations(ctx, { limit: 50 })
      const twoAttempts = recommendations.filter((r) => r.attempts >= 2)
      const blocks: RichBlock[] = []
      if (twoAttempts.length === 0) {
        blocks.push(monitorBlock("success", "No hay créditos con dos o más intentos de cobranza.", { icon: "check-circle-2", severity: "info" }))
      } else {
        blocks.push(monitorBlock("warning", `${twoAttempts.length} crédito(s) con dos o más intentos: evalúa subir de nivel o tomar otra vía.`, { icon: "alert-triangle", severity: "warning", actions: [{ label: "Ver asistente de cobranza", action: "abre el asistente de cobranza" }] }))
        blocks.push(collectionRecommendationsList(twoAttempts, { title: "Créditos con 2+ intentos" }))
      }
      return {
        data: { title: "Dos intentos de cobranza", payload: twoAttempts },
        rich: { kind: "summary", title: "Créditos con 2+ intentos", blocks },
        reply: twoAttempts.length > 0 ? `${twoAttempts.length} crédito(s) tienen dos o más intentos de cobranza.` : "No hay créditos con dos o más intentos de cobranza.",
      }
    }

    case "preparar_aviso": {
      if (!known.cliente) throw new ActionInputError("Dime a qué cliente le preparo el recordatorio.")
      const customer = await resolveCustomer(deps, ctx, known.cliente)
      const credits = await deps.creditService.listByCustomer(ctx, customer.id)
      if (credits.length === 0) {
        throw new ActionInputError(`El cliente ${customer.name} no tiene créditos activos con saldo pendiente.`)
      }
      const credit = credits[0]

      let category: CollectionTemplateCategory | undefined
      const tipo = (known.tipo ?? "").toLowerCase()
      if (tipo) {
        if (tipo.includes("segundo")) category = "segundo_recordatorio"
        else if (tipo.includes("ultimo") || tipo.includes("último")) category = "ultimo_aviso"
        else if (tipo.includes("abono")) category = "despues_abono"
        else if (tipo.includes("agradec")) category = "agradecimiento"
        else category = "primer_recordatorio"
      }

      const reminder = await deps.collectionService.prepareReminder(ctx, {
        orderId: credit.orderId,
        category,
        channel: "whatsapp",
      })

      const blocks: RichBlock[] = [
        {
          kind: "text",
          text: `Preparé un mensaje para ${reminder.customerName} (nivel ${reminder.level}). No lo envié: revísalo y envíalo tú desde tu WhatsApp.`,
        },
        {
          kind: "card",
          title: "Mensaje preparado",
          subtitle: `Orden #${reminder.orderNumber} · ${reminder.category.replace(/_/g, " ")}`,
          fields: [{ label: "Mensaje", value: reminder.message }],
          actions: [{ label: "Abrir asistente de cobranza", action: "abre el asistente de cobranza" }],
        },
      ]
      return {
        data: { title: "Recordatorio preparado", payload: reminder },
        rich: { kind: "summary", title: "Recordatorio preparado", blocks },
        reply: `Listo, preparé el mensaje para ${reminder.customerName}. Revísalo y envíalo tú (no lo envié automáticamente).`,
      }
    }

    // ─── Inteligencia Financiera (FASE 6D) ────────────────────────────────
    case "salud_financiera": {
      const indicators = await deps.financialService.getIndicators(ctx, "month")
      const first =
        indicators.netFlow < 0
          ? `En ${indicators.label} tus gastos (${money(indicators.expenses)}) superaron tus ingresos (${money(indicators.revenue)}).`
          : `En ${indicators.label} tus ingresos (${money(indicators.revenue)}) superaron tus gastos (${money(indicators.expenses)}).`
      return {
        data: { title: "Salud financiera", payload: indicators },
        rich: { kind: "summary", title: "Salud financiera", blocks: financialHealthBlocks(indicators) },
        reply: `${first} Además tienes ${money(indicators.totalPending)} por cobrar y ${money(indicators.totalPayable)} por pagar.`,
      }
    }

    case "que_revisar_hoy": {
      const [indicators, insights] = await Promise.all([
        deps.financialService.getIndicators(ctx, "week"),
        deps.financialService.getInsights(ctx, "week"),
      ])
      return {
        data: { title: "Qué revisar hoy", payload: { indicators, insights } },
        rich: { kind: "summary", title: "Qué revisar hoy", blocks: financialReviewBlocks(indicators, insights) },
        reply:
          insights.length > 0
            ? `Tienes ${insights.length} punto(s) financiero(s) por revisar; el más urgente: ${insights[0].title.toLowerCase()}.`
            : "No hay alertas financieras que requieran tu atención hoy.",
      }
    }

    case "por_cobrar_vs_pagar": {
      const indicators = await deps.financialService.getIndicators(ctx, "month")
      return {
        data: { title: "Por cobrar vs por pagar", payload: indicators },
        rich: { kind: "summary", title: "Por cobrar vs por pagar", blocks: financialCobrarVsPagarBlocks(indicators) },
        reply: `Tienes ${money(indicators.totalPending)} por cobrar y ${money(indicators.totalPayable)} por pagar${
          indicators.totalPending > indicators.totalPayable ? ": conviene priorizar el cobro." : "."
        }`,
      }
    }

    case "principales_gastos": {
      const range = periodRange("month", new Date())
      const [expenseResult, indicators] = await Promise.all([
        deps.expenseService.list(ctx, { from: range.from.toISOString(), to: range.to.toISOString() }),
        deps.financialService.getIndicators(ctx, "month"),
      ])
      const totals = new Map<string, number>()
      for (const e of expenseResult.expenses) totals.set(e.category, (totals.get(e.category) ?? 0) + e.amount)
      const byCategory = Array.from(totals.entries()).map(([category, total]) => ({ category, total }))
      return {
        data: { title: "Principales gastos", payload: byCategory },
        rich: { kind: "summary", title: "Principales gastos", blocks: financialGastosBlocks(byCategory, indicators.expenses) },
        reply:
          byCategory.length > 0
            ? `Tus gastos del mes suman ${money(indicators.expenses)}; la categoría más alta es ${byCategory[0].category} con ${money(byCategory[0].total)}.`
            : "No tienes gastos registrados este mes.",
      }
    }

    case "clientes_mayor_deuda": {
      const indicators = await deps.financialService.getIndicators(ctx, "month")
      return {
        data: { title: "Clientes con mayor deuda", payload: indicators.topDebtors },
        rich: { kind: "summary", title: "Clientes con mayor deuda", blocks: [financialTopDebtorsBlock(indicators.topDebtors)] },
        reply:
          indicators.topDebtors.length > 0
            ? `Tu cliente con mayor deuda es ${indicators.topDebtors[0].name} (${money(indicators.topDebtors[0].pending)}).`
            : "No tienes deudas pendientes por cobrar.",
      }
    }

    case "proveedores_pagar_primero": {
      const indicators = await deps.financialService.getIndicators(ctx, "month")
      return {
        data: { title: "Proveedores a pagar primero", payload: indicators.topPayableSuppliers },
        rich: { kind: "summary", title: "Proveedores a pagar primero", blocks: [financialTopPayablesBlock(indicators.topPayableSuppliers)] },
        reply:
          indicators.topPayableSuppliers.length > 0
            ? `Tu proveedor con mayor saldo es ${indicators.topPayableSuppliers[0].name} (${money(indicators.topPayableSuppliers[0].outstanding)}).`
            : "No tienes cuentas pendientes con proveedores.",
      }
    }

    default:
      throw new ActionExecutionError(`Acción no implementada: ${actionId}`)
  }
}

export { extractPaymentMethod, extractDiscount }
