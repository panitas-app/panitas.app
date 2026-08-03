# Response Synthesizer (FASE 4A)

Combina los resultados de las herramientas, el contexto del negocio, la memoria
y las explicaciones en el material final de respuesta
(`src/lib/agent-intel/response-synthesizer.ts`).

## Dos salidas

### 1. `buildPromptContext(input)` → contexto para el LLM

Inyecta en el system prompt del Agent Core (vía `request.intelligenceContext`,
`src/lib/agent-core/types.ts:117` → `context-builder.ts:72-73`):

- `INTENCION_DETECTADA` + confianza y dominios.
- `PLAN_EJECUTADO` (pasos).
- `RESULTADOS_DE_HERRAMIENTAS` (por paso, con estado ok/error).
- `EXPLICACIONES` (del Explanation Engine).
- `CONTEXTO_DE_NEGOCIO` y `MEMORIA_RELEVANTE` (FASE 3D).
- Instrucción final en español para responder con evidencia.

Los resultados se **truncan** (`maxResultChars`, default 1200) para no inflar el
prompt (`response-synthesizer.ts:25-28`).

### 2. `buildFallbackReply(input)` → respuesta determinista SIN LLM

- Todos los pasos fallaron → "No pude completar la acción." + detalle de errores.
- Fallos parciales → resumen de éxitos + `Nota:` con los errores.
- Arrays vacíos → "No se encontraron resultados".
- Sin resultados ni errores → pide reformular.

Se usa en confirmaciones (`confirmation_required`) y cuando la ejecución no dejó
resultados aprovechables (`agent-intelligence.ts:149-152`).

## Regla de una sola llamada al LLM

- Si hay al menos un resultado ok → `synthesizedContext` y el LLM genera la
  respuesta final con evidencia.
- Si no hay resultados ok → `reply` determinista, sin gastar tokens.

## Explanation Engine

`src/lib/agent-intel/explanation-engine.ts` convierte alertas (`BusinessAlert`)
y evidencia de stock en explicaciones causales en español (p.ej. bajo stock
porque "las ventas aumentaron un 30%"). Se alimenta de
`analytics.businessAlerts` (`agent-intelligence.ts:165-173`).

## Archivos

- Implementación: `src/lib/agent-intel/response-synthesizer.ts`, `explanation-engine.ts`
- Contratos: `SynthesisInput` (`src/lib/agent-intel/types.ts:199-208`)
- Tests: `tests/agent-intel/response-synthesizer.test.ts` (7 casos)
