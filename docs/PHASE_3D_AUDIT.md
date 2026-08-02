# FASE 3D — Auditoría del sistema actual (Business Context & Memory)

**Rama:** `develop-v2` · **Fecha:** 02/08/2026

---

## 1. Resumen de qué existe hoy

### 1.1 Agent Core (FASE 3A) — `src/lib/agent-core/`
- **`PanitasAgent.handle(request)`**: asegura sesión, ejecuta el `RequestPipeline`, guarda mensajes en la sesión en memoria y audita (`AgentAuditLogger`).
- **`RequestPipeline`**: Context Builder → Permission Checker → Tool Resolver → AI Provider Manager → Response Formatter. **Ya acepta `request.history`** (priorizado sobre `session.messages`).
- **`ContextBuilder.buildBase`**: construye `system prompt` (negocio + plan + herramientas) + historial + mensaje actual. **No inyecta memoria ni contexto de negocio rico** (solo `metadata.businessName`).
- **`AgentRequest`** (tipos 3A): `userId, storeId, negocioId, plan, role, permissions, message, sessionId, taskType, tool, toolInput, history, metadata`. **No tiene campos de contexto empresarial ni memoria**.
- **`SessionManager`**: sesiones en memoria (in-process), historial de la conversación como contenedor básico.
- **Config/Model Router**: `openrouter` con modelo gratuito por defecto; rutas por tarea vía env (listo para modelos pagos futuros).

### 1.2 Conversation Engine (FASE 3C) — `src/lib/conversation/`
- **`ConversationEngine.chat`**: asegura conversación → guarda mensaje usuario → historial limitado (`buildConversationalHistory`) → `PanitasAgent.handle` → guarda respuesta.
- **Persistencia real**: `Conversation` + `ConversationMessage` (Prisma) con aislamiento `userId+storeId`.
- **No hay memoria persistente**: el historial vuelve a entrar al modelo pero NO se extrae conocimiento del negocio (preferencias, hechos, productos/clientes clave).

### 1.3 Tools (FASE 3B) — `src/lib/agent/tools/`
- **24 tools** en `domains/` (inventory, products, sales, customers, orders, reports, analytics) vía `ToolRegistry` + `ToolExecutor` (permisos, validación, logging, aislamiento por `storeId`).
- El flujo agent→tools es sólido; **las tools producen resultados que hoy no se aprovechan como memoria** (p.ej. `analytics.businessSummary` devuelve métricas que se descartan tras la respuesta).

### 1.4 Analytics — `src/lib/analytics/`
- `getSalesMetrics(storeId)` (hoy/semana/mes), `getInventoryHealth(storeId)` (bajo stock/sin movimiento), `getCustomerMetrics(storeId)`.
- **Son perfectos para alimentar el Business Profile** y el contexto del negocio. Solo falta componerlos en un perfil persistente/estructural.

### 1.5 Modelos de negocio (Prisma)
- `User`, `Negocio`, `Store`, `Product`, `Customer`, `Order`, `OrderItem`, `Plan`, `StoreMember`, `Category`, `Coupon`, `Expense`, `Subscription`, etc.
- Existe **`Conversation` + `ConversationMessage`** (3C). **NO existe** modelo de memoria persistente de negocio.

### 1.6 Contexto/memoria legado (FASE 1C) — `src/lib/agent/{context,memory}/`
- `buildBusinessContext(store, negocio)` → objeto plano básico (sin métricas, sin perfil, sin recuperación).
- `ShortTermMemory` (Map en memoria con TTL) y `LongTermMemory` (solo **interfaces**, sin store persistente implementado).
- **No hay** clasificador de importancia, ni almacenamiento en BD, ni recuperación con scoring, ni limpieza.

---

## 2. Qué falta (gap) para FASE 3D

| Capacidad | Hoy | FASE 3D |
|---|---|---|
| Perfil del negocio (info, categoría, config, productos/clientes clave, métricas) | ✖ | `BusinessProfileBuilder` |
| Contexto empresarial rico (negocio+usuario+plan+permisos+métricas+info relevante) | parcial (solo nombre/plan) | `BusinessContextBuilder` |
| Memoria persistente por negocio (BD) | ✖ (solo interfaces 1C) | `MemoryStorage` + modelo `BusinessMemory` |
| Clasificación de importancia (LOW/MEDIUM/HIGH/CRITICAL) y reglas de guardado | ✖ | `MemoryClassifier` |
| Recuperación de memoria relevante antes de responder | ✖ | `MemoryRetriever` (scoring) |
| Limpieza de memoria (expiración, límite por negocio) | ✖ | `MemoryCleaner` |
| Extracción de hechos de cada turno de chat (sin ML) | ✖ | `MemoryManager` + extractor por reglas |
| Preparación RAG (embeddings, vector search, retrieval semántico) | ✖ | interfaces listas, sin proveedor |
| Integración en el flujo de conversación | ✖ | `ConversationEngine` extendido |
| Aislamiento entre negocios (A no ve memoria de B) | N/A | scope `storeId` en TODA query |

