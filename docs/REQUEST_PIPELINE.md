# REQUEST_PIPELINE — Pipeline de requests del Agent Core (FASE 3A)

## 1. Orden estricto de etapas

```
Usuario → Context Builder → Permission Checker → Tool Resolver → AI Provider Manager → Response Formatter → Respuesta
```

Implementado en `pipeline.ts` (`RequestPipeline.run(request, session): Promise<AgentResponse>`).

## 2. Etapas en detalle

### 2.1 Context Builder (`buildBase`)
Construye los mensajes para el proveedor:
- `system`: rol del asistente, nombre/negocio y plan del usuario, herramientas disponibles (descriptores) y resultados de ejecución (cuando aplica).
- historial de la sesión (`session.messages`).
- mensaje actual del usuario.

### 2.2 Permission Checker (`checkRequest`)
Valida el acceso general al asistente (rol/permiso de asistente, configurable). Si se deniega → `formatError` inmediato, **sin** llamar al proveedor.

### 2.3 Tool Resolver (`resolveAndExecute`)
- Detección: `request.tool` (explícito) o `routeAgentIntent(message)` (heurístico FASE 1C, sin IA).
- Si no hay intención → no ejecuta herramientas.
- Para cada herramienta: verifica permisos del usuario (checker) y delega la ejecución en `registry.executeTool(ctx, name, input)` (que vuelve a auditar).
- Normaliza cada resultado a `ResolvedToolCall { ok, output|error }` (nunca raw).

### 2.4 Enriquecimiento + proveedor
- Si hubo resultados, `withToolResults` los inyecta en el system prompt.
- `provider.chat(enriched.messages, taskType)` (AI Provider Manager: retries/timeout/métricas).
- Errores del proveedor → `formatError` (nunca se propagan como excepción al llamante).

### 2.5 Response Formatter
Normaliza `ProviderResponse` a `AgentResponse` (trim, ids, sesión, usage, toolCalls, `ok:true`).

## 3. Garantías

- Devuelve **siempre** `AgentResponse` (éxito o error normalizado).
- Sin intención ⇒ la llamada al modelo usa solo el contexto base (sin tool results).
- Los errores de proveedor quedan en `response.error`; no crashean el request.

## 4. Dependencias inyectables

`RequestPipelineDeps`: `contextBuilder`, `permissionChecker`, `toolResolver`, `provider` (`AIProvider`), `formatter`. Construidas por `factory.ts` o por los tests (proveedores falsos).
