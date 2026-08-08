# Business Intelligence Center (FASE 5A) — Arquitectura

## Resumen

El módulo **Reportes** del dashboard se reorganizó como un **Business
Intelligence Center (BIC)** con cinco áreas, cada una respondiendo **una sola
pregunta**:

| Área | Pregunta que responde | Protagonista |
|------|----------------------|--------------|
| **Monitor** | ¿Cómo está mi negocio ahora? | Resumen conversacional de Panitas (máx 3 hallazgos) |
| **Operación** | ¿Qué pasó hoy/semana/mes en ventas, pedidos, clientes e inventario? | 4 tarjetas con profundización (drill-down) |
| **Salud Financiera** | ¿Gano o pierdo dinero este mes? | Utilidad, margen y punto de equilibrio con interpretación |
| **Análisis** | ¿Cómo evoluciona X en el tiempo? | Un gráfico a la vez con filtros |
| **Reportes** | ¿Cómo exporto esto? | Botones CSV / Excel / PDF |

## Principio rector

> El BIC **no duplica lógica de negocio**: consume las APIs y servicios
> existentes y solo agrega *helpers puros* (formato, agregación, interpretación)
> sobre los datos ya consultados. No se reescribe ningún servicio ni repositorio.

## Consumos de API por área

| Área | API consumida | Qué aporta |
|------|---------------|------------|
| Monitor | `GET /api/agent/business-summary` | Resumen, salud (`estable|atencion|revision`), hasta 12 insights, métricas |
| Operación | `GET /api/analytics` + `GET /api/analytics/finanzas` | Ventas (hoy/semana/mes, ticket), pedidos por estado, clientes, top productos, inventario |
| Salud Financiera | `GET /api/analytics` + `GET /api/analytics/breakeven` | Ingresos/gastos del mes, punto de equilibrio (gastos fijos + % cubierto) |
| Análisis | `GET /api/analytics` + órdenes del server + `GET /api/analytics/finanzas` | Serie mensual, pedidos por estado, KPIs de clientes, márgenes |
| Reportes | Datos ya cargados por el contenedor | Exportación CSV/Excel/PDF sin nuevas peticiones |

El contenedor `analytics-content.tsx` lanza los tres fetches en paralelo
(`/api/analytics`, `/api/analytics/finanzas`, `/api/analytics/breakeven`) más
`/api/stores` (nombre de tienda y `planType` para ocultar inventario en planes
`agenda`/`reservas`).

## Estructura de carpetas

```
src/lib/business-intelligence-center/     # Helpers puros (sin I/O)
  types.ts        # MonthlyPoint, OrderStatusTotals, CustomerSnapshot,
                  # OperationSnapshot, FinancialHealthSnapshot
  series.ts       # monthKey, monthLabel, lastMonths, buildMonthlySeries
  finance.ts      # computeProfit, computeMargin, computeCashFlow,
                  # interpretFinancialHealth, interpretBreakEven
  operation.ts    # ORDER_STATUSES, aggregateOrdersByStatus, interpretOperation
  monitor.ts      # topFindings (máx 3), findingsByCategory
  reports.ts      # ReportTable + build*Report (balance, serie, clientes, inventario)
  index.ts        # Barrel exports

src/components/business-intelligence-center/
  bic-data.ts            # Tipos de los payloads (BicBalance, BicInventario, BicBreakeven)
  bic-shared.tsx         # BicAreaNav, BicSectionTitle, DrillCard,
                         # PanitasInterpretation, BicProgressBar, BicMoney
  bic-monitor-area.tsx   # Monitor
  bic-operation-area.tsx # Operación
  bic-financial-area.tsx # Salud Financiera
  bic-analysis-area.tsx  # Análisis
  bic-reports-area.tsx   # Reportes (exportación)

src/app/dashboard/analytics/
  page.tsx               # Server component (force-dynamic, pasa orders + initialRate)
  analytics-content.tsx  # Cliente: 4 fetches paralelos + nav + render condicional
```

## Helpers puros

Viven en `src/lib/business-intelligence-center/` y están cubiertos por tests en
`tests/business-intelligence-center/` (lógica pura, sin componentes React).

- **Serie mensual**: `buildMonthlySeries` rellena los últimos 12 meses con ceros
  para los meses sin datos.
- **Finanzas**: `computeProfit/Margin/CashFlow` derivan utilidad, margen y flujo;
  `interpretFinancialHealth` y `interpretBreakEven` generan la interpretación
  conversacional ("Panitas dice").
- **Operación**: `aggregateOrdersByStatus` agrupa los 6 estados de orden;
  `interpretOperation` resume la salud operativa del mes.
- **Monitor**: `topFindings(insights, 3)` selecciona los 3 hallazgos priorizados
  (`important > warning > info`).
- **Reportes**: `build*Report` convierten los snapshots en `ReportTable`
  (headers + rows + summary) para los tres formatos de exportación.

## API `/api/analytics` extendida (no rompe contrato)

Se añadieron campos **adicionales** al payload existente:

- `monthOrders` — pedidos cobrados del mes (excluye cancelados).
- `averageTicketMonth` — ticket promedio del mes.
- `monthlySeries` — `{ month, label, revenue, expenses }[]` últimos 12 meses
  (revenue = pagos verificados, expenses = gastos del mes).
- `customers` — `{ total, newThisMonth, recurrent, inactive, averageCustomerValue, totalSpent }`
  (vía `CustomerService().metrics({ storeId, userId })`).

## Moneda

Toda el área usa `BicMoney` (USD base + equivalente Bs opcional) respetando el
toggle global `useBcvRate()` (`showBolivares`). Esto **corrige la inconsistencia
del monitor anterior**, que formateaba siempre en Bs.

## Reportes = exportación pura

- **CSV**: `downloadCsv` (`src/lib/export-csv.ts`).
- **Excel**: `xlsx` (`XLSX.utils.aoa_to_sheet` + `XLSX.writeFile`).
- **PDF**: `jsPDF` + `autoTable` (patrón de `DownloadReceipt`).

Cuatro reportes: Resumen del mes, Serie mensual, Cartera de clientes e
Inventario y márgenes. No reintroduce listados ni estadísticas duplicadas.

## Componentes 4B/4C reutilizados (no duplicados)

- `BusinessMonitorSection` — ahora acepta `maxInsights`, `currency` y `actions`
  (para "Ver detalles" y "Preguntar a Panitas").
- `BusinessSummaryView` — acepta `maxInsights` y `actions`.
- `InsightList` — acepta `limit`.
- `SalesChart`, `MetricCard`, `CierresTab`, `GastosPage`, `PuntoEquilibrioTab`
  se reutilizan tal cual.

## Docs relacionados

- `docs/PHASE_5A_REPORT.md` · `docs/PHASE_4B_REPORT.md` · `docs/PHASE_4F_UX_REDESIGN.md`
- `docs/BUSINESS_MONITOR_ARCHITECTURE.md` · `docs/BUSINESS_ANALYTICS_ARCHITECTURE.md`
