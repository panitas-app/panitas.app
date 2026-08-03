# FASE 4D — Recommendation Engine · Reporte

## Resumen ejecutivo

Se construyó el **motor de recomendaciones operativas** de Panitas: un capa
determinista que responde "¿qué me recomiendas revisar?" con puntos concretos
basados en datos reales del negocio (inventario, ventas, clientes, operaciones y
precios), con **anti-spam persistente** (cooldown por regla + estado
active/viewed/dismissed) y **sin predicciones ni lenguaje alarmista**.

La capa se apoya en el Business Monitor de FASE 4B: el engine consume SOLO el
`MonitorReport` (nunca consulta BD ni servicios directamente), los analizadores
4D mapean observaciones → candidatos vía un catálogo declarativo de reglas, y el
`RecommendationService` (1B) persiste el historial con aislamiento por `storeId`.

**Verificación:** lint limpio en archivos nuevos/4D · `tsc --noEmit` OK ·
**421 tests verdes** (371 preexistentes + **50 nuevos 4D**) · `next build` OK
(solo warning Edge preexistente de `bcv/fetcher.ts`).

## Qué se implementó

| Módulo | Archivo | Responsabilidad |
|--------|---------|-----------------|
| Tipos | `src/lib/recommendations/types/index.ts` | Contratos: Category, Priority, Status, Candidate, Recommendation, RuleDef, Summary, Count |
| Catálogo | `src/lib/recommendations/rules/index.ts` | 12 reglas declarativas (categoría, prioridad, acción de revisión, cooldown, razón) |
| Mapper | `src/lib/recommendations/analyzers/mapper.ts` | `Observation` 4B → `RecommendationCandidate` 4D |
| Analizadores | `src/lib/recommendations/analyzers/{inventory,sales,customer,order,pricing}-analyzer.ts` | Filtran/derivan candidatos por dominio |
| Motor | `src/lib/recommendations/engine/recommendation-engine.ts` | Monitor 4B → analizadores → dedupe → priorización → límite 3-5 |
| Priorización | `src/lib/recommendations/engine/prioritization.ts` | Orden determinista (prioridad, categoría, título) |
| Resumen NL | `src/lib/recommendations/generators/summary-generator.ts` | Texto determinista + `promptContext` para el LLM (tono, sin alarmismo) |
| Servicio 1B | `src/lib/recommendations/services/recommendation.service.ts` | refresh (cooldown + supersession), listActive, countActive, markStatus, summarize |
| Repositorio | `src/repositories/recommendation.repository.ts` | Acceso BD con `storeId` obligatorio en TODA query |
| Tool agente | `src/lib/agent/tools/domains/recommendations.ts` | `recommendations.list` (permiso `report.read`, sin storeId en schema) |
| API | `src/app/api/agent/recommendations/route.ts` | GET (refresh + lista activa) y PATCH (view/dismiss) |
| UI | `src/components/recommendations/` | Card, List, Badge, Detail, RecommendationsSection |
| DB | `prisma/schema.prisma` · `prisma/rls-policies.sql` | Modelo `Recommendation` + RLS por `negocio_id` |

## Flujo del producto

1. El usuario pregunta "¿qué me recomiendas revisar?" (asistente o dashboard).
2. La Intelligence Layer (4A) clasifica el dominio `recommendations` y planifica
   la tool `recommendations.list`.
3. La tool llama `RecommendationService.refresh(ctx)`:
   - el `RecommendationEngine.generate` ejecuta el `BusinessHealthMonitor` (4B),
   - los analizadores 4D convierten observaciones en candidatos,
   - el servicio aplica cooldown, persiste los nuevos y supercede los previos,
   - devuelve la lista activa (máx. 5).
4. La respuesta llega al usuario en lenguaje natural (síntesis LLM con
   `promptContext` del summary generator, o texto determinista sin LLM).

## Anti-spam

- **Cooldown por regla**: `createdAt >= now - cooldownDays` (días en el catálogo).
- **Estado persistente**: `active | viewed | dismissed`; la UI los marca vía PATCH.
- **Supersession**: al renovar una regla, las activas previas de la misma regla
  pasan a `viewed` — nunca dos activas de la misma regla.

## Seguridad y capas

- **Aislamiento**: `storeId`/`userId` siempre del contexto autenticado; el
  repositorio exige `{ storeId }` en toda query y `findById`/`updateStatus`
  validan pertenencia (404 si no).
- **RLS**: políticas SELECT/INSERT/UPDATE en `Recommendation` scoped por
  `auth.user_negocio()` vía `Store.negocio_id`.
- **Reglas del cliente**: sin predicciones, sin decisiones automáticas, sin
  sugerencias de subir/bajar precios, sin palabras urgentes ("debes", "crítico",
  "inmediatamente"), máximo 3-5 recomendaciones.
- **Gate**: la API usa `rateLimit("agent-recommendations", 30, 60*1000)`,
  `requireRole([admin, manager, seller, viewer])` y `requireFeature(plan,
  "basic_ai")`.

## Calidad

- `test(rules)` 8: integridad del catálogo, cobertura de categorías, prohibición
  de lenguaje imperativo/urgente, cooldowns, precios solo "revisar".
- `test(engine)` 9: build desde reporte 4B, dedupe por regla, priorización,
  límite 3-5, estado estable, reglas desconocidas, delegación al monitor,
  propagación de entityId/metricValue.
- `test(analyzers)` 9: mapper y cada analizador (incluye derivación de PRICING).
- `test(service)` 8: cooldown (no recrea dentro del período), cálculo de `since`,
  supersession, mapeo a dominio (ISO/metadata), conteo, markStatus view/dismiss,
  404 por aislamiento de tienda.
- `test(summary-generator)` 5: texto estable/1/múltiples (maxListed), promptContext.
- `test(tool)` 6: registro, permisos, schema sin storeId, delegación con contexto,
  toolFail.
- `test(agent-intel)` 5: intent → dominio `recommendations`, planner →
  `recommendations.list`, sin confirmación (solo lectura).
- Ajuste: `tests/tools/domain-tools.test.ts` acepta `@/lib/recommendations` como
  capa permitida para las tools de dominio (guard de capas).

## Archivos de la fase

- Nuevos: `src/lib/recommendations/**` (tipos, reglas, analizadores, motor,
  priorización, summary, servicio, factory, barrel), `src/repositories/
  recommendation.repository.ts`, `src/lib/agent/tools/domains/recommendations.ts`,
  `src/app/api/agent/recommendations/route.ts`, `src/components/recommendations/`,
  `tests/recommendations/` (7 archivos, 50 tests), `docs/RECOMMENDATION_ENGINE.md`,
  `docs/PHASE_4D_REPORT.md`.
- Modificados: `prisma/schema.prisma`, `prisma/rls-policies.sql`,
  `src/lib/agent/tools/{types,deps,setup}.ts`, `src/lib/agent-intel/
  {intent-engine,task-planner,explanation-engine,agent-intelligence}.ts`,
  `src/components/assistant/assistant-chat-view.tsx`,
  `src/app/dashboard/page.tsx`, `tests/tools/domain-tools.test.ts`,
  `docs/ARCHITECTURE.md`, `docs/CHANGELOG.md`.

> Nota: `src/app/dashboard/page.tsx` conserva errores de lint **pre-existentes**
> (react-hooks/purity `Date.now`, `any`) ajenos a 4D — confirmado con `git stash`.