---

## 3. Riesgos y decisiones

### Riesgos
1. **No romper 3A/3B/3C**: extender `AgentRequest` y `ContextBuilder` de forma **aditiva** (campos opcionales; comportamiento idéntico si no vienen). Los tests existentes no pasan esos campos → deben seguir pasando intactos.
2. **No acoplar memory→agent-core**: los tipos del Agent Core se mantienen autónomos; se pasa la memoria como lista plana (`AgentMemoryItem`).
3. **Costo de tokens**: el contexto de negocio + memoria debe ser compacto y limitado (se trunca por tamaño).
4. **Extracción sin IA**: no se usa el LLM para clasificar cada turno (costo + latencia). Se usa clasificador por **reglas deterministas** y se guarda de forma **asíncrona/best-effort**.
5. **Concurrencia de upsert**: `key` único por `(storeId, key)` → el mismo hecho se reescribe (actualiza `updatedAt`), nunca se duplica.

### Decisiones
- **Aislamiento**: la frontera de aislamiento de memoria es `storeId` (negocio). Los ítems pueden ser `scope="store"` (compartidos por el negocio) o `scope="user"` (personales del usuario). El `userId` se registra como autor (auditoría), no como frontera por defecto.
- **Tipos de memoria**: `short_term` (eventos/conversación, expira pronto), `long_term` (preferencias/hechos, persiste), `business` (config/clientes/productos del negocio, persiste). La expiración la decide la importancia.
- **Importancia → TTL**: LOW=1d, MEDIUM=7d, HIGH=30d, CRITICAL=sin expiración.
- **Qué se guarda**: solo lo que el clasificador marca `MEDIUM`+ (preferencias, identidad del negocio, clientes, productos, settings, eventos). El small talk no se guarda.
- **RAG futuro**: se definen `EmbeddingProvider`, `MemoryVectorStore` y `SemanticMemoryRetriever` como interfaces; el `MemoryRetriever` acepta un retriever semántico opcional para fusionar scores. **No se implementa proveedor** en esta fase.

---

## 4. Arquitectura objetivo

```
Conversation (3C) ─► Context (3D) ─► Memory (3D) ─► Agent (3A) ─► Tools (3B)
                        │                 │
                   BusinessContext   MemoryManager
                   Builder            ├─ Classifier
                   │                   ├─ Storage (BD)
                   │                   ├─ Retriever (scoring)
                   └─ BusinessProfile  └─ Cleaner
                      Builder
```

### Flujo del turno (modificado en `ConversationEngine.chat`)
```
Pregunta usuario
   │
   ▼
1. Buscar memoria relevante (MemoryRetriever, scope storeId)
   │
   ▼
2. Construir contexto: historial limitado + BusinessContext + memoria
   │
   ▼
3. Agent Core (pipeline 3A + tools 3B)
   │
   ▼
4. Respuesta al usuario
   │
   ▼
5. Actualizar memoria (extraer hechos del turno, best-effort)
```

### Archivos nuevos
- `src/lib/agent/memory/{types,classifier,storage,retriever,cleaner,manager,extractor,vector,index}.ts`
- `src/repositories/memory.repository.ts`
- `src/lib/agent/profile/{types,builder,index}.ts`
- `src/lib/agent/context/{types,business-context-builder}.ts` (se suman al barrel existente)
- `src/repositories/business.repository.ts`
- Modelo Prisma `BusinessMemory`
- `src/app/api/agent/{profile,memory}/route.ts`
- `tests/memory/*.test.ts`
- Docs: `BUSINESS_CONTEXT_ARCHITECTURE.md`, `MEMORY_SYSTEM.md`, `MEMORY_RULES.md`, `PHASE_3D_REPORT.md`

### Archivos modificados (aditivos)
- `src/lib/agent-core/types.ts` (+`businessContext`, `memoryContext`)
- `src/lib/agent-core/context-builder.ts` (inyecta contexto/memoria en el system prompt si vienen)
- `src/lib/conversation/engine.ts` (memoria + contexto, deps opcionales)
- `src/lib/conversation/factory.ts` (wire real)
- `src/events/event.service.ts` (+`memory.created/updated/deleted`)
- `prisma/schema.prisma` (+`BusinessMemory` y relaciones en `User`/`Store`/`Negocio`)

---

## 5. Verificación esperada
- `npx tsc --noEmit` limpio.
- Tests: 213 actuales + nuevos 3D deben pasar (los de 3A/3B/3C intactos).
- `npm run build` OK.
- Lint limpio en archivos nuevos/modificados (el repo tiene 2418 issues pre-existentes ajenos).
- Smoke API: `GET /api/agent/profile` y `GET /api/agent/memory` con auth → 200/401 correctos.
