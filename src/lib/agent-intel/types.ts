/**
 * Contratos de la Agent Intelligence Layer (FASE 4A).
 *
 * Tipos compartidos por el motor de razonamiento: clasificación de intención,
 * planes de ejecución, resultados por paso, confirmaciones, síntesis de
 * respuesta y trazabilidad (observabilidad).
 *
 * Regla de capas: este módulo NO conoce proveedores LLM ni Prisma. Solo
 * coordina Agent Core (3A) + Tool System (3B) → Services (1B).
 */
import type { ToolResponse } from "@/lib/agent/tools/types"
import type { ToolMetadata } from "@/lib/agent/tools/types"

/** Categorías de intención que distingue el asistente. */
export const INTENT_TYPES = [
  "consulta",
  "accion",
  "analisis",
  "configuracion",
  "conversacion",
  "ayuda",
  "reporte",
] as const

export type IntentType = (typeof INTENT_TYPES)[number]

/** Entidades básicas extraídas del mensaje (p.ej. producto, fecha). */
export type IntentEntities = Record<string, string>

/** Clasificación tipada de una solicitud del usuario. */
export interface IntentClassification {
  type: IntentType
  /** Confianza 0..1 del clasificador. */
  confidence: number
  /** Dominios 3B probables (inventory, sales, customers, ...). */
  domains: string[]
  /** Mensaje normalizado analizado. */
  message: string
  /** Entidades extraídas (producto, cantidad, fechas, ...). */
  entities: IntentEntities
  /** Si la solicitud sugiere una acción destructiva. */
  destructive: boolean
  /** Si la intención requiere ejecutar herramientas. */
  needsTools: boolean
  /** Señales que dispararon la clasificación (para explicabilidad). */
  signals: string[]
}

/** Un paso de un plan de ejecución. */
export interface PlannedStep {
  id: string
  /** Nombre de la tool 3B (dominio.nombre). */
  tool: string
  /** Dominio al que pertenece la tool. */
  domain: string
  input: Record<string, unknown>
  /** ids de pasos previos de los que depende (orden secuencial). */
  dependsOn: string[]
  /** Puede ejecutarse en paralelo con sus hermanos. */
  parallel: boolean
  /** Si falla, se puede reintentar. */
  retryable: boolean
  /** Si requiere confirmación explícita del usuario antes de ejecutarse. */
  requiresConfirmation: boolean
  /** Razón por la que el planificador eligió este paso. */
  rationale: string
}

/** Plan de ejecución completo para una solicitud. */
export interface ExecutionPlan {
  id: string
  intent: IntentClassification
  steps: PlannedStep[]
  /** true si al menos un paso exige confirmación. */
  requiresConfirmation: boolean
  /** Dominios cubiertos por el plan. */
  domains: string[]
}

export type StepStatus = "pending" | "running" | "ok" | "error" | "skipped" | "awaiting_confirmation"

/** Resultado de la ejecución de un paso. */
export interface StepExecutionResult {
  stepId: string
  tool: string
  status: StepStatus
  /** Input enviado a la tool (para persistencia y trazas). */
  input?: Record<string, unknown>
  /** Respuesta normalizada de la tool 3B (nunca raw). */
  output?: ToolResponse
  error?: string
  durationMs: number
  /** Intentos realizados (1 + reintentos). */
  attempts: number
}

/** Resultado consolidado de un plan. */
export interface ExecutionOutcome {
  ok: boolean
  /** true si hubo al menos un paso en error pero se continuó. */
  partialFailures: boolean
  results: StepExecutionResult[]
}

/** Una acción que requiere confirmación. */
export interface ConfirmationAction {
  stepId: string
  tool: string
  /** Qué se hará (claro para el usuario). */
  description: string
  /** Impacto si se confirma (no recuperable, reversión de stock, ...). */
  impact: string
}

/** Solicitud de confirmación pendiente. */
export interface ConfirmationRequest {
  actions: ConfirmationAction[]
  /** Mensaje en lenguaje natural para el usuario. */
  message: string
  /** Códigos de confirmación a enviar en la segunda vuelta. */
  confirmCodes: string[]
  requestedAt: string
}

/** Regla declarativa de confirmación por tool. */
export interface ConfirmationRule {
  tool: string
  description: (input: Record<string, unknown>) => string
  impact: (input: Record<string, unknown>) => string
  /** Condición extra sobre el input (p.ej. status === "cancelled"). */
  when?: (input: Record<string, unknown>) => boolean
}

export type TraceEventKind =
  | "intent"
  | "plan"
  | "tool"
  | "confirmation"
  | "synthesis"
  | "error"
  | "retry"

export interface TraceEvent {
  ts: string
  kind: TraceEventKind
  detail?: Record<string, unknown>
  durationMs?: number
}

/** Trazabilidad completa de un turno razonado. */
export interface AgentTrace {
  traceId: string
  startedAt: string
  finishedAt?: string
  intent: IntentClassification | null
  plan: ExecutionPlan | null
  steps: StepExecutionResult[]
  confirmationsRequested: number
  errors: string[]
  events: TraceEvent[]
  totalMs: number
}

/** Contrato del logger de observabilidad. */
export interface TraceRecorder {
  start(): AgentTrace
  event(kind: TraceEventKind, detail?: Record<string, unknown>, durationMs?: number): void
  recordStep(result: StepExecutionResult): void
  setIntent(intent: IntentClassification): void
  setPlan(plan: ExecutionPlan): void
  addError(message: string): void
  setConfirmations(count: number): void
  finish(): AgentTrace
}

/** Opciones de ejecución de un plan. */
export interface ExecutionOptions {
  /** IDs de pasos confirmados explícitamente por el usuario. */
  confirmedStepIds?: string[]
  /** Intentos máximos por paso (default 1). */
  maxRetries?: number
  /** Milisegundos de espera base antes de reintentar. */
  retryDelayMs?: number
}

/** Resultado de la capa de inteligencia para un turno. */
export interface IntelligenceResult {
  status: "confirmation_required" | "completed" | "no_tools"
  intent: IntentClassification | null
  plan: ExecutionPlan | null
  confirmation?: ConfirmationRequest
  toolResults: StepExecutionResult[]
  /** Fragmento de contexto para el LLM del Agent Core (si aplica). */
  synthesizedContext?: string
  /** Respuesta directa sin LLM (confirmación o fallback determinista). */
  reply?: string
  trace: AgentTrace
}

/** Material que consume el Response Synthesizer. */
export interface SynthesisInput {
  intent: IntentClassification
  plan: ExecutionPlan | null
  results: StepExecutionResult[]
  confirmations?: ConfirmationRequest
  explanations?: string[]
  businessContext?: string
  memoryContext?: string
  message: string
}

export type { ToolResponse, ToolMetadata }
