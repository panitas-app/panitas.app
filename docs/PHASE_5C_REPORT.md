# FASE 5C — Memoria Conversacional + Historial — Reporte

## Resumen ejecutivo

Se añadió una capa de **memoria conversacional inteligente** (`src/lib/conversations/`)
que da contexto por sesión (intención, entidad activa, parámetros conocidos y
pendientes, cambio de tema) y un **resumen estructurado** de lo hecho — todo
persistido en `Conversation` y optimizado para el LLM (solo datos compactos,
**nunca el historial completo**). Sobre esa capa se construyó un **historial de
conversaciones estilo ChatGPT** con sidebar, títulos automáticos, renombrar,
eliminar, buscar y restaurar contexto al reabrir.

**Verificación:** `tsc --noEmit` OK · 522 tests verdes (62 nuevos en 5 archivos) ·
lint limpio en archivos tocados · `next build` OK (solo warning pre-existente de
Edge https en `src/lib/bcv/fetcher.ts`).

## Qué se implementó

### 1. Nueva capa `src/lib/conversations/`
- **`conversation-context.ts`** (puro): dominio, entidad activa, parámetros,
  referencias contextuales ("ese", "ponle", "cámbialo por", "la descripción es…",
  "solo las de ayer", "ordénalos por fecha"), cambio de tema, inactividad y ciclo
  de vida (`active|awaiting_details|ready`).
- **`conversation-summary.ts`**: temas + hechos + resultados con límites
  (12/8/10) y `buildInitialSummary` para conversaciones pre-5C.
- **`conversation-memory.ts`**: fragmento optimizado ≤ 1200 caracteres para el LLM.
- **`conversation-storage.ts`** / **`conversation-search.ts`**: fachada de
  persistencia y búsqueda (ambas con aislamiento por tenant).
- **`conversation-session.ts`**: crear/restaurar/renombrar/eliminar/listar sesiones.
- **`conversation-manager.ts`**: `prepareTurn` (antes del LLM) y `completeTurn`
  (después), `autoTitle`, `generateTitle`, `searchSessions`, `historyMessages`.

### 2. Persistencia
- Columnas `contextState` y `summary` (JSON serializado `String?`) en `Conversation`
  vía `npm run db:push` (backup automático `backups/backup-2026-08-04T22-32-18-467Z.sql`).
- Repositorio: `findMetaById`, `search` (título/contenido/fecha), filtros de fecha.
- Servicio: `rename`, `read/writeContext`, `read/writeSummary`, `search`.

### 3. Integración
- `engine.ts`: `autoTitle` (primer mensaje), `prepareTurn` (referencias +
  memoria), `finalize` → `completeTurn` en los 3 retornos. Best-effort.
- API: `GET /api/conversations?q=` y `PATCH /api/conversations/:id` (rename,
  csrfGuard + roles).
- UI: `chat-history-sidebar.tsx` integrada en `assistant-chat-view.tsx` y
  `animated-ai-chat.tsx`; hook con `renameConversation`/`searchConversations`.

## Criterios de finalización
- [x] Contexto estructurado por sesión con ciclo de vida (ejecutada / cambio de
      tema / inactividad / chat nuevo).
- [x] Referencias contextuales 1–5 + "ahora"/"también" resueltas sin LLM.
- [x] Títulos cortos auto-generados, nunca "Nueva conversación".
- [x] Sidebar responsive con renombrar, eliminar, buscar y restaurar.
- [x] Optimización: solo intención/entidad/datos/estado al LLM, nunca historial.
- [x] Aislamiento por negocio y usuario.
- [x] Tests (62) + docs (`CONVERSATIONAL_MEMORY.md`, `CHAT_HISTORY.md`).

## Limitaciones conocidas
- La detección de dominio es por palabras clave deterministas: frases ambiguas
  entre dominios pueden clasificarse al dominio operativo más fuerte ("gasto"
  gana a "categoría"). No hay modelo de lenguaje en esta capa.
- `buildInitialSummary` reconstruye hechos solo desde mensajes de usuario del
  historial previo a 5C (no re-scannean turnos completos).
- Las referencias expanden el texto que recibe el LLM (`request.message`), pero el
  historial guardado conserva el mensaje original del usuario.

## Archivos clave
- Nueva capa: `src/lib/conversations/*.ts`.
- Modificados: `prisma/schema.prisma`, `src/repositories/conversation.repository.ts`,
  `src/services/conversation.service.ts`, `src/lib/conversation/engine.ts`,
  `src/lib/conversation/factory.ts`, `src/app/api/conversations/{route,[id]/route}.ts`,
  `src/hooks/use-assistant-chat.ts`, `src/components/assistant/chat-history-sidebar.tsx`
  (nuevo), `assistant-chat-view.tsx`, `ui/animated-ai-chat.tsx`.
- Tests: `tests/conversations/*.test.ts` (5 archivos, 62 tests).
