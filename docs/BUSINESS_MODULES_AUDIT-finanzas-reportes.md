# Auditoría de Módulos: FINANZAS y REPORTES / Business Intelligence Center

**Proyecto:** Panitas App (Next.js 16 App Router)
**Ruta del código:** `C:\Users\Usuario\Desktop\PanitasApp\panitas`
**Fecha:** 2026-08-11
**Alcance:** Research-only (no se modificó código fuente).

---

## Resumen ejecutivo

| Aspecto | FINANZAS (`/dashboard/finanzas`) | REPORTES / BIC (`/dashboard/analytics`) |
|---|---|---|
| Ruta canónica | `src\app\dashboard\finanzas\page.tsx` | `src\app\dashboard\analytics\page.tsx` + `analytics-content.tsx` |
| Rutas fantasma | — | `/dashboard/reports` es solo un `redirect` |
| Paradigma | Panel ejecutivo con **períodos** (hoy/semana/mes) | BIC con **5 áreas** (Monitor/Operación/Finanzas/Análisis/Reportes) |
| Motor de datos | `FinancialEngine` (caché + eventos) | APIs `/api/analytics*` + `BusinessSummaryGenerator` |
| Gráficos | Solo barras CSS (sin librería) | SVG a mano (`sales-chart.tsx`) + barras CSS (sin librería) |
| Insight system | `FinancialInsight` (12 categorías, prioridad Alta/Media/Baja) | `Insight` (6 categorías, IMPORTANTE/WARNING/INFO) |

**Hallazgos más importantes (transversales):**

