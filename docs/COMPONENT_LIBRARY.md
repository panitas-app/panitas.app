# Catálogo de Componentes Conversacionales (FASE 5E)

Catálogo reutilizable y agnóstico del motor. Todo se exporta desde
`@/components/assistant`.

## Renderers

| Export | Descripción |
|--------|-------------|
| `ConversationRenderer` | Recibe `RichResponse` y renderiza los bloques en orden. Prop `onSend` para reenviar acciones rápidas. |
| `renderBlock(block, onSend)` | Renderiza un bloque suelto vía el registro central. |
| `componentRegistry` / `getComponent` | Registro `kind → componente` (Map central). |
| `registerComponent({ kind, render })` | Extiende el registro sin tocar el motor conversacional. |
| `DEFAULT_COMPONENTS` | Los 9 bloques por defecto pre-registrados. |

## Tarjetas genéricas

| Componente | Bloque | Notas |
|-----------|--------|-------|
| `RichCard` | `card` | Campos etiqueta/valor, badge, tono, icono y acciones al pie. |
| `KpiGrid` | `kpi` | Grid responsive 1→4 columnas, delta con tendencia ↑/↓. |
| `RichSummary` | `summary` | Filas etiqueta/valor con énfasis y tono. |
| `ListCard` | `list` | Entidades con icono, subtítulo, metadatos y badge. |
| `MonitorCard` | `monitor` | Alerta inteligente: icono, tono, severidad y acciones. |
| `FinancialCard` | `financial` | Métricas, punto de equilibrio y estructura de gastos. |
| `QuickActions` | `quick-actions` | Botones que reenvían texto semántico al asistente. |

## Tarjetas de dominio

| Componente | Entidad | Campos |
|-----------|---------|--------|
| `ProductCard` | producto | precio, stock (tono por umbral), SKU, descripción, badge stock bajo |
| `CustomerCard` | cliente | teléfono, total comprado, pedidos |
| `SaleCard` | venta/pedido | estado, pago, total |
| `ExpenseCard` | gasto | categoría, fecha, monto |
| `VendorCard` | proveedor | contacto, balance, facturas pendientes |

## Tablas

| Export | Descripción |
|--------|-------------|
| `RichTable` | Tabla con orden (`sortable`), búsqueda (`searchable`), filtros (`filterable`), paginación (`paginated`) y filas expandibles (`expandable`). |

Lógica pura (sin React, testeada en node):

| Función | Descripción |
|---------|-------------|
| `toComparable` | Celda → comparable numérico/texto (moneda `$X` y `1,234` → número; `—` → `-Inf`). |
| `compareValues` / `sortRows` | Comparación y orden asc/desc estable. |
| `normalizeSearch` | Minúsculas + sin acentos (NFD). |
| `filterRows` | Búsqueda por cualquier celda. |
| `filterByColumns` | Filtros exactos por columna (AND). |
| `columnValues` | Valores únicos de una columna. |
| `paginate` | Paginación 1-based con clamp de página. |

## Gráficos

| Export | Descripción |
|--------|-------------|
| `RichChart` (`SimpleChart`) | `bar \| line \| donut \| sparkline` en SVG responsive. |
| `shouldRenderChart` | No dibuja si hay menos de `minPoints` (default 2). |
| `capChartData` | Recorta a `MAX_CHART_POINTS` (60) muestreando. |
| `chartScale` | Máximo "bonito" para ejes. |
| `formatChartValue` | Moneda / porcentaje / número según el bloque. |
| `donutSegments` | Proporciones + paleta por segmento. |

## Acciones

| Export | Descripción |
|--------|-------------|
| `QuickActions` | Botones de `QuickAction[]`. |
| `productActions(name)` | Editar · Agregar stock · Eliminar (confirm). |
| `saleActions(ref)` | Ver detalle · Duplicar. |
| `customerActions(name)` | Historial · Registrar venta · Registrar pago. |
| `expenseActions(desc)` | Editar · Eliminar (confirm). |
| `vendorActions(name)` | Comprar de nuevo · Ver gastos. |

Todas las acciones son **texto semántico** (`"eliminar producto café"`); el
clic reenvía el texto y el flujo de confirmación 4C/5D aplica si aplica.

## Monitor del Negocio

| Export | Descripción |
|--------|-------------|
| `summaryToMonitorCards(summary, max?)` | `BusinessSummary` (4B) → `RichResponse` de bloques `monitor` (máx `MAX_MONITOR_CARDS=4`). |
| `insightToMonitorCard(insight)` | Un `Insight` → bloque monitor (icono por categoría, tono por importancia). |

## Uso mínimo

```tsx
import { ConversationRenderer } from "@/components/assistant"
import type { RichResponse } from "@/lib/conversational-actions"

const rich: RichResponse = {
  kind: "summary",
  title: "Resumen",
  blocks: [
    { kind: "kpi", title: "KPIs", items: [{ label: "Ventas", value: 1200, delta: 12 }] },
    { kind: "table", title: "Productos", headers: ["Nombre", "Stock"], rows: [["Café", 12]], sortable: true },
    { kind: "monitor", title: "3 productos requieren reposición", tone: "warning", severity: "warning", actions: [{ label: "Ver", action: "ver productos" }] },
  ],
}

<ConversationRenderer rich={rich} onSend={(a) => send(a.action)} />
```
