import { describe, expect, it } from "vitest"
import { IntentEngine } from "@/lib/agent-intel/intent-engine"
import { TaskPlanner } from "@/lib/agent-intel/task-planner"

const intent = new IntentEngine()

const CATALOG = [
  { name: "analytics.businessMonitor", domain: "analytics", description: "", requiredPermissions: [], inputSchema: { type: "object", properties: {} } },
  { name: "recommendations.list", domain: "recommendations", description: "", requiredPermissions: ["report.read"], inputSchema: { type: "object", properties: {} } },
  { name: "inventory.getLowStock", domain: "inventory", description: "", requiredPermissions: [], inputSchema: { type: "object", properties: {} } },
  { name: "reports.sales", domain: "reports", description: "", requiredPermissions: [], inputSchema: { type: "object", properties: {} } },
] as const

const planner = new TaskPlanner({ catalog: CATALOG })

describe("Integración agent-intel → recomendaciones (FASE 4D)", () => {
  it("clasifica '¿qué me recomiendas revisar?' con dominio recommendations", () => {
    const classification = intent.classify("¿qué me recomiendas revisar?")
    expect(classification.domains).toContain("recommendations")
  })

  it("clasifica sugerencias y consejos hacia recommendations", () => {
    expect(intent.classify("dame un consejo para mi negocio").domains).toContain("recommendations")
    expect(intent.classify("¿qué debería revisar? ¿me das sugerencias?").domains).toContain("recommendations")
  })

  it("planifica consultas de recomendación hacia recommendations.list", () => {
    const plan = planner.plan(intent.classify("¿qué me recomiendas revisar?"))
    expect(plan.steps).toHaveLength(1)
    expect(plan.steps[0].tool).toBe("recommendations.list")
    expect(plan.steps[0].domain).toBe("recommendations")
    expect(plan.steps[0].parallel).toBe(true)
  })

  it("planifica análisis con intención de recomendación hacia recommendations.list", () => {
    const plan = planner.plan(intent.classify("analiza qué debería revisar"))
    const tools = plan.steps.map((s) => s.tool)
    expect(tools).toContain("recommendations.list")
  })

  it("no exige confirmación para recomendaciones (solo lectura)", () => {
    const plan = planner.plan(intent.classify("¿qué puedo revisar?"))
    expect(plan.requiresConfirmation).toBe(false)
  })
})
