# FASE 3D — Reporte del Business Context & Memory System

**Rama:** `develop-v2` · **Estado:** Implementado y verificado · **Fecha:** 02/08/2026

---

## 1. Resumen

Construido el **sistema de contexto empresarial y memoria** sobre 3A/3B/3C: Panitas ahora
conoce cada negocio (perfil, métricas, productos/clientes clave, plan, permisos) y
**recuerda** información relevante entre turnos (preferencias, hechos, clientes, productos,
configuración, eventos) con clasificación por importancia, almacenamiento persistente en
BD, recuperación con scoring y limpieza. La extracción es **determinista (sin LLM por
turno)**, el guardado es **best-effort** y todo respeta el **aislamiento por negocio**
(`storeId` como frontera). Preparación **RAG futura** solo como interfaces (sin proveedor).

## 2. Entregables

### Persistencia
- **Modelo Prisma `BusinessMemory`** con `@@unique([storeId, key])`, índices de recuperación
  y relaciones en `User`/`Store`/`Negocio`. Aplicado con `npm run db:push` (backup previo `backup-2026-08-02T19-49-57-317Z.sql`).

### Memory System (`src/lib/agent/memory/`)
- `types.ts` — contratos (`MemoryItem`, `MemoryStore`, interfaces RAG futuras), TTL por importancia.
- `classifier.ts` — clasificador **determinista** (regex + heurística): señales por kind, escalado a CRITICAL, descarte de small talk.
- `storage.ts` — `MemoryStore` sobre el `MemoryRepository` (frontera `storeId`, filas → DTO).
- `retriever.ts` — scoring `0.45·keyword + 0.25·importancia + 0.20·recencia + 0.10·frecuencia` + fusión semántica opcional (RAG).
- `cleaner.ts` — expiración + cap por negocio (500, prioriza importancia/antigüedad).
- `extractor.ts` — extrae hechos de cada turno (mensaje + tool results `analytics.*`/`inventory.*`); no guarda la respuesta del asistente.
- `manager.ts` — fachada (`remember/recall/forget/search/list/saveTurn/buildMemoryContext/clean`) + eventos + auditoría.
- `index.ts` — barrel público (conserva exports legados 1C).
- `src/repositories/memory.repository.ts` — única puerta a BD; toda query con `storeId`.

### Business Context & Profile
- `src/lib/agent/profile/builder.ts` — `BusinessProfileBuilder` (info, categoría, config, plan, métricas, top productos/clientes, dueño) sobre Store/Negocio/User/Analytics/Ventas.
- `src/lib/agent/context/business-context-builder.ts` — bundle `{ business, user, plan, permissions, metrics, profile, memory }` + fragmentos compactos (límites de tokens).
- `src/repositories/business.repository.ts` — lectura de Store/Negocio/User (solo lectura).

### Integración (aditiva, retrocompatible)
- `AgentRequest` +`businessContext`/`memoryContext` (opcionales) y `ContextBuilder` 3A los inyecta al system prompt si vienen.
- `ConversationEngine.chat` recupera memoria → construye contexto → responde → guarda el turno (best-effort, nunca rompe el chat).
- `factory.ts` cablea `MemoryManager` + `BusinessProfileBuilder` + `BusinessContextBuilder` por defecto.
- Eventos `memory.created/updated/deleted` añadidos a `src/events/event.service.ts` (+ catálogo).

### API
- `GET /api/agent/profile` — perfil inteligente (auth + rate limit).
- `GET /api/agent/memory` — lista/búsqueda (`?query=&limit=&minImportance=`).
- `DELETE /api/agent/memory?key=...` — elimina un ítem (admin/manager + CSRF).

## 3. Verificación

| Chequeo | Resultado |
|---|---|
| `npx tsc --noEmit` | ✅ limpio |
| `eslint` archivos nuevos/modificados | ✅ limpio (0 errors; el repo tiene 2418 issues pre-existentes ajenos) |
| `vitest run` | ✅ **265/265** (213 previos + **52 nuevos** de 3D) |
| `npm run build` | ✅ compila, TypeScript OK, exit 0 |

### Tests nuevos (`tests/memory/`)
- `classifier.test.ts` (10) — señales, CRITICAL, TTL, no-guardar small talk, claves estables.
- `extractor.test.ts` (6) — candidatos por turno, tools `analytics.*`/`inventory.*`, tools fallidas ignoradas.
- `retriever.test.ts` (6) — tokenizer ES, scoring, orden, **aislamiento entre negocios**, minImportance, límite.
- `cleaner.test.ts` (4) — expiración, cap con prioridad, frontera por negocio.
- `manager.test.ts` (10) — upsert/eventos, clasificación automática, aislamiento, saveTurn best-effort, buildMemoryContext.
- `storage.test.ts` (5) — delega al repositorio, serialización JSON, `rowToItem`.
- `context.test.ts` (7) — bundle, fragmentos, truncado, fallback sin providers, permisos por rol.
- `engine-memory.test.ts` (4) — contextos inyectados al agente, saveTurn tras responder, **memoria caída no rompe el chat**.

## 4. Fuera de alcance (como diseñado)

- **Proveedor RAG/embeddings**: solo interfaces preparadas; sin LLM de embeddings.
- **Clasificación con IA**: la extracción es determinista (costo/latencia por turno).
- **Resumen/compresión de memoria** y recuerdos multi-turno avanzados.
- **Canales externos** (WhatsApp/Instagram/Facebook) y automatizaciones proactivas.
- **UI de gestión de memoria** (solo API GET/DELETE; el panel del asistente no cambia).

## 5. Documentación

- `docs/PHASE_3D_AUDIT.md` (auditoría + arquitectura objetivo)
- `docs/MEMORY_SYSTEM.md` (arquitectura del Memory System)
- `docs/MEMORY_RULES.md` (reglas de clasificación/guardado)
- `docs/BUSINESS_CONTEXT_ARCHITECTURE.md` (perfil + contexto)
- `docs/EVENT_CATALOG.md` (sección 15: eventos de memoria)
