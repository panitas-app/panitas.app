# FASE 7B — Conversational AI Copilot — Reporte

## Resumen ejecutivo

Se construyó el **Copiloto Conversacional de IA** sobre el Inbox de la FASE 7A:
análisis automático de cada conversación con detección **multi-intención**
(top 3), **resumen incremental** (caché por `lastMessageId`), **1–3 respuestas
sugeridas ancladas en datos reales** (inventario, CRM, créditos, pedidos) y
**acciones inteligentes** con rutas reales del dashboard. También responde
**consultas en lenguaje natural** sobre el cliente y mantiene **memoria
conversacional** en Business Memory. El copiloto **solo sugiere**: nunca envía
mensajes automáticamente.

**Verificación:** `tsc --noEmit` OK · eslint (módulos de la fase) OK ·
**61 tests nuevos** en `tests/conversation-ai/` en verde · suite completa en
verde · build OK. **Sin cambios de schema** (no requiere `db:push`).

## Qué se implementó

### 1. Módulo `src/lib/conversation-ai/` (`P0`–`P5`)
- **`conversation-types.ts`** — tipos **puros sin Prisma**: 12 intents con
  labels + mapeo a etiquetas del inbox, 10 acciones con `COPILOT_ACTION_HREFS`
  reales, 8 query-intents, `CopilotAnalysis`, `CopilotMemory`, re-exports de
  DTOs del inbox (`InboxSentiment`, `InboxOrderView`).
- **`intent-detector.ts`** — multi-intención top 3 con sentimiento, tópicos,
  confianza y señales por keyword (normalización de tildes) + `detectQueryIntent`.
- **`conversation-summary.ts`** — resumen incremental + `keyFacts`.
- **`customer-context.ts`** — `enrichContext` (pedidos pendientes, `totalDebt`,
  última conversación) + servicio con `findProducts` real en inventario.
- **`response-generator.ts`** — 1–3 sugerencias **grounded** con `rationale` y
  `dataSources`; tonos desde memoria.
- **`action-suggestions.ts`** — intención → acciones deduplicadas con hrefs
  reales y tono por urgencia.
- **`conversation-memory.ts`** — claves `bm.preference.conversation.tono`,
  `bm.usage.conversation.respuestas_frecuentes`,
  `bm.usage.conversation.clientes_frecuentes`; listas con separador `||`.
- **`copilot-llm.ts`** — `CopilotLlmProvider` desacoplado; por defecto
  heurística sin red; OpenRouter vía `createAgentAiProvider` (agent-core).
- **`query-answer.ts`** — 8 intents grounded y honestos (sin datos →
  `dataSources: []`).
- **`copilot-service.ts`** — `analyze` (caché por `lastMessageId`, `force`),
  `query`, `getCached`, `clearCache`; publica eventos y `learn` solo de mensajes
  `agent` reales.

### 2. Eventos (`P5`)
- 4 eventos nuevos en `event-registry.ts`: `conversation.summary.updated`,
  `conversation.response.generated`, `conversation.action.suggested`
  (`conversation.intent.detected` ya existía).
- **`event-listeners/copilot.listener.ts`** nuevo (`registerCopilotListener` con
  store en memoria + hook `onEvent`), exportado por `@/lib/events` y registrado
  en el bundle; `conversation-history.listener` excluye `domain === "copilot"`.

### 3. Agent core (`P5`)
- `createAgentAiProvider()` añadido a `src/lib/agent-core/factory.ts` y
  exportado en `index.ts` (el conocimiento de OpenRouter permanece en
  agent-core).

### 4. API (`P6`)
- **`src/app/api/inbox/[id]/copilot/route.ts`** nuevo: `GET` (caché),
  `POST` con `csrfGuard` + `requireInboxStore`; `action="analyze"` (con
  `force`) y `action="query"`; errores vía `inboxErrorResponse`.

### 5. UI (`P7`)
- **`src/components/inbox/copilot-panel.tsx`** nuevo: resumen + `keyFacts`,
  badges de intención, sugerencias con "Usar como borrador", acciones con href,
  consulta natural, estados loading/error, badge `ai|heuristic`, reanálisis.
- **`conversation-thread.tsx`**: botón "Copiloto" + `useCopilotSuggestion`.
- **`api.ts`**: `getCopilotAnalysis`, `refreshCopilotAnalysis`, `askCopilot`
  (tipos puros de `@/lib/conversation-ai/conversation-types`).

### 6. Tests (`P8`)
- **61 tests en `tests/conversation-ai/`** (7 archivos): multi-intención,
  resumen incremental (mismo objeto sin cambios), sugerencias grounded
  (inventario/crédito/pedido, máx. 3, tono de memoria), mapeo de acciones +
  dedupe + hrefs reales, consultas (8 intents, honestidad sin deuda), memoria
  (tono, frases sin duplicar, clientes frecuentes, parseo con `||`), y servicio
  (fresh/caché/force, query, 4 eventos publicados con listener real).

## Decisiones clave

- **IA solo sugiere**: el resultado nunca se envía automáticamente; el humano
  edita con "Usar como borrador".
- **Multi-intención permitida**: un mensaje puede activar varias intenciones
  (ej. `consulta_producto` + `disponibilidad` + `precio`).
- **Grounded**: las sugerencias usan inventario/CRM/créditos/pedidos reales;
  `dataSources` explícitas; nunca inventar datos.
- **Caché incremental por `lastMessageId`**: no reanalizar la conversación
  completa por mensaje; actualizar solo lo afectado.
- **Tipos puros** (sin Prisma) para que los componentes cliente no inflen el
  bundle.
- **LLM opcional y desacoplado**: heurística determinista por defecto; el LLM
  solo pule conservando los datos; fallback total ante error (`source`).
- **Memoria best-effort** (`Promise.allSettled`); aprende solo de mensajes
  `agent` reales.
- **Eventos `{ domain: "copilot" }`** para no colisionar con inbox/assistant.
- **Sin persistencia nueva en BD**: análisis derivado + caché en memoria.

## Pendientes (fuera de alcance)

1. Envío automático de sugerencias (prohibido por diseño).
2. FASE 7C — Communication Integration Layer (conectores por proveedor).
3. Modelos LLM premium (interfaz lista en `copilot-llm.ts`).
4. Entrenamiento del tono por feedback explícito.
