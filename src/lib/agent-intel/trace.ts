/**
 * Observabilidad del razonamiento (FASE 4A).
 *
 * Registra el ciclo completo de un turno razonado:
 *   - intención detectada,
 *   - plan generado,
 *   - tools utilizadas y tiempo por tool,
 *   - tiempo total,
 *   - errores,
 *   - confirmaciones solicitadas.
 *
 * La traza se acumula en memoria (`AgentTrace`) y, de forma best-effort, se
 * persiste a la auditoría del agente (`agentAudit`) y se refleja en consola.
 * Un fallo de auditoría NUNCA rompe el turno.
 */
import type {
  AgentTrace,
  ExecutionPlan,
  IntentClassification,
  StepExecutionResult,
  TraceEvent,
  TraceEventKind,
  TraceRecorder,
} from "./types"
import { createAuditEntry } from "@/lib/audit"

export interface TraceRecorderOptions {
  /** Persistir la traza a la auditoría del agente (best-effort). */
  audit?: boolean
  /** Imprimir eventos en consola. */
  console?: boolean
}

function makeId(): string {
  return `trace_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

export class DefaultTraceRecorder implements TraceRecorder {
  private trace: AgentTrace
  private readonly options: TraceRecorderOptions

  constructor(options: TraceRecorderOptions = {}) {
    this.options = options
    this.trace = {
      traceId: makeId(),
      startedAt: new Date().toISOString(),
      intent: null,
      plan: null,
      steps: [],
      confirmationsRequested: 0,
      errors: [],
      events: [],
      totalMs: 0,
    }
  }

  start(): AgentTrace {
    return this.trace
  }

  event(kind: TraceEventKind, detail?: Record<string, unknown>, durationMs?: number): void {
    const ev: TraceEvent = {
      ts: new Date().toISOString(),
      kind,
      detail,
      ...(durationMs !== undefined ? { durationMs } : {}),
    }
    this.trace.events.push(ev)
    if (this.options.console) {
      console.log(`[agent-intel] ${kind}`, detail ?? "")
    }
  }

  recordStep(result: StepExecutionResult): void {
    this.trace.steps.push(result)
    if (result.status === "error") {
      this.trace.errors.push(`${result.tool}: ${result.error ?? "error"}`)
    }
  }

  setIntent(intent: IntentClassification): void {
    this.trace.intent = intent
  }

  setPlan(plan: ExecutionPlan): void {
    this.trace.plan = plan
  }

  addError(message: string): void {
    this.trace.errors.push(message)
  }

  setConfirmations(count: number): void {
    this.trace.confirmationsRequested = count
  }

  finish(): AgentTrace {
    this.trace.finishedAt = new Date().toISOString()
    this.trace.totalMs = this.trace.finishedAt
      ? Date.now() - new Date(this.trace.startedAt).getTime()
      : 0

    if (this.options.audit) {
      void this.persist().catch(() => undefined)
    }
    return this.trace
  }

  private async persist(): Promise<void> {
    await createAuditEntry({
      action: "agent.trace",
      entity: "AgentTrace",
      entityId: this.trace.traceId,
      metadata: {
        intentType: this.trace.intent?.type ?? null,
        steps: this.trace.steps.map((s) => ({ tool: s.tool, status: s.status, durationMs: s.durationMs })),
        confirmations: this.trace.confirmationsRequested,
        errors: this.trace.errors,
        totalMs: this.trace.totalMs,
      },
    })
  }
}
