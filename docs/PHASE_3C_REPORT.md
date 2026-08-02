# FASE 3C — Reporte del Conversation Engine

**Rama:** `develop-v2` · **Estado:** Implementado y verificado · **Fecha:** 02/08/2026

---

## 1. Resumen

Construido el **sistema conversacional persistente** sobre el Agent Core (3A) y el Tool
System (3B): conversaciones y mensajes en BD, historial reinyectado y limitado por turno,
API autenticada y panel de UI conectado. El agente no accede a la BD (flujo
Agent → Tools → Services → Repository → Database) y todo respeta el aislamiento
por negocio/usuario.

## 2. Entregables

### Backend
- **Modelos Prisma** `Conversation` + `ConversationMessage` con índices de aislamiento y FKs `Cascade`/`SetNull`. Aplicados con `npm run db:push` (backup previo `backup-2026-08-02T19-25-37-909Z.sql`).
- **Repositorio** `src/repositories/conversation.repository.ts` — todas las queries con `userId`+`storeId` en el `where`.
- **Servicio** `src/services/conversation.service.ts` — create/get/ensure/list/history/save/delete + mapeo `Date→ISO` + eventos + auditoría.
- **Context Builder conversacional** `src/lib/conversation/context-builder.ts` — límites por cantidad (30), tamaño (8k) y antigüedad (30 días).
- **Engine** `src/lib/conversation/engine.ts` + factory — turno completo: guardar usuario → contexto limitado → `PanitasAgent.handle` → guardar respuesta.
- **Cambio mínimo a 3A**: `RequestPipeline` prioriza `request.history` cuando se provee (retrocompatible; tests 3A intactos).
- **API**: `POST /api/agent/chat`, `GET /api/conversations`, `GET/DELETE /api/conversations/[id]` — auth + CSRF + rate limit + errores controlados.
- **Eventos** `conversation.created`, `message.created`, `conversation.deleted` (catalog + emisor).
- **Auditoría** `conversation.created` / `conversation.deleted` / `agent.completed` / `agent.failed` vía `createAuditEntry`.

### Frontend
- `src/components/assistant/assistant-panel.tsx` reconectado al API: lista de conversaciones, nueva, borrar (confirmación), estados por mensaje (`sending/thinking/completed/error`), indicador de escritura.

## 3. Fix de entorno previo (bloqueante)
- **Contenedor PostgreSQL roto**: el bind-mount a `C:\Users\Usuario\Desktop\Panitas v3\init.sql` impedía arrancar `panitas-postgres`. Recreado sin el mount (el volumen `panitas-v3_postgres_data` conserva los datos) y expuesto en **puerto 5433** (5432 lo usa `panitas-leads-db`). `.env` actualizado (`DATABASE_URL`/`DIRECT_URL` → 5433).
- **Bug pre-existente de rutas**: `src/app/blog/[slug]` vs `src/app/blog/[category]` rompía **todas** las rutas en dev (cualquier request fallaba). Renombrado `blog/[slug]/page.tsx` → `blog/[category]/page.tsx` (mismo parámetro de nivel 1 que la ruta de post). Sin cambio de URLs.

## 4. Verificación

| Chequeo | Resultado |
|---|---|
| `npx tsc --noEmit` | ✅ limpio |
| `eslint` archivos nuevos/modificados | ✅ limpio (el proyecto tiene 2418 problemas pre-existentes ajenos) |
| `vitest run` | ✅ **213/213** (195 previos + 18 nuevos de 3C) |
| `npm run build` | ✅ compila, TypeScript OK, 215 páginas estáticas |
| Smoke API sin sesión | ✅ `GET /api/conversations` → 401 · `POST /api/agent/chat` → 403 · `GET /api/conversations/[id]` → 401 |
| Integración BD real | ✅ crear/save user/save assistant/history/list/delete/404 post-delete |

### Tests nuevos (`tests/conversation/`)
- `context-builder.test.ts` (5) — límites cantidad/tamaño/antigüedad, conserva el más reciente.
- `conversation.service.test.ts` (9) — creación, reutilización, **aislamiento (404 a conversación ajena)**, guardado, borrado.
- `engine.test.ts` (4) — flujo completo, reutilización de conversación, límite de historial al agente, fallo del agente persistido.

## 5. Fuera de alcance (como diseñado)
- Memoria avanzada (resumen/compresión) — el Context Builder es la puerta preparada.
- Canales externos (WhatsApp/Instagram/Facebook) y automatizaciones.
- Streaming real (contrato SSE documentado; v1 responde completo).

## 6. Documentación
- `docs/PHASE_3C_AUDIT.md`, `docs/CONVERSATION_ENGINE_ARCHITECTURE.md`, `docs/CONTEXT_MANAGEMENT.md`, `docs/CHAT_API_REFERENCE.md`, `docs/EVENT_CATALOG.md` (eventos 3C añadidos).
