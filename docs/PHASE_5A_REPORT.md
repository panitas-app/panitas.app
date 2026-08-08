# FASE 5A — Business Intelligence Center · Reporte

## Resumen ejecutivo

El módulo **Reportes** se convirtió en un **Business Intelligence Center (BIC)**
con cinco áreas — Monitor, Operación, Salud Financiera, Análisis y Reportes —
cada una respondiendo **una sola pregunta**, reutilizando la capa Business
Intelligence de FASE 4B y las APIs existentes sin duplicar lógica.

**Verificación:** lint limpio en los archivos tocados (el repo arrastra un
baseline pre-existente de ~2400 problemas en archivos no relacionados) ·
`tsc --noEmit` OK · tests verdes · `next build` OK.

## Qué se implementó

### 1) Monitor (protagonista)

- `BusinessMonitorSection` con `maxInsights={3}`: máximo 3 hallazgos.
- Botón **"Ver detalles"** que expande a todos los insights.
- Botón **"Preguntar a Panitas"** que abre el chat del asistente con una
  pregunta pre-cargada vía `openAssistant(...)`.
- Moneda corregida: `currency={showBolivares ? "Bs" : "USD"}` (antes siempre Bs).

### 2) Operación

- Solo **Ventas / Pedidos / Clientes / Inventario**, cada una como `DrillCard`
  con profundización (drill-down):
  - Ventas: hoy / semana / mes + top 5 productos.
  - Pedidos: barras por estado (pendiente, confirmado, preparando, enviado,
    entregado, cancelado).
  - Clientes: 4 KPIs + total gastado por la cartera.
  - Inventario: valor de costo, ganancia potencial, margen y stock bajo.
- Interpretación conversacional de Panitas + cierres diarios al final.

### 3) Salud Financiera

- Hero con 4 tarjetas: ingresos del mes, gastos del mes, **utilidad** (emerald
  si ≥ 0, rose si negativa), **punto de equilibrio** con barra de progreso.
- Interpretación de Panitas en texto (`interpretFinancialHealth` +
  `interpretBreakEven`).
- Debajo: `GastosPage` y `PuntoEquilibrioTab` reutilizados.

### 4) Análisis

- Filtros: Ventas / Pedidos / Clientes / Rentabilidad / Inventario.
- **Un gráfico a la vez**: `SalesChart` reutilizado (Ventas), `CategoryBars`
  (Pedidos y márgenes), `MonthlyGroupedBars` (Rentabilidad), KPIs (Clientes).
- Vista Inventario se oculta en planes `agenda`/`reservas`.

### 5) Reportes

- **Solo exportación**: CSV (`downloadCsv`), Excel (`xlsx`) y PDF
  (`jsPDF` + `autoTable`) en 4 reportes: Resumen del mes, Serie mensual,
  Cartera de clientes, Inventario y márgenes.
- Sin listados ni estadísticas duplicadas.

## Reglas del cliente cumplidas

1. **Cada sección responde UNA pregunta.**
2. **Monitor protagonista**: es el primer tab al entrar a Reportes.
3. **Sin duplicación de lógica**: el BIC consume las APIs existentes; los
   helpers puros solo formatean/agregan/interpretan datos ya consultados.
4. **Sin ERP tradicional**: no se añadieron formularios ni CRUDs nuevos.
5. **Responsive**: grids 1→2→4 columnas, nav de pills con overflow-x en móvil,
   acordeones en Operación.
6. **Moneda consistente**: USD base + Bs opcional en todas las áreas.
7. **No se eliminó funcionalidad útil**: Cierres, Gastos, Punto de Equilibrio y
   los componentes 4B/4C siguen disponibles dentro del BIC.

## Archivos nuevos

- `src/lib/business-intelligence-center/` — `types`, `series`, `finance`,
  `operation`, `monitor`, `reports`, `index` (helpers puros).
- `tests/business-intelligence-center/` — tests de series, finance, operation,
  monitor y reports (lógica pura).
- `src/components/business-intelligence-center/` — `bic-data`, `bic-shared`,
  `bic-monitor-area`, `bic-operation-area`, `bic-financial-area`,
  `bic-analysis-area`, `bic-reports-area`.

## Archivos modificados

- `src/app/dashboard/analytics/analytics-content.tsx` — reescrito como
  contenedor del BIC (4 fetches paralelos + nav + render condicional).
- `src/app/api/analytics/route.ts` — añade `monthOrders`, `averageTicketMonth`,
  `monthlySeries` y `customers` sin romper el contrato existente.
- `src/components/business/business-summary.tsx` — props `maxInsights`,
  `actions`.
- `src/components/business/insight-list.tsx` — prop `limit`.
- `src/components/assistant/business-monitor-section.tsx` — props `maxInsights`,
  `currency`, `actions`.

## Tests nuevos (21)

- `tests/business-intelligence-center/series.test.ts`
- `tests/business-intelligence-center/finance.test.ts`
- `tests/business-intelligence-center/operation.test.ts`
- `tests/business-intelligence-center/monitor.test.ts`
- `tests/business-intelligence-center/reports.test.ts`

## Decisiones clave

1. **Monitor como primer tab** — "lo primero que se vea al entrar a reportes".
2. **Helpers puros en `src/lib/business-intelligence-center/`** — separación
   clara de presentación (componentes) y lógica (tests de node).
3. **La API de analytics se extiende, no se reescribe** — se añaden campos;
   `BalanceData` original intacto.
4. **Ocultar inventario por plan** — `planType` de `/api/stores` controla la
   vista de Inventario en Operación y Análisis.
5. **Reportes sin re-listado** — solo exportación de lo ya construido.

## Límites y trabajo futuro

- **Unificación de ingresos**: aún existen definiciones distintas de "ingresos"
  entre tarjetas, gráfico y detalles diarios (pagos verificados vs total de
  orden incl. cancelados). La primera iteración del BIC respeta el estatus quo
  de cada tarjeta; unificar queda para una fase de consistencia.
- **Gráfico de ventas**: `SalesChart` heredado puede incluir pedidos cancelados;
  su ajuste queda anotado como TBD.
- **Punto de equilibrio**: el cálculo heredado ignora el margen de contribución
  y recorta al 100%; se reporta tal cual sin alterar la fuente.

## Docs relacionados

- `docs/BUSINESS_INTELLIGENCE_CENTER.md` (arquitectura del BIC)
- `docs/PHASE_4B_REPORT.md` · `docs/PHASE_4C_REPORT.md` · `docs/PHASE_4F_UX_REDESIGN.md`
- `docs/CHANGELOG.md`
