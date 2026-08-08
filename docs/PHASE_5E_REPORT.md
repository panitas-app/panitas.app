# FASE 5E — Smart UI Components — Reporte

## Resumen ejecutivo

Se construyó el **catálogo reutilizable de componentes conversacionales** que
cierra el circuito visual del asistente: tarjetas, tablas inteligentes, gráficos
condicionales, acciones rápidas y un **registro central extensible** que el
`ConversationRenderer` usa para dibujar las respuestas estructuradas emitidas
por el motor 5D. El motor **solo emite bloques semánticos** y no conoce ningún
componente; agregar visuales nuevos no requiere modificar el motor.

El **Monitor del Negocio** ahora responde con **tarjetas inteligentes** (bloques
`monitor` generados desde los `Insight` priorizados de 4B) y el chat renderiza
las respuestas `rich` debajo del texto natural. Todo se reenvía como **texto
semántico** (nunca tool names ni JSON), respetando las reglas 5B/5D.

**Verificación:** `tsc --noEmit` OK · **630 tests verdes** (40 nuevos en
`tests/assistant/*`) · `next build` OK (solo warning pre-existente de Edge https
en `src/lib/bcv/fetcher.ts`).

## Qué se implementó

### 1. Capa de componentes (`src/components/assistant/`)
- **`cards/`**: `RichCard` (campos/badge/tono/acciones), `KpiGrid`, `RichSummary`,
  `ListCard`, `MonitorCard`, `FinancialCard` y tarjetas de dominio
  `ProductCard / CustomerCard / SaleCard / ExpenseCard / VendorCard`.
- **`tables/`**: `RichTable` con orden, búsqueda, filtros por columna, paginación
  y filas expandibles; lógica pura en `tables/table-logic.ts` (testeada sin DOM).
- **`charts/`**: `RichChart` (`SimpleChart`) SVG para `bar | line | donut |
  sparkline`; decisión de volumen y escala en `charts/chart-decision.ts`.
- **`actions/`**: `QuickActions` (botones que reenvían texto al asistente).
- **`renderers/`**: `component-registry.tsx` (Map `kind → componente`,
  `registerComponent`), `conversation-renderer.tsx`, `icons.ts` (iconos por
  nombre), `styles.ts` (paleta por `BlockTone`).
- **`index.ts`**: barrel público `@/components/assistant`.

### 2. Tipos y builders del lado del motor
- `conversational-actions/types.ts`: `RichBlock` ampliado (`kpi`, `chart`,
  `list`, `monitor`, `financial`, `quick-actions`; tablas con
  `sortable/searchable/filterable/paginated/expandable/rowTone`) + tipos con
  nombre (`TableBlock`, `ChartBlock`, `MonitorBlock`, …).
- `rich.ts`: builders `kpiBlock / chartBlock / listBlock / monitorBlock /
  quickActionsBlock / financialBlock / cardBlock / tableBlock`; tarjetas de
  producto/cliente/gasto/pedido con `actions`; `salesOverviewSummary` con chart
  de top productos; tablas habilitadas con sort/búsqueda/paginación.
- `executor.ts`: respuestas enriquecidas 5E (`consultar_gastos` → kpi + donut +
  tabla; `reporte_stock_bajo` / `resumen_negocio` → monitor + tabla; `reporte_productos`
  → chart + tabla) y **acciones rápidas adjuntas** a crear/editar/cambiar
  precio/ajustar stock/cliente/gasto/compra/pedido.

### 3. Lógica de dominio pura
- `lib/conversational/monitor.ts`: `insightToMonitorCard` /
  `summaryToMonitorCards` (máx 4 tarjetas) desde los `Insight` de 4B.
- `lib/conversational/action-factories.ts`: fábricas `productActions`,
  `saleActions`, `customerActions`, `expenseActions`, `vendorActions` (texto
  semántico, destructivas con `confirm`).
- `charts/chart-decision.ts`: gráficos **solo si** `data.length >= minPoints`
  (default 2) y limitados a 60 puntos.

### 4. Integración
- `use-assistant-chat.ts`: `AssistantMessageKind` incluye `"rich"`;
  `ChatTurnResponse.rich` consumido; `sendQuickAction` reenvía el texto.
- `chat-message.tsx`: mensajes `rich` muestran texto + `ConversationRenderer`.
- `business-monitor-section.tsx`: tarjetas inteligentes del monitor sobre la
  vista 4B.

## Criterios de finalización (spec 5E)
- [x] Catálogo reutilizable de componentes (cards, tablas, gráficos, acciones,
      renderers) bajo `src/components/assistant/`.
- [x] `ConversationRenderer` selecciona el componente según la respuesta
      estructurada; registro central extensible **sin modificar el motor**.
- [x] Componentes por categoría: producto, cliente, venta, gasto, proveedor,
      reportes, inventario, monitor.
- [x] Tablas con orden, búsqueda, filtros y filas expandibles.
- [x] Gráficos solo cuando el volumen de datos lo amerita.
- [x] Componente financiero (utilidad, margen, punto de equilibrio, estructura
      de gastos).
- [x] Monitor del Negocio con tarjetas inteligentes (⚠ reposición, pedidos,
      finanzas).
- [x] Acciones rápidas reenvían texto semántico (sin tool names ni JSON).
- [x] Responsive, accesible y consistente con el design system.
- [x] Typecheck, tests (630) y build verdes.
- [x] Docs: `SMART_UI_COMPONENTS.md`, `COMPONENT_LIBRARY.md`, `PHASE_5E_REPORT.md`.

## Limitaciones conocidas
- `RichTable` usa filtros exactos por columna (sin fuzz); la búsqueda es
  substring sin acentos.
- Los gráficos son SVG simples (sin ejes numéricos completos ni tooltips
  complejos); suficientes para el chat, no para análisis profundos.
- Las acciones de las tarjetas del Monitor del Negocio solo se envían si el
  contenedor provee `onMonitorAction` (por defecto se renderizan sin envío).
- El catálogo crece con `registerComponent`; los componentes de dominio nuevos
  requieren escribirse a mano (no generados).

## Archivos clave
- Nuevos: `src/components/assistant/{cards,tables,charts,actions,renderers}/…`
  (15 archivos) + `index.ts`.
- Nuevos (lógica): `src/lib/conversational/monitor.ts`,
  `src/lib/conversational/action-factories.ts`.
- Modificados: `src/lib/conversational-actions/{types,rich,executor,index}.ts`,
  `src/hooks/use-assistant-chat.ts`,
  `src/components/assistant/chat-message.tsx`,
  `src/components/assistant/business-monitor-section.tsx`.
- Tests: `tests/assistant/{table-logic,chart-decision,action-factories,monitor,renderer}.test.ts`
  (5 archivos, 40 tests).
- Docs: `SMART_UI_COMPONENTS.md`, `COMPONENT_LIBRARY.md`, `PHASE_5E_REPORT.md`.