1. **Dos sistemas paralelos de insights/alertas** que no se comunican: el motor financiero (`src\lib\financial-intelligence\`) y el monitor de negocio 4B (`src\lib\business-intelligence\`). La página de Finanzas muestra los primeros; el BIC y el chat muestran los segundos. El usuario puede ver "crédito vencido" en un lugar y no verlo en el otro (categorías, prioridades, títulos y componentes son distintos).
2. **`/dashboard/reports` es una ruta muerta**: `src\app\dashboard\reports\page.tsx:4` solo redirige a `/dashboard/analytics`. Sin embargo, `src\lib\financial-intelligence\financial-actions.ts:20` sigue enlazando insights a `/dashboard/reports` ("Abrir reporte financiero", "Ver ventas", "Ver gastos"), por lo que todos esos links pasan por un redirect intermedio.
3. **El Punto de Equilibrio existe, pero enterrado**: vive únicamente en `src\components\dashboard\punto-equilibrio-tab.tsx` (3.ª pestaña del área "Salud Financiera" del BIC), alimentado por `/api/analytics/breakeven`. No aparece en el módulo de Finanzas ni en el Monitor. La lógica de interpretación se duplica entre `src\lib\business-intelligence-center\finance.ts` y el texto del tab.
4. **No hay librería de gráficos**: el gráfico de ventas es un SVG artesanal (`src\components\dashboard\sales-chart.tsx`, 461 líneas) y el resto son barras CSS. `package.json` solo tiene `xlsx`, `jspdf`, `jspdf-autotable`. Cualquier mejora visual es costosa y propensa a bugs.
5. **Formato de moneda inconsistente en 3 sistemas**: `money()` hardcodeado a `$` en Finanzas (`src\components\dashboard\financial\financial-types.ts:173`), `BicMoney` (USD + Bs opcional vía `useBcvRate()`) en el BIC (`src\components\business-intelligence-center\bic-shared.tsx:159`), y `$X.toFixed(2)` suelto en Gastos (`src\components\dashboard\gastos-page.tsx:152`), Punto de Equilibrio (`src\components\dashboard\punto-equilibrio-tab.tsx:174`) y Cierres (`src\components\dashboard\cierres-tab.tsx:237`).

---

# Módulo 1 — FINANZAS (Inteligencia Financiera)

## 1.1 PURPOSE

Panel ejecutivo financiero que responde "¿cómo está el dinero de mi negocio?" en tres períodos (hoy, esta semana, este mes). Combina ventas, gastos, cuentas por cobrar (créditos) y cuentas por pagar (proveedores) en un solo lugar, con resumen en lenguaje natural, indicadores con variación vs. período anterior e insights accionables.

- Meta documentada en `src\lib\financial-intelligence\index.ts:2-7` (FASE 6D).
- Intención de UI en `src\app\dashboard\finanzas\page.tsx:123-125` ("Tus ingresos, gastos, cuentas por cobrar y por pagar en un solo panel ejecutivo").
- Diseñado para roles gerenciales: solo visible para `admin`, `manager`, `accountant` (`src\components\layout\sidebar.tsx:92-94`), y en planes `negocio`/enterprise.
- Aprende preferencias del usuario (período favorito, indicadores consultados, visualización) vía memoria del negocio (`src\lib\business-memory\financial-preferences.ts`).

## 1.2 SCREENS

El módulo tiene **una sola página**: `src\app\dashboard\finanzas\page.tsx` (268 líneas, `"use client"`). No hay sub-páginas ni layout propio.

| Vista | Activación | Contenido | Ref. |
|---|---|---|---|
| **Todo** | default (`view === "todo"`, page.tsx:34) | Resumen + KPIs + Top deudores/proveedores + Insights | page.tsx:170-194 |
| **Resumen** | pill "Resumen" | `ExecutiveSummary` (párrafos + barra por cobrar/pagar) | page.tsx:170-172 |
| **Indicadores** | pill "Indicadores" | `KpiGrid` + listas top | page.tsx:174-181 |
| **Insights** | pill "Insights" | lista de `InsightsList` | page.tsx:183-194 |

Dentro de la página hay **4 sub-componentes de lista** definidos en el mismo archivo: `TopCollectList` (deudores top-3, page.tsx:203-233) y `TopPayList` (proveedores top-3, page.tsx:235-268). No se navega a detalles de crédito/proveedor desde aquí: son solo resúmenes.

## 1.3 ACTIONS

| Acción | Dónde | Destino | Ref. |
|---|---|---|---|
| Cambiar período (Hoy/Semana/Mes) | Header | refetch `/api/financial?period=` | page.tsx:128-144, 80-101 |
| Cambiar vista (4 pills) | Segunda barra | estado local `view` + persistencia | page.tsx:148-164, 103-111 |
| "Preguntar a Panitas" | `ExecutiveSummary` | `/dashboard/assistant?q=cómo está la salud financiera...` | executive-summary.tsx:32-38 |
| Acción "link" de un insight | `InsightsList` | `/dashboard/creditos`, `/dashboard/suppliers`, `/dashboard/reports`, `/dashboard/finanzas` | financial-actions.ts:18-21, 28-77 |
| Acción "assistant" de un insight | `InsightsList` | `/dashboard/assistant?q=<prompt>` | insights-list.tsx:74-83 |
| Registrar pago (sugerido) | Insight `facturas_vencidas` | prompt "quiero registrar un pago a un proveedor" | financial-actions.ts:55 |

**Observaciones sobre acciones:**
- Las acciones por cobrar dirigen a `/dashboard/creditos` (módulo aparte con su propio KPI grid y filtros).
- Los links de reportes apuntan a `/dashboard/reports` → redirige a `/dashboard/analytics` (redirect intermedio).
- `assistantHref` (`financial-types.ts:202-205`) lleva a la página dedicada del asistente con `?q=`, no al FAB/sheet.

## 1.4 DUPLICATIONS (internas y con otros módulos)

| # | Duplicación | Evidencia | Impacto |
|---|---|---|---|
| D1 | **Tipos financieros duplicados**: `FinancialIndicators`, `FinancialPanel`, `FinancialPeriod`, `FinancialPriority`, `TopDebtor`, `TopPayableSupplier`, `FinancialAction`, `FinancialInsight`, `FinancialSummary`, `FinancialSummaryTone` están definidos en `src\components\dashboard\financial\financial-types.ts` **y de nuevo** en `src\lib\financial-intelligence\financial-types.ts` (casi idénticos). | comparar ambos archivos | Riesgo de drift; el front importa de `components\dashboard\financial\` (page.tsx:11-20), el motor exporta desde `lib\financial-intelligence\`. |
| D2 | **Formateo de moneda**: `money()`/`moneyCompact()` en `financial-types.ts:173-181` (`$X.XX` fijo) coexiste con `BicMoney` (BIC, con toggle Bs) y con `$X.toFixed(2)` en gastos/equilibrio/cierres. | financial-types.ts:173; bic-shared.tsx:159 | Inconsistencia visual según pantalla; sin toggle de Bs en Finanzas. |
| D3 | **KpiGrid duplicado en Créditos**: `src\components\dashboard\credits\kpi-grid.tsx` (líneas 12-25, 29, 66) replica la misma estructura de `KpiCard` de `src\components\dashboard\financial\kpi-grid.tsx` (líneas 19-41, 63). | ambos archivos | Mantenimiento duplicado; cambios visuales deben hacerse dos veces. |
| D4 | **Resumen ejecutivo vs monitor 4B**: `ExecutiveSummary` (párrafos en lenguaje natural) es otro productor de narrativa además de `BusinessSummaryGenerator`/`interpretFinancialHealth`/`interpretOperation`. | executive-summary.tsx:41-47; business-summary-generator.ts:93-106 | Dos fuentes de verdad narrativa con estilos distintos. |
| D5 | **Cálculo de ingresos/gastos en 3 motores**: `/api/analytics` (route.ts:69-88), `FinancialEngine.computeIndicators` (financial-engine.ts:186-212) y `/api/analytics/breakeven` (route.ts:56-78) agregan ventas y gastos con lógica ligeramente distinta (p.ej. tratamiento de pagos crédito, `isRecurring`). | ver refs | Números que pueden diferir entre pantallas (riesgo de confianza). |
| D6 | **Prefs de período persistidas de forma dual**: en `page.tsx:67-78` (POST manual de `period` + indicadores) y en `financial-preferences.ts:72-106`. | ambos | Lógica de "memoria" repartida entre el cliente y el motor de memoria. |

## 1.5 DATA

**Flujo:** `FinanzasPage` → `GET /api/financial?period=&view=` → `FinancialEngine` → `SalesService`, `CreditService`, `SupplierService`, `prisma.expense/orderPayment/supplierPayment`.

- **API principal:** `src\app\api\financial\route.ts:14-41`. Soporta `view=summary`, `view=insights`, o panel completo (`getPanel`). Valida períodos `today|week|month` (línea 8).
- **Motor:** `src\lib\financial-intelligence\financial-engine.ts`.
  - Período + período anterior: `periodRange()` líneas 63-84 (semana inicia lunes, `startOfWeek`).
  - Indicadores: `computeIndicators` líneas 182-245 (8 queries en `Promise.all`).
  - **Caché en memoria con TTL 60s** por `(tienda, período)` — `FinancialCache` líneas 110-146; `DEFAULT_CACHE_TTL_MS = 60_000` línea 41.
  - **Invalidación por eventos** con throttle 5s por tienda — `src\lib\events\event-listeners\financial.listener.ts:24-45` (20 tipos de evento) y `:47-68`.
  - `revenue` = `SalesService.summary` (ventas pagadas/verificadas); `expenses` = `prisma.expense.aggregate`; por cobrar/pagar vienen de `CreditService`/`SupplierService` con límite de 500 (líneas 198, 207).
  - Insiste: "Nunca inventar datos" (financial-types.ts:8, financial-insights.ts:4-6).
- **Resumen ejecutivo:** `buildExecutiveSummary` en `src\lib\financial-intelligence\financial-summary.ts:27-85` (3-4 párrafos + tono). Formatea con `Intl.NumberFormat("es-EC", { currency: "USD" })` (líneas 9-10) — **nota**: locale es-EC, no es-VE.
- **Insights:** `buildInsights` en `src\lib\financial-intelligence\financial-insights.ts:55-178`. Umbrales: cambio relevante ≥10% (`CHANGE_THRESHOLD_PCT`, línea 22), concentración de deuda ≥60% (`CONCENTRATION_THRESHOLD_PCT`, línea 25), recuperación baja <50% (`RECOVERY_MIN_PCT`, línea 28). 12 categorías (líneas 103-115).
- **Priorización:** `src\lib\financial-intelligence\financial-priority.ts` — orden `alta>media>baja`, escalados (`ventas_cayeron` ≤ -25% → alta línea 46; `gastos_aumentaron` ≥ 50% → alta línea 49).
- **Preferencias de memoria:** `GET/POST /api/business-memory/finanzas/preferences` (`src\app\api\business-memory\finanzas\preferences\route.ts:17-47`), con validación de períodos/vistas (líneas 12-13).

**Nota de rendimiento:** los indicadores hacen hasta 8 agregaciones; con caché de 60s mitiga el costo, pero la primera carga por período es pesada (créditos y proveedores con `limit: 500`).

## 1.6 COMPONENTS

| Componente | Archivo | Rol | Notas |
|---|---|---|---|
| `FinanzasPage` (default) | `src\app\dashboard\finanzas\page.tsx:31` | Página completa, estado y fetch | 268 líneas; define además `TopCollectList`/`TopPayList` |
| `KpiGrid` | `src\components\dashboard\financial\kpi-grid.tsx:47` | 6 KPIs con delta | Ingresos, Gastos, Flujo neto, Por cobrar, Por pagar, Cuentas vencidas; `grid-cols-2 sm:grid-cols-3 lg:grid-cols-6` (línea 63) |
| `ExecutiveSummary` | `src\components\dashboard\financial\executive-summary.tsx:14` | Narrativa + barra por cobrar/pagar | Tono por `TONE_META` (positive/warning/neutral); link a Panitas líneas 32-38 |
| `InsightsList` | `src\components\dashboard\financial\insights-list.tsx:24` | Lista de insights con acciones | Empty state "Todo en orden" (líneas 25-37); íconos por categoría (líneas 43, 158-171) |
| `LoadingState` | `src\components\ui\loading-state.tsx` | Skeleton de carga | Usado en page.tsx:167 |

## 1.7 RESPONSIVE

- Header: `flex-col sm:flex-row sm:items-center sm:justify-between` (page.tsx:118) — period pills envuelven abajo en móvil.
- KPI grid: 2 → 3 → 6 columnas (`kpi-grid.tsx:63`).
- Listas top: `grid gap-3 md:grid-cols-2` (page.tsx:177) — apiladas en móvil.
- Pills de vista: `w-fit` (page.tsx:148) — no ocupan ancho completo, OK en móvil.
- **Riesgo:** `TopCollectList`/`TopPayList` muestran hasta 3 filas con avatar + nombre + monto; en pantallas muy angostas el nombre se trunca (truncate, líneas 225/257) — aceptable pero sin paginación ni "ver más".

## 1.8 UX ISSUES

1. **Narrativa financiera duplicada con el Monitor/BIC**: un usuario que abre Finanzas y luego `/dashboard/analytics` (Monitor) ve dos resúmenes distintos del mismo estado, en tonos y formatos diferentes.
2. **Insights financieros no enlazan al detalle**: "Ver créditos" lleva a la lista general de créditos sin filtrar; el usuario debe re-buscar el deudor en cuestión.
3. **Links a `/dashboard/reports`**: todos los insights de flujo/ventas/gastos apuntan a una ruta que solo redirige (ver 1.4, sección transversal #2).
4. **Sin toggle de moneda (Bs)**: mientras todo el BIC ofrece USD+Bs opcional, el panel de Finanzas fuerza `$` fijo — inconsistente con el resto del dashboard.
5. **Sin acceso al punto de equilibrio**: la pregunta más importante de rentabilidad no aparece aquí (solo en BIC).
6. **El estado de carga es genérico**: `LoadingState message="Calculando inteligencia financiera..."` sin skeleton del contenido real (page.tsx:167).
7. **Persistencia de prefs sutil**: el cambio de período/vista se guarda silenciosamente; sin feedback de que se "recuerda" la preferencia.

## 1.9 REDESIGN PROPOSAL (Finanzas)

1. **Unificar tipado**: hacer que `src\components\dashboard\financial\financial-types.ts` re-exporte (o elimine) y reutilice los tipos de `src\lib\financial-intelligence\financial-types.ts` — una sola fuente de verdad (fix D1).
2. **Moneda centralizada**: migrar el formateo de Finanzas a un helper compartido tipo `BicMoney`/`formatPrice` con toggle Bs global (fix D2) — o al menos extraer `money()` a `lib\utils`.
3. **Reusar `KpiGrid`**: consolidar el KPI grid de Finanzas y Créditos en un componente compartido con props de configuración (fix D3).
4. **Convertir los insights financieros en acción real**: los links de acción deberían llegar al filtro/estado correcto (p.ej. `/dashboard/creditos?filter=overdue`) o abrir Panitas en el sheet en lugar de una página nueva.
5. **Corregir rutas**: apuntar `REPORTS_LINK` directamente a `/dashboard/analytics` (financial-actions.ts:20) y eliminar/descartar la ruta `/dashboard/reports`.
6. **Añadir punto de equilibrio al panel financiero** (o un enlace directo al área Salud Financiera del BIC) para cerrar el ciclo "¿ganas o pierdes?".
7. **Añadir skeleton de carga** que refleje la estructura real (KPIs primero, resumen después).

---

# Módulo 2 — REPORTES / Business Intelligence Center

## 2.1 PURPOSE

El módulo Reportes fue reorganizado como un **Business Intelligence Center (BIC)** con **5 áreas, cada una respondiendo una sola pregunta** (documentado en `docs\BUSINESS_INTELLIGENCE_CENTER.md:9-15`):

| Área | Pregunta | Protagonista |
|---|---|---|
| Monitor | ¿Cómo está mi negocio ahora? | Resumen conversacional de Panitas (máx 3 hallazgos) |
| Operación | ¿Qué pasó hoy/semana/mes? | 4 tarjetas drill-down + cierres diarios |
| Salud Financiera | ¿Gano o pierdo este mes? | Utilidad, margen, punto de equilibrio |
| Análisis | ¿Cómo evoluciona X en el tiempo? | Un gráfico a la vez (5 vistas) |
| Reportes | ¿Cómo exporto esto? | CSV / Excel / PDF |

Principio rector (docs línea 17-21): **el BIC no duplica lógica de negocio**, solo agrega helpers puros sobre datos que ya devuelven las APIs existentes.

## 2.2 SCREENS

| Ruta | Archivo | Qué es |
|---|---|---|
| `/dashboard/reports` | `src\app\dashboard\reports\page.tsx` (4 líneas) | **Redirección pura** a `/dashboard/analytics` (línea 4) |
| `/dashboard/analytics` | `src\app\dashboard\analytics\page.tsx` (37 líneas) | Server component: carga órdenes + tasa BCV, renderiza `AnalyticsContent` |
| — | `src\app\dashboard\analytics\analytics-content.tsx` (108 líneas) | Cliente: 4 fetches en paralelo + `BicAreaNav` + render condicional de las 5 áreas |

No hay sub-páginas; las 5 áreas son tabs/pills en una sola página (`analytics-content.tsx:98-116`).

## 2.3 ACTIONS

| Acción | Dónde | Destino | Ref. |
|---|---|---|---|
| Navegar entre 5 áreas | `BicAreaNav` | estado local `area` | bic-shared.tsx:21-45; analytics-content.tsx:37, 98 |
| "Ver detalles"/"Ver menos" | BicMonitorArea | expande insights (maxInsights 3 → todos) | bic-monitor-area.tsx:33-36 |
| "Preguntar a Panitas" | BicMonitorArea | `openAssistant("¿Cómo está mi negocio? ...")` (sheet/FAB) | bic-monitor-area.tsx:37-45 |
| Tarjeta de Atención | BicMonitorArea | `/dashboard/atencion` | attention-monitor-card.tsx:45-46 |
| Acción de tarjeta inteligente | BusinessMonitorSection | `openAssistant(action.action)` | bic-monitor-area.tsx:30; business-monitor-section.tsx:104-105 |
| Drill-down de tarjetas | BicOperationArea | expandir panel interno (DrillCard) | bic-shared.tsx:70-118 |
| Exportar CSV/Excel/PDF | BicReportsArea | descarga de archivo | bic-reports-area.tsx:94-119 |
| Mes anterior/siguiente (Punto Equilibrio) | PuntoEquilibrioTab | refetch breakeven | punto-equilibrio-tab.tsx:106-114 |
| Año anterior/siguiente (Cierres) | CierresTab | refetch cierres | cierres-tab.tsx:195-201 |
| Navegar por día/cierre | CierresTab | expandir día → `/api/reports/daily?date=` | cierres-tab.tsx:78-93 |

## 2.4 DUPLICATIONS

| # | Duplicación | Evidencia | Impacto |
|---|---|---|---|
| D7 | **GastosPage embebido solo aquí**: la gestión de gastos completa (dashboard + registro + historial) vive dentro del BIC (`bic-financial-area.tsx:124`), pero el módulo de Finanzas muestra gastos solo como KPI/insight sin acceso al registro. | gastos-page.tsx:79; bic-financial-area.tsx:124 | La acción "Ver gastos" del insight financiero lleva a `/dashboard/reports` (redirect) pero el usuario termina en analytics donde el área finanzas SÍ tiene el registro — ruta confusa. |
| D8 | **Punto de equilibrio duplicado entre UI y helper**: `interpretBreakEven` (finance.ts:62-66) genera texto; `PuntoEquilibrioTab` (punto-equilibrio-tab.tsx:118-119, 222-266) recalcula `isBreakEven`/`isClose` y su propio texto/badges. | ambos | Reglas de "cerca/alcanzado" en dos lugares (80%/100%). |
| D9 | **Métricas de clientes/inventario repetidas**: `customers` se calcula en `/api/analytics` (route.ts:112, 171-178), se repite en `interpretOperation` (operation.ts:71-75), en `BicOperationArea` (bic-operation-area.tsx:142-168) y en `BicAnalysisArea` (bic-analysis-area.tsx:194-209). El inventario se agrega en `/api/analytics/finanzas` (route.ts:23-26) y se muestra en 3 áreas. | ver refs | Más puntos de divergencia potencial. |
| D10 | **Estado de pedidos agregado dos veces**: `aggregateOrdersByStatus` se usa en Operación (bic-operation-area.tsx:35) y en Análisis (bic-analysis-area.tsx:136), sobre los mismos `statusCounts`. | operation.ts:13-30 | Menor: misma función, doble cómputo client-side (barato, pero refleja arquitectura). |
| D11 | **Monitor duplica al home del dashboard**: el área Monitor (BusinessMonitorSection) y el chat principal `/dashboard` (`AnimatedAIChat`, dashboard/page.tsx:28) pueden responder lo mismo con formatos distintos. BusinessSummaryView se reutiliza en chat (chat-message.tsx:46) y en el monitor (business-monitor-section.tsx:109). | chat-message.tsx:46; business-monitor-section.tsx:109 | Experiencia coherente en componentes, pero el home NO muestra el monitor (solo el chat). |
| D12 | **Insight engine vs FinancialInsight engine**: `src\lib\business-intelligence\insights\insight-engine.ts` (categorías inventory/sales/orders/customers/activity/general) vs `src\lib\financial-intelligence\financial-insights.ts` (12 categorías financieras). Categorías, prioridades, badges y componentes (InsightCard vs InsightsList) totalmente distintos. | ambos | Dos "centros de alertas" sin consolidar (ver hallazgo transversal #1). |

## 2.5 DATA

**Flujo del contenedor:** `analytics-content.tsx:39-69` lanza en paralelo:
1. `GET /api/analytics` → `BicBalance`
2. `GET /api/analytics/finanzas` → `BicInventario`
3. `GET /api/analytics/breakeven` → `BicBreakeven`
4. `GET /api/stores` → nombre de tienda + `planType` (oculta inventario en planes `agenda`/`reservas`, línea 54)

**Server (analytics/page.tsx:29-38):** carga órdenes (`prisma.order` select ligero, línea 31-35) + `getEffectiveRate()` para el `SalesChart`.

**APIs consumidas por área (docs línea 25-31):**

| Área | API | Ref. de datos |
|---|---|---|
| Monitor | `GET /api/agent/business-summary` (route.ts:34-57, requiere feature `basic_ai` línea 46-49) | `BusinessSummaryGenerator` → `BusinessHealthMonitor` + `InsightEngine` |
| Operación | `/api/analytics` + `/api/analytics/finanzas` | balance + inventario |
| Salud Financiera | `/api/analytics` + `/api/analytics/breakeven` | mes + punto de equilibrio |
| Análisis | `/api/analytics` + órdenes del server + `/api/analytics/finanzas` | serie, pedidos, clientes, márgenes |
| Reportes | datos ya cargados (sin fetch) | exportación |
| Atención (extra) | `GET /api/attention/overview` | `AttentionMonitorCard` |

**Detalles de endpoints:**
- `/api/analytics` (`route.ts`): rate limit 30/60s (línea 18); **regla crítica de ingresos** — excluye pagos `method: "credit"` para no doblar las ventas a crédito (líneas 42-47, 69-84); serie mensual de 12 meses `buildMonthlySeries` (líneas 104-126); customers vía `CustomerService().metrics` (línea 112).
- `/api/analytics/breakeven` (`breakeven\route.ts`): **punto de equilibrio = suma de gastos `isRecurring: true` del mes** (líneas 34-43); ventas del mes = pagos verificados (líneas 56-67); `porcentaje = ventas/punto` (línea 71); usa `auth()` (líneas 7-19), no `getCurrentStore`.
- `/api/analytics/finanzas` (`finanzas\route.ts:23-26`): valoriza inventario (costo/venta/ganancia) sobre `prisma.product` y gastos totales.
- `/api/reports/cierres` (`cierres\route.ts:5-103`): agrupa ventas por día con `tzOffset`; no excluye crédito de la misma forma que `/api/analytics` (contabiliza pagos efectivos por día, líneas 69-81).
- `/api/reports/daily` (`daily\route.ts:17-28`): detalle del día con items/pagos/cuotas; lógica de ingresos por día con cuotas pagadas (líneas 30-35).

**Helpers puros (sin I/O, `src\lib\business-intelligence-center\index.ts`):** `finance.ts` (profit/margin/cashflow + interpretación), `operation.ts` (agregar pedidos + interpretación), `series.ts` (buildMonthlySeries), `monitor.ts` (topFindings/findingsByCategory), `reports.ts` (build*Report). **Cubiertos por tests** en `tests\business-intelligence-center\`.

**Riesgo de divergencia de números:** `/api/analytics` (ingresos) vs `/api/reports/cierres` (ingresos por día) vs `/api/financial` (ingresos del período) usan agrupaciones ligeramente distintas del mismo modelo `OrderPayment` (excluir crédito, fallback paidAt/createdAt, cancelados). El usuario podría ver totales que no cuadran entre pestañas.

## 2.6 COMPONENTS

| Componente | Archivo | Rol |
|---|---|---|
| `AnalyticsContent` | `src\app\dashboard\analytics\analytics-content.tsx:29` | Contenedor cliente: estado, 4 fetches, nav, render condicional |
| `BicAreaNav` | `src\components\business-intelligence-center\bic-shared.tsx:21` | Pills horizontales con scroll en móvil |
| `BicMonitorArea` | `src\components\business-intelligence-center\bic-monitor-area.tsx:19` | Monitor + atención + botones |
| `BusinessMonitorSection` | `src\components\assistant\business-monitor-section.tsx:28` | Tarjetas inteligentes (`summaryToMonitorCards`) + vista 4B |
| `BicOperationArea` | `src\components\business-intelligence-center\bic-operation-area.tsx:26` | 4 DrillCards + CierresTab |
| `DrillCard` | `src\components\business-intelligence-center\bic-shared.tsx:70` | Tarjeta expandible con datos |
| `BicFinancialArea` | `src\components\business-intelligence-center\bic-financial-area.tsx:25` | Hero financiero + GastosPage + PuntoEquilibrioTab |
| `PuntoEquilibrioTab` | `src\components\dashboard\punto-equilibrio-tab.tsx:77` | KPIs + barra + desglose por categoría |
| `GastosPage` | `src\components\dashboard\gastos-page.tsx:79` | Registro/presupuesto/historial de gastos (embebido) |
| `BicAnalysisArea` | `src\components\business-intelligence-center\bic-analysis-area.tsx:121` | 5 vistas + gráficos |
| `SalesChart` | `src\components\dashboard\sales-chart.tsx:167` | **SVG artesanal** de línea/área (461 líneas) |
| `MonthlyGroupedBars` | `bic-analysis-area.tsx:33` | Barras CSS agrupadas (ingresos vs gastos) |
| `CategoryBars` | `bic-analysis-area.tsx:75` | Barras CSS horizontales |
| `CierresTab` | `src\components\dashboard\cierres-tab.tsx:53` | Jerarquía año→mes→semana→día con drill |
| `BicReportsArea` | `src\components\business-intelligence-center\bic-reports-area.tsx:131` | 4 tarjetas de exportación |
| `PanitasInterpretation` | `bic-shared.tsx:121` | Bloque "Panitas dice" |
| `BicMoney` | `bic-shared.tsx:159` | Formato USD + Bs opcional |
| `BicProgressBar` | `bic-shared.tsx:136` | Barra de progreso (equilibrio) |
| `AttentionMonitorCard` | `src\components\attention\attention-monitor-card.tsx:16` | Aviso de atención (se oculta si 0 abiertas) |

**Shared UI reutilizable disponible** (no Drawer/DataTable): `src\components\ui\` — `card.tsx` (94), `table.tsx` (105), `pagination.tsx` (71), `search-input.tsx` (69), `filter-chip.tsx` (33), `empty-state.tsx` (25), `sheet.tsx` (125), `tabs.tsx` (74), `dialog.tsx` (147), `select.tsx` (188), `button.tsx`. **No existe** `Drawer` ni `DataTable` como primitivas.

## 2.7 RESPONSIVE

- **Nav de áreas**: scroll horizontal en móvil (`-mx-4 overflow-x-auto`, bic-shared.tsx:23), pills `flex-wrap` en sm+ (línea 24).
- **Hero financiero**: `grid gap-4 sm:grid-cols-2 lg:grid-cols-4` (bic-financial-area.tsx:48).
- **Operación**: `grid gap-4 lg:grid-cols-2` (bic-operation-area.tsx:55); grids internos de 3 columnas (línea 69) pueden quedar apretados en móvil (usan `grid-cols-3` fijo, líneas 69, 185).
- **Monitor**: tarjetas `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4` (business-monitor-section.tsx:106); métricas `grid-cols-2 sm:grid-cols-3 lg:grid-cols-5` (business-summary.tsx:39).
- **Análisis**: pills con `overflow-x-auto` (bic-analysis-area.tsx:159); gráfico SVG usa `ResizeObserver` (sales-chart.tsx:177-185) → se adapta.
- **Cierres**: jerarquía con acordeones que se expanden por ancho; en móvil los controles año siguen siendo accesibles (cierres-tab.tsx:194-202).
- **Reportes**: `grid gap-4 md:grid-cols-2` (bic-reports-area.tsx:177).
- **GastosPage (embebido)**: KPI grid 2→4 columnas (gastos-page.tsx:148); formulario `lg:grid-cols-[1fr_380px]` (línea 376); historial con `overflow-x-auto` en tabla (línea 652).
- **Riesgo general**: los acordeones y drill-downs funcionan bien en móvil; el único punto débil son grids internos fijos de 3 columnas (operación).

## 2.8 UX ISSUES

1. **Ruta `/dashboard/reports` zombie**: enlazada desde el sidebar (`sidebar.tsx:87-91` label "Reportes") y desde insights financieros, pero solo redirige. El redirect está bien (consolidación), pero los links internos deberían ir directo a `/dashboard/analytics`.
2. **BIC no es el "home" del dashboard**: el home (`/dashboard`, dashboard/page.tsx:28) muestra solo el chat inmersivo (`AnimatedAIChat`); el BIC está a dos clics (sidebar → Reportes). Para el "¿cómo está mi negocio?" el usuario ya tiene al asistente al frente.
3. **Gastos enterrado**: la única forma de registrar gastos es entrar a Reportes → Salud Financiera → pestaña "Gastos". No hay acceso desde Finanzas ni desde el home. Descubribilidad baja.
4. **Insights del monitor no navegan a la acción**: la tarjeta "Ver detalle" (monitor.ts:44) reenvía al chat (`openAssistant(action.action)`) en lugar de llevar al módulo donde resolverlo (ej. créditos vencidos → `/dashboard/creditos`).
5. **Dos interpretaciones de "Panitas"**: `PanitasInterpretation` (BIC) vs `ExecutiveSummary` (Finanzas) vs `BusinessHealthCard` (monitor) — tres estilos de narrativa.
6. **Equilibrio sin cruce con presupuestos**: los presupuestos mensuales de gastos (`/api/expenses/budgets`) no influyen en el cálculo del punto de equilibrio (solo `isRecurring`).
7. **Exportación solo desde datos ya cargados**: si `/api/analytics` falla, no hay reportes exportables (analytics-content.tsx:79-85 muestra error y mata toda el área).

## 2.9 REDESIGN PROPOSAL (Reportes / BIC)

1. **Eliminar `/dashboard/reports`** de la sidebar e internamente (fix transversal #2): apuntar todo a `/dashboard/analytics`. Mantener un redirect 301 solo por compatibilidad con links antiguos.
2. **Consolidar el sistema de insights**: un solo motor de alertas (o una capa que fusione `Insight` y `FinancialInsight`) con prioridad unificada (fix D12). El BIC Monitor sería la superficie principal; Finanzas consumiría el mismo stream filtrado.
3. **Reusar primitivas de UI**: usar `Table` + `Pagination` + `SearchInput` + `FilterChip` + `EmptyState` en el historial de gastos (hoy tiene tabla inline + filtros inline, gastos-page.tsx:593-702) y en cierres si crece.
4. **Adoptar una librería de gráficos** (o centralizar el SVG de sales-chart.tsx en un componente reutilizable `LineChart`/`BarChart` del design system) para eliminar `MonthlyGroupedBars`/`CategoryBars` duplicados y dar interactividad consistente.
5. **Enlazar acciones a módulos reales**: "Ver detalle" de una tarjeta inteligente debe navegar al recurso concreto (créditos, pedidos, inventario), no solo abrir el chat.
6. **Exponer gastos y equilibrio en el módulo Finanzas** o añadir accesos directos desde el home, para cerrar el flujo "detecto problema → voy a resolverlo".
7. **Unificar formato monetario** con `BicMoney`/toggle Bs en todo el BIC y Finanzas (fix D2/D7).
8. **Home como landing del BIC**: evaluar mostrar el Monitor (resumen conversacional) como primer bloque del `/dashboard` en vez de solo el chat, o un botón prominente "Ver reportes".

---

## Conclusión

El BIC es una arquitectura sólida y bien documentada (`docs\BUSINESS_INTELLIGENCE_CENTER.md`) que cumple el principio de "no duplicar lógica de negocio" reutilizando `GastosPage`, `PuntoEquilibrioTab`, `CierresTab`, `SalesChart`, `BusinessSummaryView` y los helpers puros. El módulo Finanzas es un panel ejecutivo bien motorizado (caché + eventos + memoria), pero **desconectado** del BIC: dos narrativas, dos motores de insights, dos formateos de moneda y una ruta `/reports` muerta. La consolidación sugerida en 1.9 y 2.9 no implica reescribir motores; es en su mayoría orquestación de vistas, tipado y navegación.
