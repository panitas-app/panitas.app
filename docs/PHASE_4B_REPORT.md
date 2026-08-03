# FASE 4B — Business Monitor & Operational Intelligence · Reporte

## Resumen ejecutivo

Se construyó la **capa de monitor de negocio** (`src/lib/business-intelligence/`)
que responde **"¿cómo está mi negocio?"** con datos reales, sin predicciones y
sin decisiones por el usuario: monitor de salud, analizadores por módulo
(inventario, ventas, pedidos, clientes, actividad), Insight Engine priorizado
(INFO / WARNING / IMPORTANT) y Business Summary API.

La capa es **determinista sin LLM**, consume exclusivamente los servicios
existentes de FASE 1B (sin Prisma ni repositorios directos) y respeta el
aislamiento de negocio: el `storeId` siempre proviene del contexto autenticado.

**Verificación:** lint limpio en archivos tocados · `tsc --noEmit` OK ·
**368 tests verdes** (330 preexistentes + **38 nuevos 4B**) · `next build` OK.

## Qué se implementó

| Módulo | Archivo | Responsabilidad |
|--------|---------|-----------------|
| Tipos | `src/lib/business-intelligence/types/index.ts` | Contratos de toda la capa |
| Formato | `format.ts` | `money()`, `pct()`, `startOfDay/startOfWeek/startOfMonth` |
| Reglas | `rules/index.ts` | Catálogo declarativo de 15 reglas |
| Analizadores | `analyzers/*.ts` | Detección por módulo (5 analizadores) |
| Insight Engine | `insights/insight-engine.ts` | Observación → insight priorizado (dedupe + límite) |
| Priorización | `insights/prioritization.ts` | `important > warning > info`; `orders > inventory > sales > customers > activity > general` |
| Monitor | `monitors/business-health-monitor.ts` | Orquesta analizadores en paralelo + snapshot + 10 métricas |
| Generador | `generators/business-summary-generator.ts` | Resumen final (saludo, salud, insights, recomendaciones) |
| Factory / Barrel | `factory.ts`, `index.ts` | Wiring y exports |
| Tool | `analytics.businessMonitor` | Tool del agente que expone el resumen |
| API | `GET /api/agent/business-summary` | Resumen operativo (roles + plan + rate limit) |
| UI | `src/components/business/*` | Componentes puros (resumen, salud, insights) |

## Reglas del cliente cumplidas

1. **Sin predicciones**: ningún insight afirma "se agotará en X días"; solo
   describen lo que los datos ya muestran.
2. **Sin decisiones por el usuario**: `recommendations` son revisiones
   sugeridas; la decisión siempre la toma el negocio.
3. **Sin marketing/estrategia**: el monitor reporta operaciones e inventario.
4. **Prioridad operativa**: pedidos pendientes → inventario → ventas → clientes.
5. **Clientes solo por grupos**: nunca insights individuales de clientes salvo
   solicitud explícita.

## Integración

- **Tool System 3B**: `analytics.businessMonitor` (permisos `report.read`) en
  `src/lib/agent/tools/domains/analytics.ts`, con `businessMonitor` inyectable
  vía `ToolDeps` para tests.
- **Agent Intelligence 4A**: el `TaskPlanner` planifica el monitor cuando el
  mensaje menciona "negocio/negocios/empresa" o "cómo está/va el negocio"
  (`mentionsBusiness` → `planBusinessMonitor`). `IntentEngine` reconoce el
  dominio `business`. `ExplanationEngine`/`agent-intelligence` incluyen el
  resumen del monitor en la evidencia del turno.
- **Capa 1B**: nueva consulta mínima `OrderRepository.creditOutstanding` +
  `OrderService.creditOutstanding` (clientes con saldo en credit/partial,
  excluyendo canceladas).
- **API**: `GET /api/agent/business-summary` con rate limit (30/60s),
  `requireRole([admin,manager,seller,viewer])` y gate `requireFeature(plan, "basic_ai")`.

## Decisiones clave

1. **Capa aislada** en `src/lib/business-intelligence/` que depende solo de
   servicios 1B; analizadores, monitor y generador aceptan deps inyectables.
2. **Snapshot sin consultas repetidas**: cada analizador devuelve sus datos
   agregados; el monitor arma `ActivitySnapshot` y las 10 métricas planas.
3. **Salud sin alarmismo**: `estable | atencion | revision`, sin severidad
   "critical".
4. **Comparaciones con umbral**: la variación de ventas se reporta solo si el
   período anterior tiene datos y el cambio ≥ 10%.
5. **Aislamiento por tienda**: todos los analizadores pasan el `ctx`
   autenticado; verificado por tests (`storeId` propagado a cada servicio).
6. **UI pura**: los componentes reciben payload tipado 4B; sin lógica de negocio.

## Tests nuevos (38)

- `tests/business-intelligence/inventory-analyzer.test.ts` (3)
- `tests/business-intelligence/sales-analyzer.test.ts` (4)
- `tests/business-intelligence/order-analyzer.test.ts` (3)
- `tests/business-intelligence/customer-analyzer.test.ts` (3)
- `tests/business-intelligence/insight-engine.test.ts` (8)
- `tests/business-intelligence/business-monitor.test.ts` (4)
- `tests/business-intelligence/business-summary.test.ts` (5)
- `tests/tools/business-monitor-tool.test.ts` (5)
- `tests/services/order.service.test.ts` (+1 `creditOutstanding`)
- `tests/agent-intel/task-planner.test.ts` (+2 planning del monitor)

## Bug corregido durante la fase

- `format.pct` no convertía ratio → porcentaje (`Math.round(1.0)` = "1%" en
  lugar de "100%"). Corregido: `Math.round(value * 100)`.
- `business-summary-generator.buildOverview` devolvía `counts.info: 0`
  hardcodeado; ahora propaga los conteos reales.

## Límites y trabajo futuro

- **Comparación de inventario con períodos previos**: el monitor reporta estado
  actual y más vendidos; una línea de tiempo de stock queda para fases futuras.
- **Frecuencia de generación**: la API es bajo demanda; un cron de resumen
  periódico (email/notificación) queda pendiente.
- **UI en dashboard**: los componentes existen y son consumibles; su montaje en
  el dashboard real queda para una fase de UX.
- **Profundidad por cliente/módulo**: solo se expone bajo solicitud explícita.

## Docs relacionados

- `docs/BUSINESS_MONITOR_ARCHITECTURE.md` · `docs/INSIGHT_ENGINE.md` · `docs/OPERATIONAL_INTELLIGENCE.md`
- `docs/PHASE_4A_REPORT.md` · `docs/PHASE_4A_AUDIT.md` · `docs/ARCHITECTURE.md` · `docs/CHANGELOG.md`
