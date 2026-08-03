/**
 * Intelligence Layer (FASE 4A) — orquestador del razonamiento.
 *
 * Transforma una solicitud en un turno razonado:
 *
 *   intent → plan → confirmación (si aplica) → ejecución → síntesis → traza
 *
 * Flujo:
 *   1. Clasifica la intención (Intent Engine).
 *   2. Si no requiere tools (conversación/ayuda) → no_tools, se delega al LLM.
 *   3. Construye el plan (Task Planner).
 *   4. Si el plan exige confirmación y el usuario no la dio → confirmation_required.
 *   5. Ejecuta el plan (Execution Planner + ToolExecutor 3B) con reintentos.
 *   6. Explica los hallazgos (Explanation Engine).
 *   7. Sintetiza el material para la respuesta final (Response Synthesizer).
 *   8. Registra todo en la traza (observabilidad).
 *
 * La capa NO toca Prisma ni lógica de negocio: usa el Tool System 3B sobre
 * la capa de servicios 1B.
 */
import { ToolExecutor, toolRegistry } from "@/lib/agent/tools"
import type { ToolExecutionContext } from "@/lib/agent/tools/types"
import type { BusinessAlert } from "@/lib/agent/tools/domains"
import type { BusinessSummary } from "@/lib/business-intelligence"
import type { Recommendation } from "@/lib/recommendations"
import type { AgentRequest } from "@/lib/agent-core/types"
import { IntentEngine } from "./intent-engine"
import { TaskPlanner } from "./task-planner"
import { ExecutionPlanner } from "./execution-planner"
import { ConfirmationSystem } from "./confirmation-system"
import { ResponseSynthesizer } from "./response-synthesizer"
import { ExplanationEngine } from "./explanation-engine"
import { DefaultTraceRecorder } from "./trace"
import type {
  ExecutionPlan,
  IntelligenceResult,
  StepExecutionResult,
  TraceRecorder,
} from "./types"

export interface IntelligenceLayerDeps {
  intent?: IntentEngine
  planner?: TaskPlanner
  execution?: ExecutionPlanner
  confirmation?: ConfirmationSystem
  synthesizer?: ResponseSynthesizer
  explanation?: ExplanationEngine
  toolExecutor?: ToolExecutor
  /** Crea el recorder de observabilidad para cada request. */
  trace?: (request: AgentRequest) => TraceRecorder
}

export interface IntelligenceRunInput {
  request: AgentRequest
  toolContext: ToolExecutionContext
  confirmedStepIds?: string[]
}

export class IntelligenceLayer {
  private readonly intent: IntentEngine
  private readonly planner: TaskPlanner
  private readonly execution: ExecutionPlanner
  private readonly confirmation: ConfirmationSystem
  private readonly synthesizer: ResponseSynthesizer
  private readonly explanation: ExplanationEngine
  private readonly toolExecutor: ToolExecutor
  private readonly traceFactory: (request: AgentRequest) => TraceRecorder

  constructor(deps: IntelligenceLayerDeps = {}) {
    this.intent = deps.intent ?? new IntentEngine()
    this.planner = deps.planner ?? new TaskPlanner()
    this.execution = deps.execution ?? new ExecutionPlanner()
    this.confirmation = deps.confirmation ?? new ConfirmationSystem()
    this.synthesizer = deps.synthesizer ?? new ResponseSynthesizer()
    this.explanation = deps.explanation ?? new ExplanationEngine()
    this.toolExecutor = deps.toolExecutor ?? new ToolExecutor({ registry: toolRegistry })
    this.traceFactory = deps.trace ?? (() => new DefaultTraceRecorder())
  }

  async run(input: IntelligenceRunInput): Promise<IntelligenceResult> {
    const trace = this.traceFactory(input.request)
    trace.start()

    // 1. Intención
    const intent = this.intent.classify(input.request.message)
    trace.setIntent(intent)
    trace.event("intent", { type: intent.type, confidence: intent.confidence, domains: intent.domains })

    if (!intent.needsTools) {
      trace.finish()
      return {
        status: "no_tools",
        intent,
        plan: null,
        toolResults: [],
        trace: trace.finish(),
      }
    }

    // 3. Plan
    const plan = this.planner.plan(intent)
    trace.setPlan(plan)
    trace.event("plan", { steps: plan.steps.length, domains: plan.domains })

    // 4. Confirmación
    const required = this.confirmation.requirementsFor(plan)
    if (required.length > 0 && !this.confirmation.isFullyConfirmed(plan, input.confirmedStepIds)) {
      const request = this.confirmation.request(plan)
      trace.setConfirmations(request.actions.length)
      trace.event("confirmation", { actions: request.actions.map((a) => a.tool) })
      trace.finish()
      return {
        status: "confirmation_required",
        intent,
        plan,
        confirmation: request,
        toolResults: [],
        reply: request.message,
        trace: trace.finish(),
      }
    }

    // 5. Ejecución
    const outcome = await this.execution.execute(
      plan,
      input.toolContext,
      this.toolExecutor,
      { confirmedStepIds: input.confirmedStepIds }
    )
    for (const result of outcome.results) {
      trace.recordStep(result)
      trace.event("tool", { tool: result.tool, status: result.status, durationMs: result.durationMs })
    }

    const hasUsableResults = outcome.results.some((r) => r.status === "ok")

    // 6. Explicaciones (evidencia de las alertas de negocio)
    const explanations = this.collectExplanations(outcome.results)

    // 7. Síntesis
    const synthesis = {
      intent,
      plan,
      results: outcome.results,
      explanations,
      businessContext: input.request.businessContext,
      memoryContext: input.request.memoryContext,
      message: input.request.message,
    }

    trace.event("synthesis", { hasUsableResults, partialFailures: outcome.partialFailures })
    trace.finish()

    return {
      status: "completed",
      intent,
      plan,
      toolResults: outcome.results,
      synthesizedContext: hasUsableResults ? this.synthesizer.buildPromptContext(synthesis) : undefined,
      reply: hasUsableResults ? undefined : this.synthesizer.buildFallbackReply(synthesis),
      trace: trace.finish(),
    }
  }

  private collectExplanations(results: StepExecutionResult[]): string[] {
    const explanations: string[] = []
    for (const result of results) {
      if (result.status !== "ok") continue

      if (result.tool === "analytics.businessAlerts") {
        const data = result.output?.data
        if (!Array.isArray(data)) continue
        explanations.push(...this.explanation.explainAlerts(data as BusinessAlert[]))
        continue
      }

      if (result.tool === "analytics.businessMonitor") {
        const data = result.output?.data as BusinessSummary | undefined
        if (!data || !Array.isArray(data.insights)) continue
        explanations.push(...this.explanation.explainSummary(data))
      }

      if (result.tool === "recommendations.list") {
        const data = result.output?.data as { recommendations?: Recommendation[] } | null | undefined
        if (!data || !Array.isArray(data.recommendations)) continue
        explanations.push(...this.explanation.explainRecommendations(data.recommendations))
      }
    }
    return explanations
  }
}

export type { IntelligenceResult, ExecutionPlan }
