# PHASE_3A_REPORT — Panitas Agent Core

> **Fase:** 3A · Núcleo del asistente (Agent Core) desacoplado del proveedor LLM.
> **Branch:** `develop-v2` · **Estado:** ✅ Implementada, testeada y verificada · **Commit:** pendiente (requiere confirmación del usuario)

---

## 1. Objetivo

Construir el núcleo completo del asistente Panitas: un pipeline que procesa mensajes, ejecuta herramientas de negocio con permisos (FASE 1C), compone contexto para un LLM, llama a un proveedor de IA **sin conocerlo**, normaliza respuestas y persiste conversaciones — listo para conectar LLM real sin cambiar el Core.

## 2. Alcance y no-alcance

**Sí:** contratos, config central + Model Router, AI Provider Manager (facade obligatorio), adaptador OpenRouter (único punto de acoplamiento), pipeline de requests, session manager, response formatter, auditoría, métricas, tests, docs, env vars.

**No:** herramientas de negocio nuevas, automatizaciones proactivas, WhatsApp, memoria inteligente, análisis comercial, conectarse a LLM real, tocar `src/lib/ai.ts`, tocar infraestructura 1C (`src/lib/agent/`).

## 3. Lo construido

### 3.1 Código (`src/lib/agent-core/` + `providers/`)

| Archivo | Rol |
|---|---|
| `types.ts` | Contratos de dominio: `AgentRequest`, `AgentResponse`, `AgentSession`, `Message`, `ToolCall`/`ResolvedToolCall`/`ToolResult`, `Conversation`, `PipelineContext` |
| `config.ts` | `loadAgentConfig`: modelo/proveedor/parámetros por tarea desde env, con defaults seguros |
| `model-router.ts` | Resuelve proveedor+modelo por tarea; fallback a `chat`; `list`/`update` runtime |
| `errors.ts` | `ProviderError` + `http/timeout/network/invalid_response/missing_key` + `isRetryable` |
| `metrics.ts` | `ProviderMetrics`: latencia, intentos, estado, uso, resumen (total/avg/p95/byTask/byProvider/byModel/errorsByProvider) |
| `context-builder.ts` | System prompt (rol/plan/herramientas/resultados) + historial + mensaje actual; `withToolResults` |
| `permission-checker.ts` | Acceso al asistente + verificación de permisos por herramienta (reutiliza 1C) |
| `tool-resolver.ts` | Detecta intención (`request.tool` / `routeAgentIntent`) y delega en `registry.executeTool` |
| `response-formatter.ts` | `format`/`formatStructured`/`formatError` — nunca raw del proveedor |
| `session-manager.ts` | `SessionManager` + `InMemorySessionStore` + interfaz `SessionStore` para persistencia futura |
| `audit-logger.ts` | `AgentAuditLogger` (best-effort vía `agentAudit` 1C) + `NoopAuditLogger` |
| `pipeline.ts` | Orquesta: Context Builder → Permission Checker → Tool Resolver → Manager → Formatter |
| `agent-core.ts` | `PanitasAgent.handle` / `generateStructuredOutput` / sesiones / métricas |
| `index.ts` | Barrel público |
| `factory.ts` | `createDefaultAgentCore` — ÚNICO punto que instancia OpenRouter |
| `providers/types.ts` | `LLMProvider` (adaptador) + `AIProvider` (facade) |
| `providers/openrouter.ts` | ÚNICO módulo que conoce la API de OpenRouter (fetch nativo, headers, parsing JSON robusto) |
| `providers/manager.ts` | Retries con backoff, timeout `AbortSignal`, métricas, logging inyectable |
| `providers/index.ts` | Barrel de proveedores |

### 3.2 Tests (`tests/agent-core/`, 61 nuevos)

| Suite | Tests |
|---|---|
| `model-router.test.ts` | 4 |
| `config.test.ts` | 4 |
| `openrouter.adapter.test.ts` | 8 |
| `provider-manager.test.ts` | 7 |
| `session-manager.test.ts` | 6 |
| `response-formatter.test.ts` | 5 |
| `permission-checker.test.ts` | 5 |
| `tool-resolver.test.ts` | 7 |
| `context-builder.test.ts` | 4 |
| `pipeline.test.ts` | 5 |
| `agent-core.test.ts` | 6 |

