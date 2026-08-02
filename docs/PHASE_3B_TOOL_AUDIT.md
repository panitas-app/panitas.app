# PHASE_3B_TOOL_AUDIT — Auditoría de servicios para el Tool System

> FASE 3B · Panitas Agent Tool System. Documento previo a la construcción de las herramientas del agente.
> Rama: `develop-v2`. Basado en análisis del código fuente.

---

## 1. Estado de la arquitectura

```
Agent → Tool Resolver → Tool → Service → Repository → Database
```

- **FASE 1B**: capa de servicios (`src/services/*.service.ts`) como única vía de validación de negocio, con `ServiceError { message, status, code?, details? }`.
- **FASE 1C**: infraestructura de agente (`src/lib/agent/`) con registry, permisos (22), roles (4), router heurístico, auditoría y 20 tools flat que consumen los servicios.
- **FASE 2C**: capa analítica solo-lectura (`src/lib/analytics/`): `getSalesMetrics`, `getInventoryHealth`, `getCustomerMetrics`.
- **FASE 3A**: Agent Core (`src/lib/agent-core/`) que consume el registry 1C vía Tool Resolver.

## 2. Servicios existentes (`src/services/`)

| Servicio | Métodos relevantes para tools | Estado |
|---|---|---|
| `ProductService` | `list`, `getById`, `create`, `update`, `remove` | ✅ completo |
| `InventoryService` | `list` (movimientos), `applyMovement`, `getStock`, `lowStock`, `noMovement`, `bestSellers`, `overview` | ✅ completo |
| `SalesService` | `summary`, `recent`, `dailySummary`, `averageTicket`, `productsSold`, `frequentCustomers` | ✅ completo |
| `CustomerService` | `list`, `findOrCreateByPhone`, `updateTotals`, `metrics`, `getHistory` | ✅ completo |
| `OrderService` | `list`, `getById`, `getPending`, `onlineSales`, `create` | ⚠️ **falta `updateStatus`** |
| `AgendaService` | `list`, `create`, `cancel` | ✅ completo (sin tools nuevas en 3B) |

## 3. Capa analítica (`src/lib/analytics/`, FASE 2C)

| Función | Devuelve | Uso |
|---|---|---|
| `getSalesMetrics(storeId)` | hoy/semana/mes (revenue, órdenes, items, ticket) | `analytics.businessSummary` |
| `getInventoryHealth(storeId)` | overview + lowStock + noMovement | `analytics.businessSummary` / `analytics.businessAlerts` |
| `getCustomerMetrics(storeId)` | 7 métricas de cartera | `analytics.businessSummary` |

## 4. Servicios faltantes (detectados)

1. **`OrderService.updateStatus`** — el repo `OrderRepository.updateStatus` existe pero el servicio no lo expone. La ruta `api/orders/[id]/status` usa Prisma directo. Necesario para `orders.updateStatus`. *(se crea en 3B)*
2. **`OrderService.cancelOrder`** — la lógica de cancelación (restaurar stock, descontar totales del cliente, eventos `sale.cancelled`/`order.cancelled`) vive solo en la ruta `api/orders/[id]/status`. Se migra la parte mínima al servicio como parte de `updateStatus`.

## 5. Herramientas necesarias (mapeo tool → servicio)

### Inventario (`inventory/`)
| Tool | Servicio/método | Permiso |
|---|---|---|
| `inventory.getProducts` | `ProductService.list` | `inventory.read` |
| `inventory.getLowStock` | `InventoryService.lowStock` | `inventory.read` |
| `inventory.getStock` | `InventoryService.getStock` (id o SKU) | `inventory.read` |
| `inventory.searchProduct` | `ProductService.list` (q) | `inventory.read` |
| `inventory.updateStock` | `InventoryService.applyMovement` | `inventory.update` |

### Productos (`products/`)
| Tool | Servicio/método | Permiso |
|---|---|---|
| `products.get` | `ProductService.getById` | `product.read` |
| `products.create` | `ProductService.create` | `product.create` |
| `products.update` | `ProductService.update` | `product.update` |
| `products.delete` | `ProductService.remove` | `product.delete` |

