# FASE 7A — Centro Unificado de Conversaciones — Reporte

## Resumen ejecutivo

Se construyó el **Centro Unificado de Conversaciones (Omnichannel Inbox)**: un
bandeja de 3 columnas (lista · conversación · contexto del cliente) donde el
negocio atiende chats de varios canales (WhatsApp, Instagram, Messenger,
Webchat, Email) **sin conectar proveedores reales todavía** (la fase deja la
arquitectura y la experiencia listas). El asistente IA **solo sugiere**
(resumen, intención, borrador de respuesta, historial relevante); el humano
decide. Incluye CRM en contexto, etiquetas, prioridad, asignación, notas,
auditoría, eventos de dominio y Business Memory de atención.

**Verificación:** `tsc --noEmit` OK · `eslint` (módulos de la fase) OK ·
**26 tests nuevos** (13 IA + 6 listener + 7 prefs) en verde · suite completa en
verde. **Requiere `npm run db:push`** (modelos nuevos `InboxChannel`,
`InboxConversation`, `InboxMessage`, `InboxParticipant`, `InboxTag`,
`InboxConversationTag`, `InboxNote`, `InboxAiSummary`).

## Qué se implementó

### 1. Schema Prisma (`P0`)
- 8 modelos `Inbox*` + relaciones en `Store`, `Customer`, `User`.
- Aplicado con `npm run db:push` + `prisma generate` (Postgres `localhost:5433`,
  contenedor `panitas-postgres`).

### 2. Núcleo (`P1`–`P5` — `src/lib/inbox/`)
- **`conversation-types.ts`** — constantes (estados, prioridad, etiquetas,
  canales) y DTOs **puros sin Prisma**; `buildInboxRecommendations`.
- **`channel-manager.ts`** — canales enable/disable/verificar.
- **`conversation-service.ts`** — CRUD, estados, prioridad, pin, asignación,
  etiquetas, notas; auditoría (`createAuditEntry`) + eventos `{domain:"inbox"}`.
- **`message-service.ts`** — `addMessage`/`markRead`, actualiza `lastMessageAt`.
- **`conversation-context.ts`** — contexto CRM (órdenes, créditos, favoritos,
  interacciones, notas).
- **`conversation-ai.ts`** — `InboxAiProvider` + `InboxConversationAiService`
  (persiste en `InboxAiSummary`, fallback) + `HeuristicInboxAiProvider`.
- **`index.ts`** — barrel FASE 7A.
- Todos los errores con `ServiceError` (404/400) desde `@/services/errors`.

### 3. API (`P6` — `/api/inbox/**`)
- 14 endpoints bajo `/api/inbox` + `/api/business-memory/inbox/preferences`.
- Gate `unified_chat` vía `requireInboxStore` (401 sin sesión o sin feature).
- `{ action: "summary"|"intent"|"suggestion"|"relevant_history" }` en
  `POST /api/inbox/[id]/ai`.

### 4. UI (`P7`)
- `src/components/inbox/`: `api.ts` (cliente tipado, tipos puros),
  `conversation-list.tsx`, `conversation-thread.tsx`, `customer-context.tsx`,
  `inbox-client.tsx`.
- `/dashboard/conversaciones` con gate `unified_chat` + `FeatureLockScreen`.

### 5. Eventos + Business Memory
- `inbox.listener.ts` — 6 eventos `conversation.*`, throttle 5 s por tienda,
  falla silencioso; `conversation-history.listener.ts` filtra `domain`.
- `inbox-preferences.ts` — canales, etiquetas, importantes, orden bajo
  `bm.preference.inbox.*`.

### 6. Tests (`P8`)
- `tests/inbox/conversation-ai.test.ts` — 13 tests: intención/sentimiento con
  y sin tildes, resumen, borrador, historial, `buildInboxRecommendations` por
  señales, servicio con fallback heurístico cuando el proveedor lanza, listado
  de análisis persistidos.
- `tests/events/inbox-listener.test.ts` — 6 tests: notifica inbox, ignora
  `assistant`, ignora tipos ajenos, throttle, notify que lanza no rompe, cubre
  los 6 eventos.
- `tests/business-memory/inbox-preferences.test.ts` — 7 tests: defaults,
  aprendizaje de canales/etiquetas sin duplicados, importantes, orden explícito
  LOW, no reescritura si igual, aislamiento por tienda.

## Decisiones clave

- **Tipos puros solo en `conversation-types.ts`** para que los componentes
  cliente no arrastren Prisma al bundle del navegador.
- **IA nunca responde automáticamente**: 4 acciones de soporte, resultado en
  panel con "Usar como borrador".
- **Fallback heurístico determinista** cuando el proveedor de IA lanza
  (`source: "heuristic"`), normalizando tildes para detección robusta.
- **Errores unificados con `ServiceError`** y mapeo de status en la API.
- **Dominio `inbox`** en eventos para no colisionar con el asistente (FASE 3C).
- **Auditoría en toda mutación** junto al evento de dominio.
- **Multi-tenant estricto** (`getCurrentStore`) + feature gate en UI y API.

## Pendientes (fuera de alcance)

1. Conectores reales de WhatsApp/Instagram/Messenger (webhooks + envío).
2. LLM real implementando `InboxAiProvider`.
3. Notificaciones en vivo (WebSocket/polling).
4. Plantillas/macros y encuestas de satisfacción.
