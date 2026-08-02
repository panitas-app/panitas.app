# Memory System — Arquitectura (FASE 3D)

**Rama:** `develop-v2` · **Estado:** Implementado · **Fecha:** 02/08/2026

---

## 1. Propósito

Que Panitas recuerde información relevante de cada negocio entre turnos: preferencias,
identidad, clientes, productos, configuraciones y eventos. La memoria es **persistente
en BD**, se **clasifica por importancia** y se **recupera con scoring** antes de
responder. La extracción es **determinista (sin ML)** y el guardado es **best-effort**.

## 2. Capas

```
Conversation (3C) ─► Context (3D) ─► Memory (3D) ─► Agent (3A) ─► Tools (3B)
                        │                 │
                   BusinessContext   MemoryManager
                   Builder            ├─ Classifier (reglas)
                   │                   ├─ Storage ─► MemoryRepository ─► BD
                   │                   ├─ Retriever (scoring)
                   └─ BusinessProfile  └─ Cleaner (expiración + cap)
                      Builder
```

## 3. Módulos (`src/lib/agent/memory/`)

| Módulo | Responsabilidad |
|---|---|
| `types.ts` | Contratos: `MemoryItem`, `MemoryItemInput`, `MemoryStore`, clasificador, opciones de búsqueda, interfaces RAG futuras (`EmbeddingProvider`, `MemoryVectorStore`, `SemanticMemoryRetriever`). |
| `classifier.ts` | Clasifica un texto en `(kind, importance)` por **regex/heurística**. No usa el LLM. |
| `storage.ts` | Implementación de `MemoryStore` sobre el `MemoryRepository` (BD). Aplica la frontera `storeId` y mapea filas → DTO. |
| `retriever.ts` | Scoring determinista `0.45·keyword + 0.25·importancia + 0.20·recencia + 0.10·frecuencia`; opcionalmente fusiona hits de un retriever semántico (RAG futuro). |
| `cleaner.ts` | Elimina ítems expirados y hace cap por negocio (500 por defecto; prioriza importancia/antigüedad). |
| `extractor.ts` | Extrae candidatos de cada turno (mensaje del usuario + resultados de tools). La respuesta del asistente NO se guarda. |
| `manager.ts` | Fachada: `remember`, `recall`, `forget`, `search`, `list`, `saveTurn`, `buildMemoryContext`, `clean`. Emite eventos y audita. |
| `index.ts` | Barrel público (mantiene exports legados 1C). |

## 4. Persistencia

- **Modelo `BusinessMemory`** (Prisma): `storeId` (frontera), `userId` (autor), `negocioId`,
  `scope` (`store`/`user`), `type` (`short_term`/`long_term`/`business`), `kind`, `importance`,
  `key`, `value` (JSON), `metadata`, `source`, `expiresAt`, `lastAccessAt`, `accessCount`.
- **Upsert por `@@unique([storeId, key])`**: el mismo hecho se reescribe (refresca `updatedAt`), nunca se duplica.
- **Índices**: `[storeId, scope, importance]`, `[storeId, type]`, `[storeId, updatedAt]`, `[negocioId]`, `[expiresAt]`.
- Repositorio: `src/repositories/memory.repository.ts` — toda query con `storeId` en el `where`.

## 5. Flujo por turno (en `ConversationEngine.chat`)

1. Guardar mensaje del usuario y construir historial limitado.
2. **Recuperar** memoria relevante para la pregunta (`MemoryRetriever` con scoring).
3. **Construir contexto** (BusinessContextBuilder): perfil + memoria → fragmentos compactos.
4. Inyectar `businessContext` y `memoryContext` en `AgentRequest` (el `ContextBuilder` 3A los suma al system prompt).
5. Delegar al Agent Core → respuesta.
6. **Guardar el turno** (`MemoryManager.saveTurn`, fire-and-forget, nunca bloquea ni rompe el chat).

## 6. Recuperación (scoring)

```
score = 0.45·keyword + 0.25·importancia + 0.20·recencia + 0.10·frecuencia
```

- **keyword**: solape de tokens (tokenizer en español, ignora acentos y tokens ≤2).
- **importancia**: LOW=0.25, MEDIUM=0.50, HIGH=0.75, CRITICAL=1.00.
- **recencia**: decae exponencialmente (media vida 30 días).
- **frecuencia**: `min(accessCount, 5) / 5`.

La búsqueda lista hasta 100 candidatos del negocio, los puntúa, filtra por importancia
mínima opcional y devuelve los top N (8 por defecto).

## 7. Preparación RAG (futuro, sin proveedor)

- `EmbeddingProvider` (embed(text) → vector), `MemoryVectorStore` (upsert/search/delete),
  `SemanticMemoryRetriever` (retrieve) quedan como interfaces.
- `MemoryRetriever.mergeSemantic` ya está listo para fusionar scores semánticos con el base.
- **No se implementa ningún proveedor en esta fase** (sin LLM de embeddings).
