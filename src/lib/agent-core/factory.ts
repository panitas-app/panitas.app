/**
 * Factory del Agent Core (FASE 3A).
 *
 * Cablea la configuración central, el Model Router, el AI Provider Manager y los
 * adaptadores de proveedor (OpenRouter + NVIDIA NIM). Para cambiar proveedor o
 * modelo por tarea solo se modifica configuración/factory, NUNCA el Agent Core.
 */
import { loadAgentConfig } from "./config"
import type { AgentCoreConfig } from "./config"
import type { AIProvider, LLMProvider } from "./providers/types"
import { ModelRouter } from "./model-router"
import { OpenRouterProvider } from "./providers/openrouter"
import { NvidiaNimProvider } from "./providers/nvidia"
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
  /** FASE 3E: instancia de AIProvider compartida (para tool calling nativo). */
  provider?: AIProvider
}

/**
 * Construye el registro de proveedores (OpenRouter + NVIDIA NIM). Siempre se
 * registran ambos: el Model Router decide cuál usar por tarea y el error de
 * "key faltante" solo aparece si la tarea apunta a un proveedor sin API key.
 */
function buildProviders(config: AgentCoreConfig): Record<string, LLMProvider> {
  return {
    openrouter: new OpenRouterProvider({
      apiKey: config.openrouter.apiKey,
      baseUrl: config.openrouter.baseUrl,
      appTitle: config.openrouter.appTitle,
      httpReferer: config.openrouter.httpReferer,
      defaultModel: config.models.chat.model,
    }),
    nvidia: new NvidiaNimProvider({
      apiKey: config.nvidia.apiKey,
      baseUrl: config.nvidia.baseUrl,
      defaultModel: config.models.chat.model,
    }),
  }
}

/**
 * Construye solo la capa de proveedores (AIProvider) sin el pipeline completo.
 * Útil para módulos que consumen LLM de forma puntual (p.ej. el copiloto 7B)
 * sin cargar el agente entero. Mantiene el conocimiento de los proveedores
 * dentro de agent-core (regla: ningún módulo externo conoce proveedores concretos).
 */
export function createAgentAiProvider(options: DefaultAgentCoreOptions = {}): AIProvider {
  const config = options.config ?? loadAgentConfig()
  const metrics = options.metrics ?? new ProviderMetrics()

  const router = new ModelRouter(config.models)

  return new AIProviderManager({
    providers: buildProviders(config),
    router,
    metrics,
    defaults: config.defaults,
  })
}

/** Construye el Agent Core completo con los proveedores configurados (único punto de cableado). */
export function createDefaultAgentCore(options: DefaultAgentCoreOptions = {}): PanitasAgent {
  const config = options.config ?? loadAgentConfig()
  const metrics = options.metrics ?? new ProviderMetrics()

  const router = new ModelRouter(config.models)

  const provider = options.provider ?? new AIProviderManager({
    providers: buildProviders(config),
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
