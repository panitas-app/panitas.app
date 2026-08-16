/**
 * Contratos del Tool Calling Nativo (FASE 3E).
 *
 * El LLM interpreta la intención del usuario y decide QUÉ herramientas llamar
 * de forma nativa (function calling). El backend mantiene TODO el control
 * determinista: permisos, aislamiento de negocio, validación de input,
 * resolución de entidades y confirmaciones de acciones destructivas.
 */
import type { AgentRequest, ResolvedToolCall, UsageInfo } from "../types"
import type { ToolExecutionContext } from "@/lib/agent/tools"
import type { ConfirmationRequest } from "@/lib/agent-intel/types"

/** Entrada de un turno agéntico con tool calling nativo. */
export interface AgenticRunInput {
  request: AgentRequest
  /** Contexto autenticado (userId/storeId/permisos). NUNCA se construye del input. */
  toolContext: ToolExecutionContext
  /** FASE 4C: ids de pasos confirmados por el usuario (segunda vuelta). */
  confirmedStepIds?: string[]
}

export type AgenticRunStatus = "completed" | "confirmation_required" | "error"

export interface AgenticRunResult {
  status: AgenticRunStatus
  /** Respuesta final en lenguaje natural (completada) o mensaje de confirmación. */
  reply: string
  provider: string
  model: string
  usage?: UsageInfo
  /** Llamadas ejecutadas con su resultado normalizado (para persistencia/UI). */
  toolCalls: ResolvedToolCall[]
  /** Solo cuando status === "confirmation_required". */
  confirmation?: ConfirmationRequest
  /** Solo cuando status === "error". */
  error?: string
}