## 4. Verificación

| Check | Resultado |
|---|---|
| `npm run typecheck` | ✅ 0 errores |
| eslint (`src/lib/agent-core/**` + `tests/agent-core/**`) | ✅ 0 errores (1 warning corregido: import sin uso en pipeline.ts) |
| `npm test` | ✅ **162/162** (101 previos + 61 nuevos) |
| `npm run build` | ✅ Compila |

Nota: `npm run lint` global sigue mostrando errores **preexistentes** en `src/lib/scanner/*` y `test-api.cjs` (ajenos a 3A, sin tocar).

## 5. Variables de entorno nuevas (`.env.example` actualizado)

`OPENROUTER_BASE_URL`, `OPENROUTER_APP_TITLE`, `OPENROUTER_HTTP_REFERER`, `CHAT_MODEL`, `BUSINESS_MODEL`, `JSON_MODEL`, `CLASSIFICATION_MODEL`, `SUMMARIZATION_MODEL`, `REPLY_SUGGESTION_MODEL`, `AI_PROVIDER`, `AI_TIMEOUT_MS`, `AI_RETRIES` (+ patrón `<TASK>_MODEL_PROVIDER/_TEMPERATURE/_MAX_TOKENS`).

## 6. Docs de la fase

- `docs/PHASE_3A_AUDIT.md` — auditoría previa ✅
- `docs/AGENT_CORE_ARCHITECTURE.md` — arquitectura del núcleo
- `docs/AI_PROVIDER_MANAGER.md` — facade de proveedores
- `docs/OPENROUTER_INTEGRATION.md` — adaptador OpenRouter
- `docs/MODEL_ROUTING.md` — configuración por tarea
- `docs/REQUEST_PIPELINE.md` — pipeline de requests
- `docs/SESSION_SYSTEM.md` — sesiones y conversación
- `docs/RESPONSE_STANDARD.md` — formato estándar de respuestas

## 7. Decisiones clave

1. **Carpeta nueva `src/lib/agent-core/`** separada de la infraestructura 1C (que se consume, no se modifica).
2. **AI Provider Manager obligatorio**: el Core depende de `AIProvider`; solo `factory.ts` conoce el adaptador.
3. **Model Router por env**: sin nombres de modelo hardcodeados; hoy todo gratuito, mañana premium por config.
4. **Sin SDK LLM**: `fetch` nativo + `AbortSignal` (patrón ya probado en `src/lib/ai.ts`).
5. **Permisos dobles**: PermissionChecker + `registry.executeTool`.
6. **Errores tipados** con `kind` permiten reintentar sin conocer el proveedor.
7. **Auditoría best-effort**: nunca rompe la respuesta.
8. Sesiones validadas por `userId + storeId` (no se accede a conversaciones ajenas).

## 8. Riesgos y mitigación

| Riesgo | Mitigación |
|---|---|
| Modelos `:free` lentos o JSON inválido | Timeout configurable, retries, parsing robusto, errores tipados |
| Fuga de acoplamiento a OpenRouter | Regla de capas verificada: solo `providers/openrouter.ts` conoce OpenRouter |
| `src/lib/ai.ts` duplicado | Documentado; migración futura (no tocado en 3A) |
| Fallo del proveedor | Degrada a `AgentResponse { ok:false, error }`, sin crash |
| Sesiones solo en memoria | Interfaz `SessionStore` lista para persistencia en BD |

## 9. Próximos pasos (fuera de 3A)

1. **FASE 3B**: exponer el Agent Core en una ruta API (`POST /api/agent/chat`) con autenticación + gate por plan (`basic_ai`/`unified_chat` de FASE 2B) + límites de requests.
2. Conectar LLM real: `OPENROUTER_API_KEY` en producción y ajustar modelos por tarea.
3. Persistir sesiones en BD (implementar `SessionStore` con Prisma).
4. Migrar `src/lib/ai.ts` al adaptador (consolidar un solo camino OpenRouter).
5. Evaluar WhatsApp Business API y automatizaciones proactivas (eventos FASE 2C).

## 10. Commit pendiente

Incluir todo 3A (código + tests + docs + `.env.example`) en `develop-v2`. Requiere confirmación del usuario.
