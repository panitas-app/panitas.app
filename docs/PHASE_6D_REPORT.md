# FASE 6D — Inteligencia Financiera — Reporte

## Resumen ejecutivo

Se construyó un **panel ejecutivo de inteligencia financiera** sobre datos
reales que el negocio ya registra (ventas, gastos, créditos/cobranza y
proveedores). El motor produce indicadores por período (hoy/semana/mes) con
comparativa contra el período anterior, un resumen en lenguaje natural, e
insights accionables priorizados por impacto, con acciones rápidas que navegan
al dashboard o consultan al asistente. El asistente responde 6 preguntas
financieras nuevas y Business Memory aprende las preferencias del panel.

**Verificación:** `tsc --noEmit` OK · **90 tests nuevos** (58 núcleo + 9 prefs +
6 listener + 11 ejecutor IA + 6 detección) · suite completa en verde
(**985 tests**, 119 archivos) · sin cambios de schema (no requiere `db:push`).

## Qué se implementó

### 1. Núcleo (`P1` — `src/lib/financial-intelligence/`)
- **`financial-types.ts`** — `FinancialPeriod` (`today|week|month`),
  `FinancialRange`, `FinancialIndicators` (ingresos, gastos, flujo, por cobrar
  con vencidos/recuperación/top deudores, por pagar con vencidas/top
  proveedores), `FinancialInsight`, `FinancialAction`, `FinancialSummary`,
  `FinancialPanel`.
- **`financial-engine.ts`** — `FinancialEngine` con dependencias inyectables
  (`db`, `SalesService`, `CreditService`, `SupplierService`), `periodRange`
  (rango actual + anterior), `computeIndicators` (consultas en paralelo),
  `getIndicators` con **caché** `FinancialCache` (TTL 60 s) por clave
  `financial:indicators:{storeId}:{period}:{fromISO}`, `getSummary`,
  `getInsights`, `getPanel`, `invalidateStore` y `defaultFinancialCache`
  compartido.
- **`index.ts`** — barrel que exporta types/priority/actions/insights/summary/
  engine.

### 2. Resumen ejecutivo (`P2`)
- `financial-summary.ts`: `summaryTone` (warning si flujo negativo, vencidos o
  por pagar > por cobrar; si no positive/neutral) y `buildExecutiveSummary`
  (párrafos naturales solo con datos reales, moneda `es-EC`/USD).

### 3. Insights, prioridad y acciones (`P3`)
- `financial-priority.ts`: prioridad base por categoría + escalado a **alta**
  solo cuando ventas ≤ −25 % o gastos ≥ +50 %; `compareInsights`/
  `sortInsightsByPriority`.
- `financial-actions.ts`: acciones `link` (rutas reales del dashboard) y
  `assistant` (`/dashboard/assistant?q=`).
- `financial-insights.ts`: 12 categorías emitidas solo con respaldo de datos
  (umbrales 10 % variación, 60 % concentración, 50 % recuperación).

### 4. APIs (`P4`)
- `GET /api/financial` — panel completo o vistas `summary`/`insights`.
- `GET|POST /api/business-memory/finanzas/preferences`.

### 5. UI (`P5`)
- `src/components/dashboard/financial/`: `financial-types.ts` (tipos cliente,
  períodos, metadatos de prioridad/tono, helpers `money`, `assistantHref`…),
  `kpi-grid.tsx` (6 KPIs), `executive-summary.tsx` (resumen + tono + botón
  "Preguntar a Panitas" + barra por cobrar vs por pagar), `insights-list.tsx`.
- `/dashboard/finanzas` reemplazada: períodos, vistas persistidas, carga de
  prefs, registro de uso, `TopCollectList`/`TopPayList`, `LoadingState`.
- `/dashboard/assistant` soporta deep-link `?q=`.

### 6. IA (`P6`)
- Catálogo: 6 acciones de dominio `finanzas` (`salud_financiera`,
  `que_revisar_hoy`, `por_cobrar_vs_pagar`, `principales_gastos`,
  `clientes_mayor_deuda`, `proveedores_pagar_primero`).
- `rich.ts`: `financialHealthBlocks`, `financialReviewBlocks`,
  `financialCobrarVsPagarBlocks`, `financialTopDebtorsBlock`,
  `financialTopPayablesBlock`, `financialGastosBlocks`.
- `executor.ts`: `financialService` en `ExecutorDeps` + 6 casos; `periodRange`
  para gastos del mes. `conversation/factory.ts` inyecta `FinancialEngine` con
  `defaultFinancialCache`.

### 7. Eventos + Business Memory (`P7`)
- `event-listeners/financial.listener.ts`: `FINANCIAL_TRIGGER_EVENTS`,
  throttle por tienda (5 s), invalidación inyectable (default:
  `defaultFinancialCache.clearStore`). Cableado en `event-system` y `index`.
- `business-memory/financial-preferences.ts`: 3 claves
  `bm.preference.finanzas.*` (período e indicadores por repetición;
  visualización explícita con `importance: LOW`).

## Tests (90 nuevos)

- **`tests/financial-intelligence/` (58)**: `financial-engine.test.ts` (18:
  agregación, topDebtors/topPayables, caché, invalidación por tienda,
  `periodRange`, panel), `financial-summary.test.ts` (11), `financial-insights
  .test.ts` (14), `financial-priority.test.ts` (10), `financial-actions
  .test.ts` (5).
- **`tests/business-memory/financial-preferences.test.ts` (9)**: defaults,
  umbral de repetición, dominio/claves, visualización explícita, aislamiento
  por store, no-escritura redundante, valores no soportados, coexistencia.
- **`tests/events/financial-listener.test.ts` (6)**: invalidación por eventos,
  exclusión de no-financieros, throttle, fallback a caché compartida,
  tolerancia a errores, cobertura de los 20 tipos de eventos.
- **`tests/conversational-actions/financial-executor.test.ts` (11)**: las 6
  acciones con motor simulado (flujo negativo/positivo, insights vacíos, top
  deudores/proveedores, gastos por categoría).
- **`tests/conversational-actions/detector.test.ts` (+6)**: detección de las 6
  frases nuevas (además del test global de la primera señal de cada acción).

## Verificación

- `npx tsc --noEmit` → OK
- `npx vitest run` → **985 tests / 119 archivos en verde** (baseline 895 + 90)
- `npx eslint` y `npm run build` → pasos finales

## Notas

- Sin cambios de schema ni migraciones: el motor reutiliza `Order`,
  `OrderPayment`, `Expense`, `SupplierInvoice`/`SupplierPayment` y los
  servicios existentes (Sales/Credit/Supplier).
- Los insights **nunca se inventan**: solo se emiten cuando los datos los
  respaldan y escalan de prioridad solo con umbrales objetivos.
- La caché se comparte entre API y asistente y se invalida únicamente con
  eventos financieros (throttle por tienda), cumpliendo el requisito de
  invalidación selectiva.
- Guía funcional: [`docs/FINANCIAL_INTELLIGENCE.md`](./FINANCIAL_INTELLIGENCE.md).
