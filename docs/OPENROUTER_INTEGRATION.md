# OPENROUTER_INTEGRATION — Integración con OpenRouter (FASE 3A)

## 1. Único punto de acoplamiento

`src/lib/agent-core/providers/openrouter.ts` es el **único módulo de todo el sistema que conoce la API de OpenRouter** para el Agent Core. Implementa `LLMProvider`.

Nota: `src/lib/ai.ts` (importación de inventarios, FASE previa) sigue usando OpenRouter por su cuenta; es un precedente legado que **no se modifica** en esta fase.

## 2. Implementación (sin SDK)

Uso de `fetch` nativo (patrón ya probado en `src/lib/ai.ts`), sin librerías LLM.

- **Endpoint**: `{baseUrl}/chat/completions` (default `https://openrouter.ai/api/v1`).
- **Headers**: `Authorization: Bearer <apiKey>`, `HTTP-Referer`, `X-OpenRouter-Title`, `Content-Type: application/json`.
- **Body**: `{ model, messages, stream: false, temperature?, max_tokens? }`.
- **Timeout**: `AbortSignal` provisto por el manager.

## 3. Errores tipados

| Situación | Error |
|---|---|
| Sin `OPENROUTER_API_KEY` | `ProviderMissingKeyError` |
| Abort por timeout | `ProviderTimeoutError` |
| Falla de red | `ProviderNetworkError` |
| HTTP != 2xx | `ProviderHttpError(status, body)` |
| Sin contenido / JSON inválido | `ProviderInvalidResponseError` |

Todos extienden `ProviderError` (`errors.ts`) con `kind`, `status`, `provider`, `body` opcionales. El resto del sistema decide reintento/failure por `kind` sin conocer OpenRouter.

## 4. Salida estructurada (`generateStructuredOutput`)

Sin dependencia de `response_format` (no todos los modelos free lo soportan):

1. Prompt especial que exige JSON puro (con el JSON Schema embebido).
2. `temperature` forzada a 0 por defecto.
3. Parsing robusto: strip de bloques markdown ```json``` + fallback a extraer el primer objeto `{...}`.
4. Falla con `ProviderInvalidResponseError` si no hay JSON parseable.

## 5. Configuración

```ts
OpenRouterConfig {
  apiKey, baseUrl, appTitle, httpReferer, defaultModel
}
```

Valores por defecto en `config.ts`: base `https://openrouter.ai/api/v1`, título `Panitas`, referer `https://panitas.app`, modelo `DEFAULT_FREE_MODEL`. El API key viene de `OPENROUTER_API_KEY`.

## 6. Reemplazo de proveedor (escenario futuro)

Escribir un nuevo `LLMProvider` (p.ej. `anthropic.ts`) que implemente `chat`/`complete`/`generateStructuredOutput`, registrarlo en `factory.ts` y apuntar `AI_PROVIDER`/`*_MODEL_PROVIDER` en env. **Ningún otro archivo se toca.**
