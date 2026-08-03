import { describe, expect, it, vi } from "vitest"
import { readFileSync, readdirSync } from "node:fs"
import { join } from "node:path"
import { buildToolRegistry } from "@/lib/agent/tools/setup"
import { ToolExecutor } from "@/lib/agent/tools/executor"
import { NoopToolLogger } from "@/lib/agent/tools/logging"
import type { ToolDeps } from "@/lib/agent/tools/deps"
import type { ToolExecutionContext } from "@/lib/agent/tools/types"

const ctx: ToolExecutionContext = {
  userId: "u1",
  storeId: "s1",
  negocioId: null,
  plan: "business",
  role: "admin",
  permissions: [
    "inventory.read",
    "inventory.update",
    "product.read",
    "product.create",
    "product.update",
    "product.delete",
    "sales.read",
    "customer.read",
    "customer.create",
    "order.read",
    "order.update",
    "report.read",
  ],
}

function makeFakes() {
  const productService = {
    list: vi.fn().mockResolvedValue({ products: [{ id: "p1", name: "A" }], total: 1 }),
    getById: vi.fn().mockResolvedValue({ id: "p1", name: "A", storeId: "s1" }),
    create: vi.fn().mockResolvedValue({ id: "p2", name: "Nuevo" }),
    update: vi.fn().mockResolvedValue({ id: "p1", name: "A" }),
    remove: vi.fn().mockResolvedValue({ success: true }),
  }
  const inventoryService = {
    lowStock: vi.fn().mockResolvedValue([{ id: "p1", name: "A", stock: 2 }]),
    getStock: vi.fn().mockResolvedValue({ productId: "p1", stock: 8 }),
    applyMovement: vi.fn().mockResolvedValue({ id: "m1", type: "increase" }),
    list: vi.fn().mockResolvedValue([]),
  }
  const salesService = {
    dailySummary: vi.fn().mockResolvedValue({ today: { revenue: 100 } }),
    summary: vi.fn().mockResolvedValue({ revenue: 100, totalOrders: 2 }),
    productsSold: vi.fn().mockResolvedValue([{ productId: "p1", name: "A", quantity: 5 }]),
    recent: vi.fn().mockResolvedValue([{ id: "o1", total: 50 }]),
    frequentCustomers: vi.fn().mockResolvedValue([{ customerId: "c1", name: "Juan", orders: 3 }]),
  }
  const customerService = {
    list: vi.fn().mockResolvedValue({ customers: [{ id: "c1", name: "Juan" }], total: 1 }),
    getHistory: vi.fn().mockResolvedValue({ customer: { id: "c1" }, orders: [] }),
    findOrCreateByPhone: vi.fn().mockResolvedValue({ customer: { id: "c2", name: "Ana" }, created: true }),
  }
  const orderService = {
    getPending: vi.fn().mockResolvedValue([{ id: "o1", status: "pending" }]),
    getById: vi.fn().mockResolvedValue({ id: "o1", storeId: "s1" }),
    updateStatus: vi.fn().mockResolvedValue({ id: "o1", status: "shipped" }),
  }
  return { productService, inventoryService, salesService, customerService, orderService }
}

function makeExecutor() {
  const fakes = makeFakes()
  const registry = buildToolRegistry({
    ...fakes,
  } as unknown as ToolDeps)
  const executor = new ToolExecutor({ registry, logger: new NoopToolLogger() })
  return { fakes, registry, executor }
}

