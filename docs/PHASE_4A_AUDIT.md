# PANITAS — Auditoría FASE 4A (Agent Intelligence Layer)

> Fecha: 2026-08-02 · Rama: `develop-v2` · Base: `f7cddf4` (FASE 3E)
> Objetivo: identificar las limitaciones actuales del flujo de razonamiento antes de construir la capa de inteligencia.

---

## 1. Alcance

Se auditaron los seis módulos que participan en el razonamiento del agente:

| Módulo | Ruta | Fase |
|---|---|---|
| Agent Core | `src/lib/agent-core/` (19 archivos) | 3A |
| Tool System | `src/lib/agent/tools/` (19 archivos + `domains/`) | 3B |
| Conversation Engine | `src/lib/conversation/` + `src/services/conversation.service.ts` | 3C |
| Memory System | `src/lib/agent/memory/` | 3D |
| Business Context | `src/lib/agent/context/` + `src/lib/agent/profile/` | 3D |
| AI Provider Manager | `src/lib/agent-core/providers/` | 3A |

## 2. Flujo de razonamiento ACTUAL (documentado)

```
Usuario → /api/agent/chat (CSRF → rate-limit → roles → gate basic_ai)
        → ConversationEngine.chat
            ├─ ensureConversation + guardar mensaje user
            ├─ historial limitado (30 msg / 8000 chars / 30 días)
            ├─ BusinessContextBuilder.build → profile (6+ queries) + memory (retriever)
            ├─ AgentRequest { message, history, businessContext, memoryContext }
            └─ PanitasAgent.handle
                 → RequestPipeline.run (5 etapas, UNA llamada al LLM)
                    1. ContextBuilder (system prompt)
                    2. PermissionChecker (acceso + tools)
                    3. ToolResolver.resolveAndExecute  ← UNA tool (1C), heurística
                    4. provider.chat(...)              ← UNA llamada LLM
                    5. ResponseFormatter
```

### 2.1 Hallazgo principal: razonamiento **single-shot**

- El `ToolResolver.detectIntent` (`agent-core/tool-resolver.ts:53-56`) devuelve un **string** (tool 1C) o `null`, decidido por heurística (`routeAgentIntent`) o por `request.tool`.
- `resolveAndExecute` retorna `[]` o **exactamente 1** resultado (`tool-resolver.ts:59-85`).
- El pipeline llama al proveedor **una sola vez** (`pipeline.ts:60`), con el resultado de la tool inyectado en el system prompt. No hay bucle de iteración modelo↔tools ni ejecución multi-tool.

## 3. Limitaciones identificadas (por módulo)

### 3.1 Agent Core (3A) — `src/lib/agent-core/`

| # | Limitación | Evidencia |
|---|---|---|
| A1 | No existe clasificación de intención tipada; la "intención" es un string de tool | `tool-resolver.ts:53-56` |
| A2 | No existe ningún tipo de plan de ejecución (ni multi-tool) | `types.ts` (solo `plan` = suscripción) |
| A3 | El `ContextBuilder` no lista las tools en producción: `factory.ts:50` crea `new ContextBuilder()` sin `toolsProvider` → `context-builder.ts:72` devuelve `[]` | `agent-core/factory.ts:50`, `context-builder.ts:72` |
| A4 | `businessContext`/`memoryContext` solo se inyectan si el llamador los trae; el núcleo no consulta contexto | `context-builder.ts:68-70` |
| A5 | Sin límite de tokens del historial en el Agent Core (lo limita la capa 3C) | `context-builder.ts:36-40` |
| A6 | Sesiones solo en memoria (persistencia la provee 3C) | `session-manager.ts:39-71` |

### 3.2 Tool System (3B) — `src/lib/agent/tools/`

| # | Limitación | Evidencia |
|---|---|---|
| B1 | El `ToolExecutor.execute` ejecuta **una única tool por llamada**; no hay `executeMany`/batch/DAG | `executor.ts:39-93` |
| B2 | No hay orquestación (secuencial/paralela) ni dependencias entre tools | (no existe `Promise.all` multi-tool salvo dentro de analytics) |
| B3 | Las 24 tools 3B están **inertes**: `setupAgentTools()` no se invoca y el resolver 3A usa el registry 1C | 3E |
| B4 | No hay política de reintentos ni consolidación multi-resultado | `executor.ts` |
| B5 | El `bridge` (`toLegacyAgentTool`) está listo pero sin auto-cablear | `bridge.ts:8-9` |

### 3.3 Conversation Engine (3C) — `src/lib/conversation/`

