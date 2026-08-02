/**
 * Contratos de dominio del Agent Core (FASE 3A).
 *
 * Tipos compartidos por todo el núcleo: requests, respuestas, conversaciones,
 * mensajes, resultados de herramientas y tipos de tarea.
 *
 * Regla: este módulo NO conoce proveedores LLM. Solo define contratos.
 */
import type { AgentPermission } from "@/lib/agent/permissions"

export const AGENT_TASK_TYPES = [
  "chat",
  "business_analysis",
  "json",
  "classification",
  "summarization",
  "reply_suggestion",
] as const

export type AgentTaskType = (typeof AGENT_TASK_TYPES)[number]

export type MessageRole = "user" | "assistant" | "system" | "tool"

/** Mensaje dentro de una sesión/conversación del agente. */
export interface Message {
  id: string
  role: MessageRole
  content: string
  timestamp: string
  toolCalls?: ResolvedToolCall[]
}

/** Llamada a herramienta propuesta por el agente (antes de ejecutarse). */
export interface ToolCall {
  name: string
  input: Record<string, unknown>
}

/** Llamada a herramienta ejecutada, con resultado normalizado. */
export interface ResolvedToolCall extends ToolCall {
  ok: boolean
  output?: string
  error?: string
}

/** Resultado normalizado de una herramienta (nunca raw). */
export interface ToolResult {
  ok: boolean
  data?: unknown
  error?: string
}

/** Uso de tokens reportado por un proveedor (normalizado). */
export interface UsageInfo {
  promptTokens?: number
  completionTokens?: number
  totalTokens?: number
}

/** Descripción de una herramienta disponible (para el prompt del modelo). */
export interface ToolDescriptor {
  name: string
  description: string
  permissions: string[]
  inputSchema?: Record<string, unknown>
}

/** Conversación persistible entre usuario y agente. */
export interface Conversation {
  id: string
  createdAt: string
  updatedAt: string
  messages: Message[]
  metadata?: Record<string, unknown>
}

export type SessionStatus = "active" | "closed"

/** Sesión de conversación del agente (usuario + negocio + plan + historial). */
export interface AgentSession {
  id: string
  userId: string
  storeId: string
  negocioId: string | null
  plan: string
  status: SessionStatus
  messages: Message[]
  metadata: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

/**
 * Request normalizado que recibe el Agent Core.
 * Lo construye quien lo invoque (ruta API, worker, etc.) desde la sesión/auth.
 */
export interface AgentRequest {
  userId: string
  storeId: string
  negocioId?: string | null
  plan?: string
  role: string
  permissions: AgentPermission[]
  message: string
  sessionId?: string
  taskType?: AgentTaskType
  /** Herramienta explícita (opcional). Si no viene, el resolver intenta detectarla del mensaje. */
  tool?: string
  toolInput?: Record<string, unknown>
  history?: Message[]
  metadata?: Record<string, unknown>
  /** Contexto empresarial del negocio (FASE 3D): se inyecta al system prompt. */
  businessContext?: string
  /** Memoria relevante recuperada para este turno (FASE 3D): se inyecta al system prompt. */
  memoryContext?: string
}

/**
 * Respuesta unificada del Agent Core.
 * NUNCA contiene la respuesta cruda del proveedor: pasa siempre por el Response Formatter.
 */
export interface AgentResponse {
  id: string
  sessionId: string
  userId: string
  storeId: string
  reply: string
  taskType: AgentTaskType
  provider: string
  model: string
  usage?: UsageInfo
  toolCalls: ResolvedToolCall[]
  structured?: unknown
  ok: boolean
  error?: string
  createdAt: string
}

/** Resultado de un chequeo de permisos. */
export interface PermissionDecision {
  allowed: boolean
  reason?: string
  requiredPermission?: AgentPermission
  toolName?: string
}

/** Mensaje listo para el proveedor (estructura compatible con ProviderMessage). */
export interface PipelineMessage {
  role: "system" | "user" | "assistant"
  content: string
}

/** Contexto interno del pipeline (salida del Context Builder). */
export interface PipelineContext {
  request: AgentRequest
  sessionId: string
  messages: PipelineMessage[]
  toolResults: ResolvedToolCall[]
}
