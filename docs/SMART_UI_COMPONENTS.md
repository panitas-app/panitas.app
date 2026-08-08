# Smart UI Components — Arquitectura (FASE 5E)

## Objetivo

Cerrar el circuito visual del asistente: el motor conversacional (FASE 5D)
emite **bloques semánticos** y un **catálogo reutilizable de componentes** los
convierte en tarjetas, tablas, gráficos y acciones. El motor **nunca conoce los
componentes**; solo elige qué bloque contar. La UI decide cómo mostrarlo.

## Principio de capas

```
conversational-actions (5D)  →  emite bloques semánticos (RichBlock)
lib/conversational (monitor) →  BusinessSummary → bloques monitor
component-registry           →  kind → componente (Map central, extensible)
ConversationRenderer         →  recibe RichResponse y renderiza los bloques
chat / Monitor del Negocio   →  integración final (kind "rich" en el chat)
```

Regla inquebrantable heredada de 5D: **respuestas client-safe**. Los bloques y
las acciones rápidas viajan como texto semántico; nunca se exponen tool names,
IDs internos ni JSON crudo.

## Bloques semánticos (`RichBlock`)

| `kind` | Uso |
|--------|-----|
| `text` | Párrafo simple |
| `card` | Tarjeta con título, badge, tono, campos etiqueta/valor y acciones |
| `summary` | Resumen con filas etiqueta/valor y énfasis |
| `table` | Tabla con `sortable`, `searchable`, `filterable`, `paginated`, `expandable` |
| `kpi` | Grid de métricas con delta y tendencia |
| `chart` | Gráfico `bar | line | donut | sparkline` **condicional al volumen** |
| `list` | Lista de entidades con icono, badge y metadatos |
| `monitor` | Tarjeta inteligente de alerta (tono + severidad + acción) |
| `quick-actions` | Fila de acciones rápidas que se reenvían al asistente |
| `financial` | Componente financiero (utilidad, margen, break-even, estructura de gastos) |

El `kind` define **qué** contar; los parámetros (`tone`, `sortable`, `minPoints`,
`actions`) definen **cómo** y no requieren cambiar el motor.

## Componentes por categoría (spec 5E)

- **Producto**: `ProductCard` (precio, stock, SKU, badge stock bajo, acciones).
- **Cliente**: `CustomerCard` (contacto, total comprado, pedidos, acciones).
- **Venta**: `SaleCard` (estado, pago, fecha, total, acciones).
- **Gasto**: `ExpenseCard` (categoría, fecha, monto, acciones).
- **Proveedor**: `VendorCard` (contacto, balance, facturas pendientes, acciones).
- **Reportes**: `KpiGrid` + `RichChart` + `RichTable` + `FinancialCard`.
- **Inventario**: `RichTable` (stock bajo, mejores vendidos, sin movimiento).
- **Monitor**: `MonitorCard` con icono por categoría e importancia.

Las tarjetas de dominio son *wrappers* tipados sobre `RichCard`: reciben la
entidad y construyen el bloque. Son reutilizables fuera del chat (dashboards,
BIC).

## Registro central de componentes

`src/components/assistant/renderers/component-registry.tsx` mapea
`RichBlock["kind"] → BlockRenderer`. Está **pre-cargado** con los 9 bloques
definidos y se extiende sin tocar el motor:

```ts
import { registerComponent } from "@/components/assistant"
registerComponent({ kind: "text", render: (block) => <MiTexto block={block} /> })
```

`renderBlock(block, onSend)` resuelve el componente o devuelve `null` (bloques
desconocidos se ignoran con elegancia). `ConversationRenderer` itera los bloques
de una `RichResponse` y los renderiza en orden.

## Decisiones visuales automáticas

### 1. Gráficos solo cuando hay datos suficientes
`chart-decision.ts` (`shouldRenderChart`) no dibuja si `data.length < minPoints`
(default `2`). Con menos puntos se muestra un aviso breve ("Hay pocos datos para
un gráfico todavía…") en lugar de un gráfico vacío. `capChartData` limita a
`MAX_CHART_POINTS=60` para no generar gráficos ilegibles.

### 2. Forma según el bloque
`ConversationRenderer` elige el componente por `kind`; el motor no hace decisión
de layout. La respuesta conserva también su `reply` de texto natural: el chat
muestra texto + bloques juntos.

### 3. Acciones rápidas → reenvío semántico
Cada `QuickAction` es `{ label, action (texto), variant, confirm?, icon? }`. Al
pulsarla, `sendQuickAction(action.action)` reenvía el texto al asistente. Las
destructivas marcan `confirm: true` y su texto dispara el flujo
`awaiting_confirmation` existente (FASE 4C/5D).

## Accesibilidad y consistencia

- Todas las tablas/charts tienen `aria-label` descriptivo y contraste por tono.
- Paleta por `BlockTone` (`default | success | warning | danger | info`) en
  `renderers/styles.ts`, consistente con el design system (`bg-card/70`,
  `rounded-2xl`, `cn()`, `ui/*`).
- Iconos por **nombre** (`iconByName`), sin imports dinámicos: registro estático
  de iconos lucide.
- Componentes `"use client"`; la lógica pura vive en `.ts` sin React para poder
  testear sin DOM (vitest `environment: node`).

## Integración

- **Chat**: `AssistantMessageKind` incluye `"rich"`; `use-assistant-chat`
  consume `ClientChatView.rich` (ya enviado por `toClientChatView` en 5D) y
  `ChatMessage` renderiza `ConversationRenderer` debajo del texto.
- **Monitor del Negocio**: `summaryToMonitorCards(summary, maxInsights)` convierte
  los `Insight` priorizados de 4B en bloques `monitor` (máx 4 tarjetas) y se
  muestran encima de la vista 4B (`BusinessMonitorSection`).

## Verificación

- `npm run typecheck` → OK
- `npm test` → **630 tests** (40 nuevos en `tests/assistant/*`)
- `npm run build` → OK
