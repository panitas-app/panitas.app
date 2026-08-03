/**
 * Execution Planner (FASE 4A).
 *
 * Coordina la ejecución de un plan de herramientas:
 *   - ejecuta varias tools (secuencial o en paralelo según el plan),
 *   - respeta dependencias entre pasos,
 *   - reintenta pasos fallidos cuando es apropiado,
 *   - maneja errores parciales (continúa con los pasos independientes),
 *   - consolida los resultados en un `ExecutionOutcome`.
 *
 * NUNCA ejecuta un paso que requiera confirmación sin que el usuario la haya
 * dado (queda en `awaiting_confirmation`). Delega la ejecución unitaria en el
 * ToolExecutor 3B, que ya fuerza aislamiento de negocio, permisos y validación.
 */
import { ToolExecutor } from "@/lib/agent/tools"
import type { ToolExecutionContext, ToolResponse } from "@/lib/agent/tools/types"
import type { ExecutionOptions, ExecutionOutcome, ExecutionPlan, StepExecutionResult } from "./types"

export interface ExecutionPlannerOptions {
  /** Intentos por defecto (1 + reintentos). */
  maxRetries?: number
  /** Espera base antes de reintentar (ms). */
  retryDelayMs?: number
}

/** Errores de red/proveedor que merecen reintento. */
const RETRYABLE_PATTERNS = [
  "timeout",
  "econnreset",
  "etimedout",
  "network",
  "conexion",
  "red no",
  "503",
  "429",
  "internal server error",
]

function isRetryableError(message: string | null | undefined): boolean {
  if (!message) return false
  const normalized = message.toLowerCase()
  return RETRYABLE_PATTERNS.some((p) => normalized.includes(p))
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export class ExecutionPlanner {
  private readonly defaultMaxRetries: number
  private readonly defaultRetryDelayMs: number

  constructor(options: ExecutionPlannerOptions = {}) {
    this.defaultMaxRetries = options.maxRetries ?? 1
    this.defaultRetryDelayMs = options.retryDelayMs ?? 200
  }

  /** Ejecuta el plan con el executor dado y contexto autenticado. */
  async execute(
    plan: ExecutionPlan,
    ctx: ToolExecutionContext,
    executor: ToolExecutor,
    options: ExecutionOptions = {}
  ): Promise<ExecutionOutcome> {
    const maxRetries = options.maxRetries ?? this.defaultMaxRetries
    const retryDelayMs = options.retryDelayMs ?? this.defaultRetryDelayMs
    const confirmed = new Set(options.confirmedStepIds ?? [])
    const byId = new Map(plan.steps.map((s) => [s.id, s]))
    const results: StepExecutionResult[] = []
    const completed = new Set<string>()
    const failed = new Set<string>()
    const pending = new Set(plan.steps.map((s) => s.id))

    // Pasos que exigen confirmación y no está confirmada: NUNCA se ejecutan.
    for (const step of plan.steps) {
      if (step.requiresConfirmation && !confirmed.has(step.id)) {
        pending.delete(step.id)
        results.push({ stepId: step.id, tool: step.tool, status: "awaiting_confirmation", durationMs: 0, attempts: 0 })
      }
    }

    while (pending.size > 0) {
      const ready = [...pending].filter((id) => {
        const s = byId.get(id)!
        return s.dependsOn.every((d) => completed.has(d)) && !s.dependsOn.some((d) => failed.has(d))
      })

      if (ready.length === 0) {
        for (const id of pending) {
          const s = byId.get(id)!
          results.push({ stepId: id, tool: s.tool, status: "skipped", error: "Dependencia fallida", durationMs: 0, attempts: 0 })
        }
        pending.clear()
        break
      }

      const executed = await Promise.all(
        ready.map((id) => this.runStep(byId.get(id)!, ctx, executor, maxRetries, retryDelayMs))
      )

      for (const r of executed) {
        results.push(r)
        pending.delete(r.stepId)
        if (r.status === "ok") completed.add(r.stepId)
        else failed.add(r.stepId)
      }
    }

    const okCount = results.filter((r) => r.status === "ok").length
    const errorCount = results.filter((r) => r.status === "error" || r.status === "skipped").length

    return {
      ok: errorCount === 0,
      partialFailures: errorCount > 0 && okCount > 0,
      results,
    }
  }

  private async runStep(
    step: ExecutionPlan["steps"][number],
    ctx: ToolExecutionContext,
    executor: ToolExecutor,
    maxRetries: number,
    retryDelayMs: number
  ): Promise<StepExecutionResult> {
    let last: ToolResponse | undefined
    let attempts = 0
    const startedAt = Date.now()

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      attempts = attempt
      last = await executor.execute(ctx, step.tool, step.input)
      if (last.success) break
      if (!step.retryable || attempt >= maxRetries || !isRetryableError(last.error)) break
      await sleep(retryDelayMs * attempt)
    }

    const ok = last?.success === true
    return {
      stepId: step.id,
      tool: step.tool,
      input: step.input,
      status: ok ? "ok" : "error",
      output: ok ? last : undefined,
      error: ok ? undefined : last?.error ?? "Error desconocido",
      durationMs: Date.now() - startedAt,
      attempts,
    }
  }
}
