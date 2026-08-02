# MODEL_ROUTING — Model Router y configuración por tarea (FASE 3A)

## 1. Objetivo

El Agent Core **nunca escribe nombres de modelo en su código**. Solo pide "resolver la tarea X"; el Model Router devuelve proveedor + modelo + parámetros desde la configuración central.

## 2. Tipos de tarea (`AgentTaskType`)

`chat`, `business_analysis`, `json`, `classification`, `summarization`, `reply_suggestion`.

## 3. Configuración por tarea (env)

| Tarea | Env del modelo | Defaults (temp / maxTokens) |
|---|---|---|
| chat | `CHAT_MODEL` | 0.7 / 1000 |
| business_analysis | `BUSINESS_MODEL` | 0.2 / 2000 |
| json | `JSON_MODEL` | 0 / 2000 |
| classification | `CLASSIFICATION_MODEL` | 0 / 300 |
| summarization | `SUMMARIZATION_MODEL` | 0.3 / 800 |
| reply_suggestion | `REPLY_SUGGESTION_MODEL` | 0.6 / 400 |

Por tarea se pueden sobreescribir además:
- `CHAT_MODEL_PROVIDER` (…patrón `<TASK>_MODEL_PROVIDER`) — proveedor específico.
- `CHAT_MODEL_TEMPERATURE` — temperatura específica.
- `CHAT_MODEL_MAX_TOKENS` — límite específico.

Global: `AI_PROVIDER` (default `openrouter`), `AI_TIMEOUT_MS` (default 30000), `AI_RETRIES` (default 2).

Modelo por defecto de todo: `nvidia/nemotron-3-ultra-550b-a55b:free` (`DEFAULT_FREE_MODEL`).

## 4. `loadAgentConfig` (config.ts)

Lee `process.env`, aplica defaults seguros, parsea enteros/floats con fallback (`toInt`/`toFloat`) y devuelve `AgentCoreConfig`:
- `openrouter`: `{ apiKey, baseUrl, appTitle, httpReferer }`
- `models`: `Record<AgentTaskType, ModelTaskConfig>`
- `defaults`: `{ timeoutMs, retries }`

Env vacío ⇒ configuración válida sin API key (degrada con `ProviderMissingKeyError` en la llamada).

## 5. `ModelRouter` (model-router.ts)

| Método | Comportamiento |
|---|---|
| `resolve(task)` | Ruta para la tarea; si no existe, fallback a `chat` |
| `list()` | Todas las rutas |
| `update(task, patch)` | Cambia config en runtime (preparado para cambio sin deploy) |

`ModelRoute` = `ModelTaskConfig` + `task`.

## 6. Cómo escalar a modelos premium

Hoy todo apunta al modelo gratuito. Para dar premium a ciertas tareas **solo se cambia la variable de entorno** (o `router.update` en runtime): el Core no se modifica.
