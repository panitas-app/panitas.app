/**
 * Request Pipeline (FASE 3A).
 *
 * Orquesta las etapas en orden estricto:
 *
 *   Usuario → Context Builder → Permission Checker → Tool Resolver → AI Provider Manager → Response Formatter → Respuesta
 *
 * El pipeline no sabe nada de OpenRouter: depende de `AIProvider` (manager) y de los
 * componentes inyectados. Devuelve SIEMPRE `AgentResponse` (los errores de proveedor
 * se normalizan vía el formatter, sin exponer raw).
 */
import type { AgentRequest, AgentResponse, AgentSession } from "./types"
import type { AIProvider, ProviderResponse } from "./providers/types"
import type { ContextBuilder } from "./context-builder"
import type { PermissionChecker } from "./permission-checker"
import type { ToolResolver } from "./tool-resolver"
import type { ResponseFormatter } from "./response-formatter"

export interface RequestPipelineDeps {
  contextBuilder: ContextBuilder
  permissionChecker: PermissionChecker
  toolResolver: ToolResolver
  provider: AIProvider
  formatter: ResponseFormatter
}

export class RequestPipeline {
  constructor(private readonly deps: RequestPipelineDeps) {}

  async run(request: AgentRequest, session: AgentSession): Promise<AgentResponse> {
    const taskType = request.taskType ?? "chat"
    const opts = { sessionId: session.id, taskType }

    // 1. Context Builder (base, sin tool results todavía)
    const context = this.deps.contextBuilder.buildBase({
      request,
      sessionId: session.id,
      history: session.messages,
    })

    // 2. Permission Checker (acceso general al asistente)
    const decision = this.deps.permissionChecker.checkRequest(request)
    if (!decision.allowed) {
      return this.deps.formatter.formatError(new Error(decision.reason ?? "Acceso denegado al asistente"), request, {
        ...opts,
        toolCalls: [],
      })
    }

    // 3. Tool Resolver (detecta y ejecuta la herramienta del mensaje, si aplica)
    const toolResults = await this.deps.toolResolver.resolveAndExecute(request, this.deps.permissionChecker)

    // 4. Inyectar resultados en el contexto y llamar al proveedor
    const enriched = toolResults.length > 0 ? this.deps.contextBuilder.withToolResults(context, toolResults) : context
    let providerResponse: ProviderResponse
    try {
      providerResponse = await this.deps.provider.chat(enriched.messages, taskType)
    } catch (error) {
      return this.deps.formatter.formatError(error, request, { ...opts, toolCalls: toolResults })
    }

    // 5. Response Formatter (nunca raw del proveedor)
    return this.deps.formatter.format(providerResponse, request, { ...opts, toolCalls: toolResults })
  }
}