| # | Limitación | Evidencia |
|---|---|---|
| C1 | Orquesta el agent 3A pero no tiene noción de "plan" ni de confirmación antes de ejecutar | `engine.ts:56-149` |
| C2 | `saveTurn` de memoria es fire-and-forget (sin reintento ni cola) | `engine.ts:115-117` |
| C3 | El perfil se reconstruye en cada turno (6+ queries, sin caché/TTL) | `builder.ts:108-133` |

### 3.4 Memory System (3D) — `src/lib/agent/memory/`

| # | Limitación | Evidencia |
|---|---|---|
| M1 | `touchAccess` (frecuencia) existe pero nunca se llama → el componente 0.10 de scoring siempre 0 | `memory.repository.ts:144-149`, `retriever.ts:113-139` |
| M2 | `clean()` nunca corre automáticamente (sin scheduler) | solo tests |
| M3 | `scope="user"` no se usa en la práctica | `extractor.ts:44,61` |
| M4 | Sin compresión/resumen de historial (solo recorte) | `conversation/context-builder.ts:5-7` |

### 3.5 Business Context (3D) — `src/lib/agent/context/` + `profile/`

| # | Limitación | Evidencia |
|---|---|---|
| P1 | Perfil reconstruido por turno, sin caché | `builder.ts:108-133` |
| P2 | `toAgentMemoryContext`/`toPromptFragment` no usados en el chat | `business-context-builder.ts:150-158` |

### 3.6 AI Provider Manager (3A) — `src/lib/agent-core/providers/`

| # | Limitación | Evidencia |
|---|---|---|
| R1 | Retries/timeout/backoff correctos (250·2^n, cap 8s; solo retryable) | `manager.ts:85-150`, `errors.ts:69-74` |
| R2 | OpenRouter Free compatible (stream:false, modelo free) | `openrouter.ts:46` |
| R3 | No hay function-calling del LLM: las tools son decisión del resolver (regex), no del modelo | `tool-resolver.ts` |

## 4. Limitaciones del flujo de razonamiento (resumen)

1. **Sin clasificación de intención** — no se distingue consulta/acción/análisis/reporte antes de actuar (A1).
2. **Sin plan de ejecución** — nunca se decide *qué* tools, *en qué orden*, *cuáles en paralelo* (A2, B2).
3. **Sin ejecución multi-tool** — a lo sumo una tool por turno (A2, B1).
4. **Sin confirmación** — las tools destructivas 3B (`products.delete`, `orders.updateStatus=cancelled`, `inventory.updateStock=decrease/adjustment`) podrían ejecutarse sin que el usuario confirme si se cablearan al runtime.
5. **Sin síntesis estructurada** — la respuesta final es el LLM con resultados crudos en el system prompt; no hay componente de síntesis reutilizable (A3, C1).
6. **Sin explicación** — nada explica el *porqué* de una recomendación con evidencia.
7. **Sin observabilidad del razonamiento** — no se registra intención, plan, tiempos por tool, ni confirmaciones (solo auditoría de tool unitaria en 3B).

## 5. Oportunidades (estado positivo a reutilizar)

- El `ToolExecutor` 3B ya fuerza aislamiento de negocio, permisos, validación de input y logging (`executor.ts:39-93`) → la orquestación puede delegar en él.
- `toolRegistry.metadata()` expone las 24 tools como `ToolMetadata` segura (sin `execute`) → el Task Planner puede catalogar sin riesgo.
- `buildServiceContext` (3B) convierte el contexto autenticado a `StoreServiceContext` → las tools no tocan Prisma.
- El ConversationEngine ya compone `businessContext` + `memoryContext` + historial → solo falta insertar la capa de razonamiento antes de `agent.handle`.
- El provider manager soporta reintentos y tiempo por llamada → la observabilidad puede medir también el LLM.

## 6. Conclusión y alcance de la FASE 4A

La FASE 4A construye `src/lib/agent-intel/` (Intelligence Layer) **entre el Conversation Engine y las Tools**, sin tocar la lógica de negocio ni el Agent Core en su estructura:

```
Agent Core 3A (pipeline + LLM)
     ↑  request enriquecido (intelligenceContext + skip de tools legacy)
Conversation Engine 3C ──► Intelligence Layer 4A (nuevo)
     │                        ├─ Intent Engine
     │                        ├─ Task Planner
     │                        ├─ Execution Planner
     │                        ├─ Confirmation System
     │                        ├─ Explanation Engine
     │                        ├─ Response Synthesizer
     │                        └─ Trace (observabilidad)
     ▼
Tool System 3B (24 tools, executor) → Services 1B → Repositories → Prisma
```

No se añaden features de negocio ni tools nuevas; solo la capacidad de **razonar antes de actuar** con lo existente.
