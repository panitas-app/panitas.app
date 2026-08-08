/**
 * Agent Core (FASE 3A) — barrel público.
 *
 * Única puerta de entrada del núcleo del asistente. `createDefaultAgentCore()`
 * cablea la configuración, el Model Router, el AI Provider Manager, los adaptadores
 * de proveedor (OpenRouter + NVIDIA NIM) y el pipeline. El resto del sistema nunca
 * instancia proveedores directo.
 */

// Config y routing
export { loadAgentConfig, DEFAULT_FREE_MODEL, DEFAULT_OPENROUTER_MODEL, DEFAULT_PROVIDER, DEFAULT_NVIDIA_BASE_URL } from "./config"
export type { AgentCoreConfig, ModelTaskConfig, OpenRouterSettings, NvidiaSettings } from "./config"
export { ModelRouter } from "./model-router"
export type { ModelRoute } from "./model-router"

// Contratos de dominio
export type {
  AgentRequest,
  AgentResponse,
  AgentSession,
  AgentTaskType,
  Conversation,
  Message,
  MessageRole,
  PermissionDecision,
  PipelineContext,
  PipelineMessage,
  ResolvedToolCall,
  ToolCall,
  ToolDescriptor,
  ToolResult,
  UsageInfo,
} from "./types"
export { AGENT_TASK_TYPES } from "./types"

// Errores de proveedor
export {
  ProviderError,
  ProviderHttpError,
  ProviderInvalidResponseError,
  ProviderMissingKeyError,
  ProviderNetworkError,
  ProviderTimeoutError,
  isRetryable,
  providerErrorMessage,
} from "./errors"

// Métricas y auditoría
export { ProviderMetrics } from "./metrics"
export type { LLMCallRecord, LLMCallStatus, ProviderMetricsSummary } from "./metrics"
export { AgentAuditLogger, NoopAuditLogger } from "./audit-logger"
export type { AuditLogEntry, AuditLogger } from "./audit-logger"

// Sesiones
export { SessionManager, InMemorySessionStore } from "./session-manager"
export type { AppendMessageInput, CreateSessionInput, SessionStatus, SessionStore } from "./session-manager"

// Etapas del pipeline
export { ContextBuilder, DEFAULT_SYSTEM_PROMPT } from "./context-builder"
export type { BuildContextInput, ContextBuilderOptions } from "./context-builder"
export { PermissionChecker } from "./permission-checker"
export type { PermissionCheckerOptions } from "./permission-checker"
export { ToolResolver } from "./tool-resolver"
export type { ToolResolverOptions } from "./tool-resolver"
export { ResponseFormatter } from "./response-formatter"
export type { FormatOptions } from "./response-formatter"
export { RequestPipeline } from "./pipeline"
export type { RequestPipelineDeps } from "./pipeline"

// Núcleo
export { PanitasAgent } from "./agent-core"
export type { PanitasAgentDeps } from "./agent-core"

// Factory por defecto
export { createDefaultAgentCore, createAgentAiProvider } from "./factory"
export type { DefaultAgentCoreOptions } from "./factory"

// Adaptadores de proveedor (conocimiento del proveedor aislado en providers/)
export { OpenAICompatibleProvider } from "./providers/openai-compatible"
export type { OpenAICompatibleProviderConfig } from "./providers/openai-compatible"
export { OpenRouterProvider, createOpenRouterProvider } from "./providers/openrouter"
export type { OpenRouterConfig } from "./providers/openrouter"
export { NvidiaNimProvider, createNvidiaNimProvider } from "./providers/nvidia"
export type { NvidiaNimConfig } from "./providers/nvidia"
