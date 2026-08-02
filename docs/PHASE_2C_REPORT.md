# PHASE_2C_REPORT — Optimización de módulos core para IA

> **Fase:** 2C · Optimización de módulos core (Inventario, POS, CRM, Tienda Online) y capa de analytics para el futuro agente IA.
> **Branch objetivo:** `develop-v2` · **Estado:** ✅ Implementada y verificada · **Commit:** pendiente (junto con FASE 2B)

---

## 1. Objetivo

Preparar los módulos core de Panitas para que un futuro agente IA pueda **consultar métricas de negocio y reaccionar a eventos**, sin crear el agente, sin conectar modelos externos, sin cambiar schema y sin romper la arquitectura FASE 1B/1C.

## 2. Alcance y no-alcance

**Sí:** eventos de negocio nuevos, consultas analíticas en repositorios/servicios, capa `src/lib/analytics/`, docs por módulo, tests.

**No:** agente IA, LLMs, chatbot, cambios de schema, cambios a planes/permisos (2B), APIs externas, transacciones.

## 3. Cambios por módulo

### 3.1 Event bus (`src/events/event.service.ts`)
7 eventos nuevos en `AppEvents`:

| Evento | Payload |
|---|---|
| `sale.completed` | `{ orderId, storeId, orderNumber, total }` |
| `sale.cancelled` | `{ orderId, storeId, orderNumber, total }` |
| `order.completed` | `{ orderId, storeId, orderNumber, total, paymentStatus }` |
| `order.cancelled` | `{ orderId, storeId, orderNumber, total }` |
| `inventory.created` | `{ productId, storeId, productName, stock }` |
| `inventory.updated` | `{ productId, storeId, productName, stock, delta, reason }` |
| `customer.updated` | `{ customerId, storeId, name, totalSpent, totalOrders }` |

### 3.2 Inventario
- `inventory.repository.ts`: `findProductByStoreSku`, `findProductsByIds`, `lowStock`, `noMovement`, `bestSellers`, `overview`.
- `inventory.service.ts`: `getStock`, `lowStock`, `noMovement`, `bestSellers`, `overview`; `applyMovement` emite `inventory.updated` + `inventory.low_stock`.
- `product.service.ts`: emite `inventory.created` / `inventory.updated` en altas y cambios de stock.

### 3.3 POS / Ventas
- `sales.repository.ts`: `topProducts`, `frequentCustomers`, `productsByIds`, `customersByIds`.
- `sales.service.ts`: `dailySummary` (hoy/semana/mes + ticket + top + frecuentes), `averageTicket`, `productsSold`, `frequentCustomers`.
- Rutas `status` y `verify-payment`: emiten `sale.*` / `order.*`.

### 3.4 CRM
- `customer.repository.ts`: `metrics` (7 métricas) y `ordersByCustomer`.
- `customer.service.ts`: `metrics`, `getHistory`; `updateTotals` emite `customer.updated`.

### 3.5 Tienda online
- `order.repository.ts`: `pending`, `online`, `incrementStock`.
- `order.service.ts`: `getPending`, `onlineSales`.
- Ruta `status`: cancelar orden → movimiento `return` en `StockMovement`, restaura stock, descuenta totales del cliente, emite `sale.cancelled`/`order.cancelled` (+ `customer.updated`).
- Ruta `verify-payment`: emite `sale.completed`/`order.completed`.

### 3.6 Capa analytics (`src/lib/analytics/`)
`getSalesMetrics`, `getInventoryHealth`, `getCustomerMetrics` — solo lectura, inyectables para tests, aislada de `track.ts`.

## 4. Verificación

| Check | Resultado |
|---|---|
| `tsc --noEmit` | ✅ 0 errores |
| eslint (archivos tocados) | ✅ 0 errores (se limpiaron 1 error preexistente + 1 import sin uso) |
| `vitest run` | ✅ **101/101** (18 nuevos: sales 5, customer 7, analytics 6) |
| `next build` | ✅ 213 rutas, compila |

## 5. Docs de la fase

- `docs/PHASE_2C_MODULE_AUDIT.md` — auditoría inicial
- `docs/INVENTORY_AI_READY.md` — inventario
- `docs/POS_AI_READY.md` — ventas/POS
- `docs/CRM_AI_READY.md` — clientes
- `docs/STORE_AI_READY.md` — tienda online
- `docs/BUSINESS_ANALYTICS_ARCHITECTURE.md` — capa de métricas
- `docs/EVENT_CATALOG.md` — actualizado con los 7 eventos nuevos (fuente única; se descartó crear `BUSINESS_EVENTS_CATALOG.md` duplicado)

## 6. Próximos pasos (fuera de 2C)

1. Exponer las nuevas consultas como tools del agente (`inventory.low_stock`, `sales.summary`, `customers.metrics`, `order.pending`, `order.online_sales`).
2. Suscribir el orquestador a los nuevos eventos para alertas proactivas.
3. Migrar los handlers de `api/orders/[id]/status` y `verify-payment` a los servicios (hoy usan Prisma directo; la fase 2C solo añadió eventos/movimientos, no los migró).

## 7. Commit pendiente

Incluir junto con FASE 2B (14 archivos + estos ~22 de 2C) en `develop-v2`. Requiere confirmación del usuario.
