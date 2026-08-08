import { describe, expect, it } from "vitest"
import { ResponseSynthesizer } from "@/lib/agent-intel/response-synthesizer"
import type { ExecutionPlan, IntentClassification, SynthesisInput } from "@/lib/agent-intel/types"

const INTENT: IntentClassification = {
  type: "analisis",
  confidence: 0.85,
  domains: ["analytics"],
  message: "analisis",
  entities: {},
  destructive: false,
  needsTools: true,
  signals: [],
}

const PLAN: ExecutionPlan = {
  id: "plan-1",
  intent: INTENT,
  steps: [
    { id: "s1", tool: "analytics.businessSummary", domain: "analytics", input: {}, dependsOn: [], parallel: true, retryable: true, requiresConfirmation: false, rationale: "r" },
    { id: "s2", tool: "analytics.businessAlerts", domain: "analytics", input: {}, dependsOn: [], parallel: true, retryable: true, requiresConfirmation: false, rationale: "r" },
  ],
  requiresConfirmation: false,
  domains: ["analytics"],
}

const synthesizer = new ResponseSynthesizer()

describe("ResponseSynthesizer", () => {
  it("construye el contexto del LLM con intención, plan y resultados", () => {
    const input: SynthesisInput = {
      intent: INTENT,
      plan: PLAN,
      results: [
        { stepId: "s1", tool: "analytics.businessSummary", status: "ok", output: { success: true, data: { ventas: 1200 }, error: null, metadata: {} }, durationMs: 10, attempts: 1 },
        { stepId: "s2", tool: "analytics.businessAlerts", status: "ok", output: { success: true, data: [{ severity: "warning", type: "low_stock", message: "Stock bajo" }], error: null, metadata: {} }, durationMs: 8, attempts: 1 },
      ],
      message: "analiza mi negocio",
    }

    const ctx = synthesizer.buildPromptContext(input)
    expect(ctx).toContain("INTENCION_DETECTADA: analisis")
    expect(ctx).toContain("PLAN_EJECUTADO")
    expect(ctx).toContain("analytics.businessSummary")
    expect(ctx).toContain("RESULTADOS_DE_HERRAMIENTAS")
    expect(ctx).toContain("ventas")
    expect(ctx).toContain("en espanol")
  })

  it("incluye explicaciones y contexto de negocio cuando existen", () => {
    const ctx = synthesizer.buildPromptContext({
      intent: INTENT,
      plan: PLAN,
      results: [],
      explanations: ["El stock de X está bajo."],
      businessContext: "Perfil: Ferretería Panitas",
      message: "x",
    })
    expect(ctx).toContain("El stock de X está bajo.")
    expect(ctx).toContain("Ferretería Panitas")
  })

  it("trunca resultados enormes para no inflar el prompt", () => {
    const huge = "a".repeat(5000)
    const ctx = synthesizer.buildPromptContext({
      intent: INTENT,
      plan: null,
      results: [{ stepId: "s1", tool: "x.large", status: "ok", output: { success: true, data: huge, error: null, metadata: {} }, durationMs: 1, attempts: 1 }],
      message: "x",
    })
    expect(ctx.length).toBeLessThan(3000)
  })

  it("buildFallbackReply describe resultados exitosos", () => {
    const reply = synthesizer.buildFallbackReply({
      intent: INTENT,
      plan: PLAN,
      results: [
        { stepId: "s1", tool: "analytics.businessSummary", status: "ok", output: { success: true, data: { ventas: 1200 }, error: null, metadata: {} }, durationMs: 5, attempts: 1 },
      ],
      message: "x",
    })
    expect(reply).not.toContain("analytics")
    expect(reply).toContain("1200")
  })

  it("buildFallbackReply reporta fallos parciales", () => {
    const reply = synthesizer.buildFallbackReply({
      intent: INTENT,
      plan: PLAN,
      results: [
        { stepId: "s1", tool: "a.ok", status: "ok", output: { success: true, data: { x: 1 }, error: null, metadata: {} }, durationMs: 5, attempts: 1 },
        { stepId: "s2", tool: "b.bad", status: "error", error: "sin permisos", durationMs: 5, attempts: 1 },
      ],
      message: "x",
    })
    expect(reply).toContain("Nota:")
    expect(reply).toContain("permisos")
  })

  it("buildFallbackReply responde amablemente cuando todo falla", () => {
    const reply = synthesizer.buildFallbackReply({
      intent: INTENT,
      plan: PLAN,
      results: [{ stepId: "s1", tool: "a.bad", status: "error", error: "timeout", durationMs: 5, attempts: 2 }],
      message: "x",
    })
    expect(reply).toContain("No pude completar")
    expect(reply).not.toContain("timeout")
  })

  it("buildFallbackReply maneja array vacío como 'sin resultados'", () => {
    const reply = synthesizer.buildFallbackReply({
      intent: INTENT,
      plan: PLAN,
      results: [{ stepId: "s1", tool: "customers.search", status: "ok", output: { success: true, data: [], error: null, metadata: {} }, durationMs: 5, attempts: 1 }],
      message: "x",
    })
    expect(reply).toContain("No se encontraron resultados")
  })
})
