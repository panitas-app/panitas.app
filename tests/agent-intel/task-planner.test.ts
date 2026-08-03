import { describe, expect, it } from "vitest"
import { TaskPlanner } from "@/lib/agent-intel/task-planner"
import { IntentEngine } from "@/lib/agent-intel/intent-engine"
import type { IntentClassification } from "@/lib/agent-intel/types"

const intent = new IntentEngine()

const CATALOG = [
  { name: "inventory.getLowStock", domain: "inventory", description: "", requiredPermissions: [], inputSchema: { type: "object", properties: {} } },
  { name: "inventory.searchProduct", domain: "inventory", description: "", requiredPermissions: [], inputSchema: { type: "object", properties: {} } },
  { name: "inventory.updateStock", domain: "inventory", description: "", requiredPermissions: [], inputSchema: { type: "object", properties: {} } },
  { name: "sales.getRecentSales", domain: "sales", description: "", requiredPermissions: [], inputSchema: { type: "object", properties: {} } },
  { name: "customers.create", domain: "customers", description: "", requiredPermissions: [], inputSchema: { type: "object", properties: {} } },
  { name: "customers.search", domain: "customers", description: "", requiredPermissions: [], inputSchema: { type: "object", properties: {} } },
  { name: "orders.getPending", domain: "orders", description: "", requiredPermissions: [], inputSchema: { type: "object", properties: {} } },
  { name: "orders.updateStatus", domain: "orders", description: "", requiredPermissions: [], inputSchema: { type: "object", properties: {} } },
  { name: "products.create", domain: "products", description: "", requiredPermissions: [], inputSchema: { type: "object", properties: {} } },
  { name: "products.delete", domain: "products", description: "", requiredPermissions: [], inputSchema: { type: "object", properties: {} } },
  { name: "products.update", domain: "products", description: "", requiredPermissions: [], inputSchema: { type: "object", properties: {} } },
  { name: "reports.sales", domain: "reports", description: "", requiredPermissions: [], inputSchema: { type: "object", properties: {} } },
  { name: "analytics.businessSummary", domain: "analytics", description: "", requiredPermissions: [], inputSchema: { type: "object", properties: {} } },
  { name: "analytics.businessAlerts", domain: "analytics", description: "", requiredPermissions: [], inputSchema: { type: "object", properties: {} } },
  { name: "analytics.businessMonitor", domain: "analytics", description: "", requiredPermissions: [], inputSchema: { type: "object", properties: {} } },
] as const

function classify(message: string): IntentClassification {
  return intent.classify(message)
}

const planner = new TaskPlanner({ catalog: CATALOG })

describe("TaskPlanner", () => {
  it("planifica una consulta de inventario hacia searchProduct", () => {
    const plan = planner.plan(classify("¿cuánto stock hay de abrazadera?"))
    expect(plan.steps).toHaveLength(1)
    expect(plan.steps[0].tool).toBe("inventory.searchProduct")
    expect(plan.steps[0].input).toMatchObject({ q: "abrazadera", take: 10 })
  })

  it("planifica stock bajo hacia getLowStock", () => {
    const plan = planner.plan(classify("¿qué productos tienen stock bajo?"))
    expect(plan.steps[0].tool).toBe("inventory.getLowStock")
  })

  it("planifica análisis con métricas + alertas en paralelo", () => {
    const plan = planner.plan(classify("analiza el rendimiento del inventario"))
    const tools = plan.steps.map((s) => s.tool)
    expect(tools).toContain("analytics.businessSummary")
    expect(tools).toContain("analytics.businessAlerts")
    expect(tools).toContain("inventory.getLowStock")
    expect(plan.steps.every((s) => s.parallel)).toBe(true)
  })

  it("planifica '¿cómo está mi negocio?' hacia el monitor operativo", () => {
    const plan = planner.plan(classify("¿cómo está mi negocio?"))
    expect(plan.steps).toHaveLength(1)
    expect(plan.steps[0].tool).toBe("analytics.businessMonitor")
  })

  it("planifica un análisis del negocio con el monitor, sin duplicar métricas", () => {
    const plan = planner.plan(classify("analiza el estado de mi negocio"))
    expect(plan.steps).toHaveLength(1)
    expect(plan.steps[0].tool).toBe("analytics.businessMonitor")
    expect(plan.steps[0].parallel).toBe(true)
  })

  it("planifica un reporte de ventas", () => {
    const plan = planner.plan(classify("dame el reporte de ventas del mes"))
    expect(plan.steps[0].tool).toBe("reports.sales")
  })

  it("marca cancelación de pedido con confirmación", () => {
    const plan = planner.plan(classify("cancelar el pedido #123"))
    expect(plan.steps[0].tool).toBe("orders.updateStatus")
    expect(plan.steps[0].requiresConfirmation).toBe(true)
    expect(plan.requiresConfirmation).toBe(true)
  })

  it("marca eliminación de producto con confirmación", () => {
    const plan = planner.plan(classify("elimina el producto abrazadera"))
    expect(plan.steps[0].tool).toBe("products.delete")
    expect(plan.steps[0].requiresConfirmation).toBe(true)
  })

  it("incremento de stock NO requiere confirmación", () => {
    const plan = planner.plan(classify("agregar 10 unidades de abrazadera al stock"))
    expect(plan.steps[0].tool).toBe("inventory.updateStock")
    expect(plan.steps[0].input.type).toBe("increase")
    expect(plan.steps[0].requiresConfirmation).toBe(false)
    expect(plan.requiresConfirmation).toBe(false)
  })

  it("ajuste de stock requiere confirmación", () => {
    const plan = planner.plan(classify("ajustar el stock de abrazadera"))
    expect(plan.steps[0].input.type).toBe("adjustment")
    expect(plan.steps[0].requiresConfirmation).toBe(true)
  })

  it("deduplica dominios en el plan", () => {
    const plan = planner.plan(classify("analiza el rendimiento del inventario"))
    expect(plan.domains).toEqual(expect.arrayContaining(["analytics", "inventory"]))
  })

  it("no genera pasos para conversación", () => {
    const plan = planner.plan(classify("hola, ¿cómo estás?"))
    expect(plan.steps).toHaveLength(0)
  })
})
