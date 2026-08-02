/**
 * Agent Core (FASE 3A) — PanitasAgent.
 *
 * Núcleo del asistente: orquesta sesiones, pipeline y observabilidad.
 * NO conoce proveedores concretos (solo `AIProvider`), NO conoce OpenRouter,
 * NO tiene herramientas de negocio propias (usa el registry FASE 1C vía Tool Resolver).
 */
import type { AgentRequest, AgentResponse, AgentSession, AgentTaskType } from "./types"
import type { AIProvider, StructuredOutputSchema } from "./providers/types"
import type { RequestPipeline } from "./pipeline"
import type { SessionManager } from "./session-manager"
import type { ProviderMetrics } from "./metrics"
import type { AuditLogger } from "./audit-logger"
import type { ResponseFormatter } from "./response-formatter"
import type { ModelRouter } from "./model-router"
import type { ContextBuilder } from "./context-builder"
import type { PermissionChecker } from "./permission-checker"

export interface PanitasAgentDeps {
  pipeline: RequestPipeline
  sessions: SessionManager
  metrics: ProviderMetrics
  audit: AuditLogger
  formatter: ResponseFormatter
  router: ModelRouter
  provider: AIProvider
  contextBuilder: ContextBuilder
  permissionChecker: PermissionChecker
}

export class PanitasAgent {
  constructor(private readonly deps: PanitasAgentDeps) {}

  /** Procesa un mensaje del usuario a través del pipeline completo. */
  async handle(request: AgentRequest): Promise<AgentResponse> {
    const startedAt = Date.now()
    const session = await this.ensureSession(request)
    const response = await this.deps.pipeline.run(request, session)

    await this.deps.sessions.appendMessage(session.id, { role: "user", content: request.message })
    await this.deps.sessions.appendMessage(session.id, {
      role: "assistant",
      content: response.reply,
      toolCalls: response.toolCalls,
    })

    this.deps.audit.record({
      userId: request.userId,
      storeId: request.storeId,
      sessionId: session.id,
      taskType: response.taskType,
      toolNames: response.toolCalls.map((t) => t.name),
      ok: response.ok,
      error: response.error,
      durationMs: Date.now() - startedAt,
    })

    return response
  }

  /** Ejecuta el proveedor con salida estructurada (JSON) para una tarea. */
  async generateStructuredOutput<T>(
    request: AgentRequest,
    schema: StructuredOutputSchema,
    taskType: AgentTaskType = "json"
  ): Promise<AgentResponse> {
    const session = await this.ensureSession(request)
    const opts = { sessionId: session.id, taskType }

    const decision = this.deps.permissionChecker.checkRequest(request)
    if (!decision.allowed) {
      return this.deps.formatter.formatError(new Error(decision.reason ?? "Acceso denegado al asistente"), request, {
        ...opts,
        toolCalls: [],
      })
    }

    const context = this.deps.contextBuilder.buildBase({
      request,
      sessionId: session.id,
      history: session.messages,
    })

    try {
      const data = await this.deps.provider.generateStructuredOutput<T>(
        context.messages[context.messages.length - 1]?.content ?? request.message,
        schema,
        taskType
      )
      const route = this.deps.router.resolve(taskType)
      const providerResponse = { provider: route.provider, model: route.model, content: "" }
      const response = this.deps.formatter.formatStructured(data, providerResponse, request, { ...opts, toolCalls: [] })

      await this.deps.sessions.appendMessage(session.id, { role: "user", content: request.message })
      await this.deps.sessions.appendMessage(session.id, {
        role: "assistant",
        content: JSON.stringify(data),
        toolCalls: [],
      })
      return response
    } catch (error) {
      return this.deps.formatter.formatError(error, request, { ...opts, toolCalls: [] })
    }
  }

  async getSession(sessionId: string): Promise<AgentSession | null> {
    return this.deps.sessions.getSession(sessionId)
  }

  async listSessions(userId: string): Promise<AgentSession[]> {
    return this.deps.sessions.listSessions(userId)
  }

  getMetricsSummary() {
    return this.deps.metrics.summary()
  }

  getSnapshot() {
    return this.deps.metrics.snapshot()
  }

  private async ensureSession(request: AgentRequest): Promise<AgentSession> {
    return this.deps.sessions.getOrCreateSession(request.sessionId, {
      userId: request.userId,
      storeId: request.storeId,
      negocioId: request.negocioId ?? null,
      plan: request.plan ?? "business",
      metadata: request.metadata,
    })
  }
}