### Ventas (`sales/`)
| Tool | Servicio/método | Permiso |
|---|---|---|
| `sales.getTodaySummary` | `SalesService.summary` (hoy) | `sales.read` |
| `sales.getPeriodSummary` | `SalesService.summary` (from/to) | `sales.read` |
| `sales.getTopProducts` | `SalesService.productsSold` | `sales.read` |
| `sales.getRecentSales` | `SalesService.recent` | `sales.read` |

### Clientes (`customers/`)
| Tool | Servicio/método | Permiso |
|---|---|---|
| `customers.search` | `CustomerService.list` | `customer.read` |
| `customers.getHistory` | `CustomerService.getHistory` | `customer.read` |
| `customers.getTopCustomers` | `SalesService.frequentCustomers` | `customer.read` |
| `customers.create` | `CustomerService.findOrCreateByPhone` | `customer.create` |

### Pedidos (`orders/`)
| Tool | Servicio/método | Permiso |
|---|---|---|
| `orders.getPending` | `OrderService.getPending` | `order.read` |
| `orders.getDetails` | `OrderService.getById` | `order.read` |
| `orders.updateStatus` | `OrderService.updateStatus` *(nuevo)* | `order.update` |

### Reportes (`reports/`)
| Tool | Servicio/método | Permiso |
|---|---|---|
| `reports.sales` | `SalesService.summary` (período) | `report.read` |
| `reports.today` | `SalesService.summary` (hoy) | `report.read` |

### Analytics / Negocio (`analytics/` + `business/`)
| Tool | Fuente | Permiso |
|---|---|---|
| `analytics.businessSummary` | `getSalesMetrics` + `getInventoryHealth` + `getCustomerMetrics` + `OrderService.getPending` | `report.read` |
| `analytics.businessAlerts` | lowStock + ventas bajas + pedidos pendientes | `report.read` |

## 6. Prioridad de implementación

1. **P0 — Infraestructura del Tool System**: contrato `AgentTool`, `ToolRegistry`, `ToolExecutor` (permisos + aislamiento + logging + formato estándar).
2. **P0 — `OrderService.updateStatus`** (servicio faltante, desbloquea `orders.updateStatus`).
3. **P1 — Tools de lectura**: inventory (4), sales (4), customers (3), orders (2), reports (2) — consultas de negocio.
4. **P1 — Tools de escritura**: products (3 + get), customers.create, inventory.updateStock, orders.updateStatus.
5. **P2 — Analytics**: `businessSummary` + `businessAlerts` (composición multi-fuente).
6. **P3 — Futuras**: agenda (ya cubierta por 1C), ventas POS (`sales.create_order`/`orders.create` ya en 1C), configuración de negocio, exportaciones CSV.

## 7. Decisiones que impone la auditoría

1. **Nuevo Tool System en `src/lib/agent/tools/`** con subcarpetas por dominio (`inventory/`, `products/`, `sales/`, `customers/`, `orders/`, `reports/`, `analytics/`, `business/`), **sin tocar** las tools flat 1C existentes (mantienen compatibilidad con el Agent Core 3A).
2. **Contrato `AgentTool` nuevo** con `requiredPermissions` y `execute()` devolviendo **siempre** `ToolResponse { success, data, error, metadata }`.
3. **`ToolRegistry` central** (clase): el agente nunca importa tools manualmente.
4. **Permisos reutilizados**: `hasPermission` de 1C (`@/lib/agent/permissions`).
5. **Aislamiento de negocio**: el `storeId`/`negocioId` proviene SOLO del contexto autenticado; las tools no aceptan `storeId` como parámetro y los servicios filtran por `storeId` en el repositorio.
6. **Logging**: `tool.called`, `tool.success`, `tool.failed` vía `agentAudit` (1C), best-effort.
7. **Ley de capas**: las tools importan SOLO `@/services/*` (y la capa analytics), nunca `@/lib/prisma` ni `@/repositories`.
8. **No se tocan**: `src/lib/agent/types.ts`, `registry.ts`, `router.ts`, tools flat 1C, `setup.ts` (el Tool System 3B es independiente y se integra vía bridge documentado en fases futuras).
