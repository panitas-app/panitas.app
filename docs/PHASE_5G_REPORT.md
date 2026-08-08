# FASE 5G — Business Memory Engine — Reporte

## Resumen ejecutivo

Se construyó la capa **`src/lib/business-memory/`** que dota a Panitas de una
**memoria permanente del negocio**: terminología, preferencias, reglas
operativas y patrones de uso. El asistente ahora **consulta solo los recuerdos
relevantes antes de responder** (nunca toda la memoria) y **aprende por
repetición con umbral** (nunca consolida una preferencia con una sola acción) o
por **enseñanza explícita** del usuario. Todo se administra desde un **panel**
(`/dashboard/memoria`) con ver, editar, eliminar, desactivar el aprendizaje y
restablecer.

La memoria pertenece al negocio y queda **aislada por tenant** (`storeId`
siempre en el `where`), sin compartirse entre negocios. Reutiliza la tabla
`BusinessMemory` (FASE 3D) con claves prefijadas `bm.` — **sin migraciones** y
sin mezclarse con el historial conversacional.

**Verificación:** `tsc --noEmit` OK · **711 tests verdes** (41 nuevos en
`tests/business-memory/*`) · `next build` OK (solo warning pre-existente de
Edge https en `src/lib/bcv/fetcher.ts`).

## Qué se implementó

### 1. Capa `src/lib/business-memory/` (lógica pura)
- **`memory-types.ts`**: `BusinessMemoryKind` (`terminology | preference |
  operational_rule | usage_pattern`), `source` (`explicit | learned |
  observation | system`), `status` (`confirmed | candidate`), `LearningConfig`
  (umbrales por tipo, TTL de candidatos, límites), interfaz `BusinessMemoryStore`
  e `IntentQuery`.
- **`memory-rules.ts`**: configuración por defecto (umbrales 3/3/2/4, TTL 7d,
  máx 50 candidatos / 200 recuerdos), detección de **dominio del negocio**
  (ventas, inventario, clientes, finanzas, proveedores, pedidos) por palabras
  clave, por intención y por los dominios de la capa de inteligencia (4A); y
  **extracción de señales** deterministas:
  - terminología explícita ("yo llamo pacientes a mis clientes")
  - moneda con intención contextual ("prefiero trabajar en dólares")
  - reglas operativas ("nunca vender sin stock", "confirmar antes de eliminar")
  - patrones de uso por dominio (consultas frecuentes)
- **`memory-store.ts`**: implementación **en memoria (tests)** y **Prisma**
  sobre `BusinessMemory` con `scope="store"` y claves `bm.`; aislamiento por
  `storeId`; `touch` de frecuencia sin alterar `updatedAt`; `removeAll` con
  claves protegidas.
- **`memory-learning.ts`**: `BusinessMemoryLearner`. Observaciones **explícitas**
  se confirman al instante; **implícitas** acumulan fuerza como candidatas con
  TTL y se consolidan al cruzar el umbral; aprendizaje desactivado = no-op;
  ajuste persistido (`bm.settings.learning_enabled`) que sobrevive al reset.
- **`memory-query.ts`**: `BusinessMemoryQuerier`. Ranking determinista
  (tokens + dominio + importancia + frecuencia/recencia), devuelve **solo
  recuerdos confirmados** y un fragmento compacto para el prompt.
- **`memory-engine.ts`**: fachada (query, aprender, listar, editar, eliminar,
  restablecer, activar/desactivar, estadísticas).
- **`memory-ui.ts`**: modelo de vista del panel (agrupación por tipo, etiquetas,
  estado, fuerza) — funciones puras.
- **`factory.ts` / `index.ts`**: `createBusinessMemoryEngine()` (Prisma).

### 2. Integración con el asistente
- **`src/lib/conversation/engine.ts`**:
  - **Antes de responder**: recupera la memoria relevante por intención y la
    inyecta en el `memoryContext` del `AgentRequest` (best-effort).
  - **Tras el turno**: `learnFromTurn({ message, intent, domains })` aprende en
    segundo plano (best-effort, nunca bloquea).
  - Nuevo dep opcional `businessMemory` en `ConversationEngineDeps`.
- **`src/lib/conversation/factory.ts`**: cablea `createBusinessMemoryEngine()`.

### 3. API
- **`GET /api/business-memory`**: listado + estadísticas + estado del aprendizaje.
- **`PATCH /api/business-memory`**: edición de un recuerdo.
- **`DELETE /api/business-memory?key=`**: eliminación de un recuerdo.
- **`POST /api/business-memory/learning`**: `{ enabled }` activa/desactiva.
- **`POST /api/business-memory/reset`**: restablece (admin), conservando el
  ajuste de aprendizaje.
- Todas con rate-limit, `requireRole` y feature `basic_ai` (patrón 5F).

### 4. Panel de gestión
- **`src/components/business-memory/memory-panel.tsx`**: ver por tipo, editar
  (etiqueta + valor JSON), eliminar, switch de aprendizaje y restablecer con
  confirmación.
- **`src/app/dashboard/memoria/page.tsx`** + entrada en el sidebar (sección
  Panitas IA, roles admin/manager).

## Criterios de finalización (spec 5G)
- [x] Capa `src/lib/business-memory/` con los módulos del spec (engine, store,
      learning, query, rules, types, ui).
- [x] Tipos de memoria: terminología, preferencias, reglas operativas y
      patrones de uso.
- [x] Aprendizaje solo por comportamiento repetitivo (umbral) o configuración
      explícita; **nunca con una sola acción**.
- [x] Antes de responder, el agente consulta la memoria para adaptar
      vocabulario, preferencias, reglas y valores por defecto.
- [x] Panel: ver, editar, eliminar, desactivar aprendizaje, restablecer.
- [x] Privacidad: memoria del negocio, aislada por tenant, sin compartir.
- [x] Optimización: solo recuerdos relevantes por intención, ranking, límite,
      expiración de candidatos.
- [x] Tests 5G: creación/actualización, aprendizaje automático, consulta por
      intención, aislamiento por negocio, desactivación, rendimiento (límites).
- [x] Typecheck, tests (711) y build verdes.
- [x] Docs: `BUSINESS_MEMORY.md`, `PHASE_5G_REPORT.md`.

## Archivos clave
- **Nuevos**: `src/lib/business-memory/{memory-types,memory-rules,memory-store,
  memory-learning,memory-query,memory-engine,memory-ui,factory,index}.ts`,
  `src/app/api/business-memory/{route,learning/route,reset/route}.ts`,
  `src/components/business-memory/memory-panel.tsx`,
  `src/app/dashboard/memoria/page.tsx`.
- **Modificados**: `src/lib/conversation/engine.ts` (inyección antes de
  responder + aprendizaje tras el turno), `src/lib/conversation/factory.ts`,
  `src/components/dashboard/sidebar.tsx` (entrada "Memoria").
- **Tests**: `tests/business-memory/{helpers,memory-rules,memory-learning,
  memory-store,memory-query,memory-engine,memory-ui}.test.ts` (41 tests).
- **Docs**: `BUSINESS_MEMORY.md`, `PHASE_5G_REPORT.md`.
