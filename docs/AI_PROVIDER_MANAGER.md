# AI_PROVIDER_MANAGER — AI Provider Manager (FASE 3A)

## 1. Qué es

Capa intermedia **obligatoria** entre el Agent Core y los adaptadores de proveedor LLM. El resto del sistema solo habla con la interfaz `AIProvider` (`providers/types.ts`); nunca con un proveedor concreto.

## 2. Interfaz pública (`AIProvider`)

```ts
chat(messages: ProviderMessage[], taskType?: AgentTaskType, options?: ProviderCallOptions): Promise<ProviderResponse>
complete(prompt: string, taskType?: AgentTaskType, options?: ProviderCallOptions): Promise<ProviderResponse>
generateStructuredOutput<T>(prompt: string, schema: StructuredOutputSchema, taskType?: AgentTaskType, options?: ProviderCallOptions): Promise<T>
```

`taskType` identifica la tarea; el manager resuelve proveedor/modelo/parámetros internamente.

## 3. Responsabilidades (`providers/manager.ts`)

1. **Selección de proveedor y modelo** vía `ModelRouter.resolve(taskType)`.
2. **Retries con backoff exponencial** (`250 * 2^attempt`, tope 8s), SOLO para errores reintentables (`isRetryable`: timeout, network, HTTP 429, HTTP 5xx).
3. **Timeout por llamada** (`AbortSignal.timeout`, default 30s, configurable por tarea).
4. **Métricas** (`ProviderMetrics`): por llamada registra proveedor, modelo, tarea, latencia, intentos, estado y uso.
5. **Logging** inyectable (`logger({ level, message, meta })`), con default a consola.
6. **Base para costos**: el uso de tokens ya se registra en las métricas.

## 4. Semántica de reintentos

| Caso | Comportamiento |
|---|---|
| Error reintentable (timeout/network/429/5xx) y quedan intentos | Reintenta con backoff, `attempts` incrementa |
| Error NO reintentable (`invalid_response`, `missing_key`, HTTP 4xx≠429) | Falla de inmediato (1 intento) |
| `options.signal` abortado por el caller | Se detiene, sin reintentos |
| Agotados los reintentos | Registra métrica de error y relanza el último error tipado |

## 5. Llamada configurable por opciones

`ProviderCallOptions`: `model`, `temperature`, `maxTokens`, `timeoutMs`, `retries`, `signal`, `metadata`.
El manager completa los valores por defecto desde la ruta resuelta (modelo, temperatura, maxTokens) y los defaults globales (timeout, retries).

## 6. Inyección de dependencias

```ts
new AIProviderManager({
  providers: { openrouter },   // mapa id → LLMProvider
  router,                      // ModelRouter
  metrics,                     // ProviderMetrics (opcional)
  defaults: { timeoutMs, retries },
  logger,                      // opcional
})
```

## 7. Regla de capas

Solo `factory.ts` conoce la existencia del manager y del adaptador concreto. El pipeline/agent-core reciben `provider: AIProvider` (el manager) e ignoran cómo está construido.
