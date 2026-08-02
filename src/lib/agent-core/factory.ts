/**
 * Factory del Agent Core (FASE 3A).
 *
 * Cablea la configuración central, el Model Router, el AI Provider Manager y el
 * adaptador OpenRouter. Para conectar otro proveedor (o cambiar de modelo por tarea)
 * solo se modifica configuración/factory, NUNCA el Agent Core.
 */
import { loadAgentConfig } from "./config"
import type { AgentCoreConfig } from "./config"
import { ModelRouter } from "./model-router"
import { OpenRouterProvider } from "./providers/openrouter"
import { AIProviderManager } from "./providers/manager"
import { ProviderMetrics } from "./metrics"
import { ContextBuilder } from "./context-builder"
import { PermissionChecker } from "./permission-checker"
import { ToolResolver } from "./tool-resolver"
import { ResponseFormatter } from "./response-formatter"
import { RequestPipeline } from "./pipeline"
import { SessionManager } from "./session-manager"
import { AgentAuditLogger } from "./audit-logger"
import { PanitasAgent } from "./agent-core"

export interface DefaultAgentCoreOptions {
  config?: AgentCoreConfig
  metrics?: ProviderMetrics
}

/** Construye el Agent Core completo con el proveedor OpenRouter (único punto de cableado). */
export function createDefaultAgentCore(options: DefaultAgentCoreOptions = {}): PanitasAgent {
  const config = options.config ?? loadAgentConfig()
  const metrics = options.metrics ?? new ProviderMetrics()

  const router = new ModelRouter(config.models)

  const openrouter = new OpenRouterProvider({
    apiKey: config.openrouter.apiKey,
    baseUrl: config.openrouter.baseUrl,
    appTitle: config.openrouter.appTitle,
    httpReferer: config.openrouter.httpReferer,
    defaultModel: config.models.chat.model,
  })

  const provider = new AIProviderManager({
    providers: { openrouter },
    router,
    metrics,
    defaults: config.defaults,
  })

  const contextBuilder = new ContextBuilder()
  const permissionChecker = new PermissionChecker()
  const toolResolver = new ToolResolver()
  const formatter = new ResponseFormatter()
  const sessions = new SessionManager()
  const audit = new AgentAuditLogger()

  const pipeline = new RequestPipeline({ contextBuilder, permissionChecker, toolResolver, provider, formatter })

  return new PanitasAgent({ pipeline, sessions, metrics, audit, formatter, router, provider, contextBuilder, permissionChecker })
}