describe("Tool System: registro completo", () => {
  it("registra herramientas de todos los dominios", () => {
    const { registry } = makeExecutor()
    const names = registry.list().map((t) => t.name)
    for (const expected of [
      "inventory.getProducts",
      "inventory.getLowStock",
      "inventory.getStock",
      "inventory.searchProduct",
      "inventory.updateStock",
      "products.get",
      "products.create",
      "products.update",
      "products.delete",
      "sales.getTodaySummary",
      "sales.getPeriodSummary",
      "sales.getTopProducts",
      "sales.getRecentSales",
      "customers.search",
      "customers.getHistory",
      "customers.getTopCustomers",
      "customers.create",
      "orders.getPending",
      "orders.getDetails",
      "orders.updateStatus",
      "reports.sales",
      "reports.today",
      "analytics.businessSummary",
      "analytics.businessAlerts",
      "analytics.businessMonitor",
    ]) {
      expect(names).toContain(expected)
    }
  })

  it("toda tool declara dominio, descripción, permisos, schema y execute", () => {
    const { registry } = makeExecutor()
    for (const tool of registry.list()) {
      expect(tool.domain).toBeTruthy()
      expect(typeof tool.description).toBe("string")
      expect(tool.requiredPermissions.length).toBeGreaterThan(0)
      expect(tool.inputSchema.type).toBe("object")
      expect(typeof tool.execute).toBe("function")
    }
  })

  it("ninguna tool acepta storeId o negocioId como parámetro (aislamiento)", () => {
    const { registry } = makeExecutor()
    for (const tool of registry.list()) {
      const props = Object.keys(tool.inputSchema.properties)
      expect(props).not.toContain("storeId")
      expect(props).not.toContain("negocioId")
    }
  })
})

describe("Tool System: aislamiento de negocio", () => {
  it("inventory.getStock pasa storeId desde el contexto, no desde el input", async () => {
    const { fakes, executor } = makeExecutor()
    const response = await executor.execute(ctx, "inventory.getStock", { id: "sku-1" })
    expect(response.success).toBe(true)
    expect(fakes.inventoryService.getStock).toHaveBeenCalledWith(
      expect.objectContaining({ storeId: "s1", userId: "u1" }),
      "sku-1"
    )
  })

  it("customers.getHistory consulta el historial dentro de la tienda del contexto", async () => {
    const { fakes, executor } = makeExecutor()
    const response = await executor.execute(ctx, "customers.getHistory", { customerId: "c1" })
    expect(response.success).toBe(true)
    expect(fakes.customerService.getHistory).toHaveBeenCalledWith(
      expect.objectContaining({ storeId: "s1" }),
      "c1",
      20
    )
  })

  it("orders.updateStatus delega en el servicio (que valida el negocio)", async () => {
    const { fakes, executor } = makeExecutor()
    const response = await executor.execute(ctx, "orders.updateStatus", { id: "o1", status: "shipped" })
    expect(response.success).toBe(true)
    expect(fakes.orderService.updateStatus).toHaveBeenCalledWith(
      expect.objectContaining({ storeId: "s1" }),
      "o1",
      "shipped"
    )
  })

  it("products.create pasa el input del usuario y el contexto por separado", async () => {
    const { fakes, executor } = makeExecutor()
    const response = await executor.execute(ctx, "products.create", { name: "Zapatos", price: 50 })
    expect(response.success).toBe(true)
    expect(fakes.productService.create).toHaveBeenCalledWith(
      expect.objectContaining({ storeId: "s1" }),
      expect.objectContaining({ name: "Zapatos", price: 50 })
    )
  })
})

describe("Tool System: layering (no Prisma, no repositorios)", () => {
  const domainsDir = join(process.cwd(), "src/lib/agent/tools/domains")
  const files = readdirSync(domainsDir).filter((f) => f.endsWith(".ts") && f !== "index.ts")

  it("las tools no importan prisma ni repositorios directamente", () => {
    expect(files.length).toBeGreaterThan(0)
    for (const file of files) {
      const source = readFileSync(join(domainsDir, file), "utf8")
      expect(source, `${file} must not import @/lib/prisma`).not.toContain("@/lib/prisma")
      expect(source, `${file} must not import @/repositories`).not.toContain("@/repositories")
      expect(source, `${file} must import services or analytics`).toMatch(/@\/services\/|@\/lib\/analytics/)
    }
  })

  it("los archivos de infraestructura no importan prisma ni repositorios", () => {
    const infra = ["types.ts", "response.ts", "permissions.ts", "registry.ts", "executor.ts", "logging.ts", "validate.ts", "context.ts", "deps.ts"]
    for (const file of infra) {
      const source = readFileSync(join(process.cwd(), "src/lib/agent/tools", file), "utf8")
      expect(source, `${file} must not import @/lib/prisma`).not.toContain("@/lib/prisma")
      expect(source, `${file} must not import @/repositories`).not.toContain("@/repositories")
    }
  })
})
