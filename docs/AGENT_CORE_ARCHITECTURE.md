# AGENT_CORE_ARCHITECTURE — Arquitectura del Agent Core (FASE 3A)

> Rama: `develop-v2`. Núcleo del asistente Panitas, desacoplado del proveedor LLM.

## 1. Propósito

Procesar mensajes del usuario del negocio a través de un pipeline determinista que:
1. Interpreta la intención (router heurístico FASE 1C, sin IA).
2. Ejecuta herramientas de negocio con permisos (registry FASE 1C).
3. Compone el contexto para un LLM.
4. Llama a un proveedor de IA **sin conocerlo**.
5. Normaliza la respuesta (nunca raw del proveedor).
6. Persiste la conversación y audita cada interacción.

## 2. Principio rector (regla de capas)

> **Ningún módulo fuera de `src/lib/agent-core/providers/` conoce a OpenRouter.**

- El Agent Core depende de la interfaz `AIProvider` (manager).
- `factory.ts` es el ÚNICO punto que instancia `OpenRouterProvider`.
- Cambiar de proveedor = escribir un adaptador `LLMProvider` + registrarlo en la factory.

## 3. Estructura de carpetas

```
src/lib/agent-core/
├── types.ts                    # Contratos de dominio (request, response, session, mensajes)
├── config.ts                   # Configuración central por tarea (env) + defaults
├── model-router.ts             # Resuelve proveedor+modelo por tipo de tarea
├── errors.ts                   # Jerarquía ProviderError + isRetryable
├── metrics.ts                  # ProviderMetrics (latencia, intentos, uso, p95)
├── context-builder.ts          # System prompt + historial + mensaje actual
├── permission-checker.ts       # Acceso al asistente y permisos por herramienta
├── tool-resolver.ts            # Puente con el registry/permisos FASE 1C
├── response-formatter.ts       # Normaliza respuestas y errores
├── session-manager.ts          # Conversaciones (usuario, negocio, plan, historial)
├── audit-logger.ts             # Auditoría best-effort vía agentAudit (1C)
├── pipeline.ts                 # Orquesta el flujo del request
├── agent-core.ts               # PanitasAgent (entry point público)
├── index.ts                    # Barrel público
├── factory.ts                  # Cableado de dependencias + OpenRouter
└── providers/
    ├── types.ts                # LLMProvider + AIProvider (interfaces)
    ├── openrouter.ts           # ÚNICO adaptador que conoce OpenRouter
    ├── manager.ts              # AIProviderManager (retries, timeout, métricas)
    └── index.ts                # Barrel de proveedores
```

## 4. Componentes y responsabilidades

| Componente | Responsabilidad |
|---|---|
| `PanitasAgent` | Entry point. Orquesta sesión + pipeline + auditoría + métricas. |
| `RequestPipeline` | Ejecuta las etapas en orden estricto y devuelve siempre `AgentResponse`. |
| `ContextBuilder` | Construye mensajes de proveedor: system (rol/plan/herramientas/resultados) + historial + mensaje actual. |
| `PermissionChecker` | Valida acceso al asistente y que el usuario tenga al menos un permiso requerido por la herramienta. |
| `ToolResolver` | Detecta la herramienta (`request.tool` o `routeAgentIntent`) y delega ejecución en `registry.executeTool` (que ya audita). |
| `AIProviderManager` | Selecciona proveedor/modelo (Model Router), reintenta, timeout, métricas, logging. |
| `ResponseFormatter` | Garantiza que ninguna respuesta sea raw del proveedor. |
| `SessionManager` | Crea/reutiliza sesiones, persiste mensajes, conversación. |
| `ModelRouter` | Mapa tarea → {provider, model, temperature, maxTokens}. |

## 5. Flujo de un request (`handle`)

```
AgentRequest
  → ensureSession (SessionManager.getOrCreateSession)
  → RequestPipeline.run
      1. ContextBuilder.buildBase (system + historial + mensaje)
      2. PermissionChecker.checkRequest  (denegado → formatError)
      3. ToolResolver.resolveAndExecute    (permisos por tool + registry.executeTool)
      4. ContextBuilder.withToolResults    (si hubo resultados)
      5. provider.chat(messages, taskType) (manager → adaptador)
      6. ResponseFormatter.format
  → SessionManager.appendMessage(user + assistant)
  → AuditLogger.record
  → AgentResponse
```

## 6. Garantías

- Siempre devuelve `AgentResponse`; los errores de proveedor se normalizan.
- Respuesta nunca cruda: pasa por `ResponseFormatter`.
- Permisos verificados dos veces (PermissionChecker + `registry.executeTool`).
- El Core no conoce modelos concretos: solo pide "resolver tarea X" al Model Router.
- Sin acoplamiento a planes: el gate por plan queda como hook inyectable futuro.

## 7. Consumo de la infraestructura FASE 1C (sin modificarla)

- `@/lib/agent/registry` → `listTools`, `getTool`, `executeTool`.
- `@/lib/agent/router` → `routeAgentIntent(text)` (detección de intención).
- `@/lib/agent/permissions` → `AgentPermission`, permisos por rol.
- `@/lib/agent/audit` → `agentAudit.record` (auditoría).

## 8. Extensiones futuras

- Persistencia de sesiones en BD (hoy `InMemorySessionStore`).
- Memoria inteligente (short/long-term) conectada al Session Manager.
- Gate por plan (`basic_ai`/`unified_chat` de FASE 2B) como hook inyectable.
- Consumidores: ruta API del panel, WhatsApp worker (FASE 3B+).
