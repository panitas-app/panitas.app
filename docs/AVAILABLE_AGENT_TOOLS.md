# AVAILABLE_AGENT_TOOLS — Catálogo de herramientas del agente (FASE 3B)

> Herramientas registradas en `toolRegistry` (`src/lib/agent/tools/`).
> Ejecución exclusiva vía `ToolExecutor`. Permisos: se necesita al menos UNO de los listados.

---

## Inventario (`inventory/`)

| Tool | Descripción | Parámetros | Permiso |
|---|---|---|---|
| `inventory.getProducts` | Lista productos del negocio (filtros y paginación) | `q?`, `category?`, `skip?`, `take?` | `inventory.read` |
| `inventory.getLowStock` | Productos con stock bajo | `threshold?` (def 5), `take?` | `inventory.read` |
| `inventory.getStock` | Stock de un producto por ID o SKU | `id` (req) | `inventory.read` |
| `inventory.searchProduct` | Busca productos por término | `q` (req), `take?` | `inventory.read` |
| `inventory.updateStock` | Entrada/salida/ajuste de stock + movimiento | `productId` (req), `type` (req: increase\|decrease\|adjustment), `quantity` (req), `concept?`, `reference?` | `inventory.update` |

## Productos (`products/`)

| Tool | Descripción | Parámetros | Permiso |
|---|---|---|---|
| `products.get` | Detalle completo de un producto | `id` (req) | `product.read` |
| `products.create` | Crea producto (valida plan y datos en servidor) | `name` (req), `price` (req), `description?`, `stock?`, `sku?`, `categoryId?`, `costPrice?`, `isActive?` | `product.create` |
| `products.update` | Actualiza campos de un producto | `id` (req), `name?`, `price?`, `description?`, `stock?`, `sku?`, `isActive?` | `product.update` |
| `products.delete` | Elimina un producto (destructivo) | `id` (req) | `product.delete` |

## Ventas (`sales/`)

| Tool | Descripción | Parámetros | Permiso |
|---|---|---|---|
| `sales.getTodaySummary` | Resumen hoy/semana/mes (ingresos, ticket, top, frecuentes) | — | `sales.read` |
| `sales.getPeriodSummary` | Resumen de ventas en rango | `from?`, `to?` (ISO) | `sales.read` |
| `sales.getTopProducts` | Productos más vendidos en rango | `from?`, `to?`, `take?` (máx 20) | `sales.read` |
| `sales.getRecentSales` | Últimas ventas (items y pagos) | `take?` (máx 50) | `sales.read` |

## Clientes (`customers/`)

| Tool | Descripción | Parámetros | Permiso |
|---|---|---|---|
| `customers.search` | Busca clientes (nombre, teléfono, email, documento) | `q?`, `take?` | `customer.read` |
| `customers.getHistory` | Historial de compras de un cliente | `customerId` (req), `take?` | `customer.read` |
| `customers.getTopCustomers` | Clientes frecuentes en rango | `from?`, `to?`, `take?` | `customer.read` |
| `customers.create` | Busca por teléfono o crea cliente | `phone` (req), `name?`, `email?`, `documentId?`, `address?`, `city?`, `state?` | `customer.create` |

## Pedidos (`orders/`)

| Tool | Descripción | Parámetros | Permiso |
|---|---|---|---|
| `orders.getPending` | Pedidos pendientes de atender | `take?` | `order.read` |
| `orders.getDetails` | Detalle completo de un pedido | `id` (req) | `order.read` |
| `orders.updateStatus` | Cambia estado; al cancelar restaura stock | `id` (req), `status` (req: pending\|confirmed\|preparing\|shipped\|delivered\|cancelled) | `order.update` |

## Reportes (`reports/`)

| Tool | Descripción | Parámetros | Permiso |
|---|---|---|---|
| `reports.sales` | Reporte de ventas en rango | `from?`, `to?` (ISO) | `report.read` |
| `reports.today` | Reporte hoy/semana/mes | — | `report.read` |

## Analítica (`analytics/`)

| Tool | Descripción | Parámetros | Permiso |
|---|---|---|---|
| `analytics.businessSummary` | Resumen de negocio: ventas + inventario + clientes + pedidos pendientes | — | `report.read` |
| `analytics.businessAlerts` | Alertas: stock bajo, sin movimiento, sin ventas hoy, pedidos pendientes | — | `report.read` |

---

## Uso (programático)

```ts
import { toolRegistry, ToolExecutor } from "@/lib/agent/tools"

const executor = new ToolExecutor({ registry: toolRegistry })

const response = await executor.execute(
  { userId: "u1", storeId: "s1", permissions: ["inventory.read", ...] },
  "inventory.getLowStock",
  { threshold: 5 }
)

// response => { success, data, error, metadata: { tool, durationMs } }
```

## Formato de respuesta

Todas las tools devuelven `{ success: boolean, data: unknown, error: string | null, metadata: Record<string, unknown> }`.

- `success: true` → `data` contiene el resultado (objeto de la capa de servicios).
- `success: false` → `error` describe el fallo (desconocida, sin negocio, sin permisos, parámetros inválidos o error del servicio). Nunca lanza.
