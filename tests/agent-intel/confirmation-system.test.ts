import { describe, expect, it } from "vitest"
import { ConfirmationSystem } from "@/lib/agent-intel/confirmation-system"
import type { ExecutionPlan, IntentClassification, PlannedStep } from "@/lib/agent-intel/types"

const INTENT: IntentClassification = {
  type: "accion",
  confidence: 0.9,
  domains: ["orders"],
  message: "accion",
  entities: {},
  destructive: true,
  needsTools: true,
  signals: [],
}

function makePlan(steps: PlannedStep[]): ExecutionPlan {
  return { id: "plan-1", intent: INTENT, steps, requiresConfirmation: steps.some((s) => s.requiresConfirmation), domains: [] }
}

function step(id: string, tool: string, input: Record<string, unknown>, requiresConfirmation = false): PlannedStep {
  return { id, tool, domain: "orders", input, dependsOn: [], parallel: true, retryable: true, requiresConfirmation, rationale: "test" }
}

const system = new ConfirmationSystem()

describe("ConfirmationSystem", () => {
  it("detecta products.delete por regla", () => {
    const plan = makePlan([step("s1", "products.delete", { id: "p1" })])
    expect(system.requirementsFor(plan)).toHaveLength(1)
  })

  it("detecta cancelación de orden por la condición when", () => {
    const plan = makePlan([step("s1", "orders.updateStatus", { status: "cancelled" })])
    expect(system.requirementsFor(plan)).toHaveLength(1)
  })

  it("NO exige confirmación para un cambio de estado no destructivo", () => {
    const plan = makePlan([step("s1", "orders.updateStatus", { status: "delivered" })])
    expect(system.requirementsFor(plan)).toHaveLength(0)
  })

  it("exige confirmación para ajuste de stock pero no para incremento", () => {
    expect(system.requirementsFor(makePlan([step("s1", "inventory.updateStock", { type: "adjustment" })])).length).toBe(1)
    expect(system.requirementsFor(makePlan([step("s1", "inventory.updateStock", { type: "increase" })])).length).toBe(0)
  })

  it("genera solicitud con acciones, impactos y códigos", () => {
    const request = system.request(makePlan([step("s1", "products.delete", { id: "p1" })]))
    expect(request.actions).toHaveLength(1)
    expect(request.actions[0]).toMatchObject({ stepId: "s1", tool: "products.delete" })
    expect(request.actions[0].description).toContain("Eliminar")
    expect(request.confirmCodes).toEqual(["confirm:s1"])
    expect(request.message).toContain("confirmar")
  })

  it("isFullyConfirmed exige todas las confirmaciones", () => {
    const plan = makePlan([
      step("s1", "products.delete", { id: "p1" }),
      step("s2", "orders.updateStatus", { status: "cancelled" }),
    ])
    expect(system.isFullyConfirmed(plan, undefined)).toBe(false)
    expect(system.isFullyConfirmed(plan, ["s1"])).toBe(false)
    expect(system.isFullyConfirmed(plan, ["s1", "s2"])).toBe(true)
  })

  it("devuelve true cuando no hay acciones que confirmar", () => {
    const plan = makePlan([step("s1", "sales.getRecentSales", {})])
    expect(system.isFullyConfirmed(plan, undefined)).toBe(true)
  })
})
