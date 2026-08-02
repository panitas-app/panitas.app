# FASE 2C — Auditoría de módulos core (Inventario, POS, CRM, Tienda, Reportes)

> Rama: `develop-v2` · Fecha: 02/08/2026 · Estado: **Completada**

Auditoría previa a la optimización. Objetivo: verificar que los datos de cada módulo estén estructurados, los servicios cubran las consultas y los eventos se generen correctamente para preparar el Agente IA de FASE 3.

---

## 1. Estado actual de la arquitectura (1B/1C)

- **Servicios** en `src/services/`: `product.service.ts`, `inventory.service.ts`, `order.service.ts`, `sales.service.ts`, `customer.service.ts`, `agenda.service.ts`, `errors.ts`, `context.ts`, `http.ts`.
- **Repositorios** en `src/repositories/`: `product`, `inventory`, `order`, `sales`, `customer`, `agenda`, `payment`. Todos inyectan `PrismaClient` (default `@/lib/prisma`).
- **Event bus** en `src/events/event.service.ts`: `EventService` con `on`/`emit`/`emitAsync` + singleton `eventService`. Tipado por `AppEvents`.
- **Agente (1C)** en `src/lib/agent/`: tools, permissions, context, memory, auditoría — NO se toca en 2C.

**Conclusión:** la base de servicios es sólida. La capa de repositorios aísla Prisma. Lo que falta es **cobertura**: eventos incompletos, consultas analíticas ausentes y **acceso directo a Prisma en rutas** que bordean la capa de servicios.

---

## 2. Eventos existentes (state of the art)

| Evento | Dónde se emite | Estado |
|---|---|---|
| `product.created` | `product.service.ts:194` | ✅ |
| `product.updated` | `product.service.ts:353` | ✅ |
| `inventory.low_stock` | `order.service.ts:382` | ✅ (solo en venta) |
| `sale.created` | `order.service.ts:452` | ✅ |
| `order.created` | `order.service.ts:459` | ✅ |
| `customer.created` | `customer.service.ts:52` | ✅ |
| `appointment.created` | `agenda.service.ts:157` | ✅ |

**Faltan:** `inventory.created`, `inventory.updated`, `sale.completed`, `sale.cancelled`, `order.completed`, `order.cancelled`, `customer.updated`.

---

## 3. Hallazgos por módulo

### 3.1 Inventario
**Modelos:** `Product` (schema L374: nombre, precio, costo, stock, SKU, variantes `sizes`, categoría), `StockMovement` (L1270: tipo increase/decrease/adjustment/sale/purchase/return/transfer, quantity ±, balance, concept, reference).

**Servicio:** `InventoryService.applyMovement` registra movimiento + actualiza stock + auditoría. ✅ Correcto. Pero:
- ❌ No emite eventos (`inventory.created`/`inventory.updated`). `low_stock` solo se emite en ventas (`order.service.ts:382`), no en ajustes.
- ❌ Sin consultas de negocio: productos con poco stock, más vendidos, sin movimiento, rotación, entradas/salidas.
- ⚠️ **Lógica duplicada de stock:** decremento en `order.service.ts:364` y restauración manual en la ruta de cancelación `status/route.ts:36` (sin registrar `StockMovement`).

### 3.2 POS / Ventas
**Modelos:** `Order` (L496: status pending→delivered/cancelled, paymentStatus pending/paid, total, seller, posPin, cuotas/crédito), `OrderItem` (L566), `OrderPayment` (L587).

**Servicio:** `SalesService.summary` (ingresos/órdenes/ítems por rango) y `recent`. ✅ básico.
- ❌ Sin información preparada: ventas hoy/semana/mes, ticket promedio, productos vendidos, clientes frecuentes.
- ❌ Sin `sale.completed` / `sale.cancelled`.
- ⚠️ **Acceso directo a Prisma:** `api/orders/[id]/status/route.ts` y `api/orders/[id]/verify-payment/route.ts` mutan órdenes/stock/clientes sin pasar por servicios y **sin eventos**.

### 3.3 CRM / Clientes
**Modelo:** `Customer` (L440: datos básicos, totalSpent, totalOrders, lastPurchaseAt, @@unique[storeId,phone]).

**Servicio:** `CustomerService.findOrCreateByPhone` (+`customer.created`), `updateTotals`. ✅.
- ❌ Sin `customer.updated` (el historial de compras cambia sin evento).
- ❌ Sin métricas: clientes nuevos, recurrentes, inactivos, valor del cliente.
- ❌ Sin `getHistory` (pedidos por cliente) — la query existe en repos pero no expuesta como servicio.

### 3.4 Tienda online / Pedidos
**Modelo:** `Order` con `posPin` (boolean, sin columna `source` explícita; POS = posPin true).
- ❌ Sin `order.completed` / `order.cancelled`.
- ❌ Sin consultas "pedidos pendientes" como método de servicio (solo `OrderService.list` con filtro).
- ⚠️ **"Productos más vistos" no es medible hoy:** no existe tracking de vistas de producto (ni modelo ni evento). Requiere evento futuro `product.viewed`.

### 3.5 Reportes / Analytics
- `src/lib/analytics/track.ts` es **tracking de cliente** (posthog-like), NO una capa de métricas de servidor.
- Los dashboards (`/dashboard/analytics`, `/dashboard/reports`) calculan métricas con `prisma.*` directo.
- ❌ No existe `src/lib/analytics/` con funciones reutilizables de negocio (ventas por período, salud de inventario, cohortes de clientes).

---

## 4. Prioridades

### 🔴 Alta (bloqueante para FASE 3)
1. Completar eventos: `inventory.created`, `inventory.updated`, `sale.completed`, `sale.cancelled`, `order.completed`, `order.cancelled`, `customer.updated`.
2. Emitir eventos en las rutas de cambio de estado y verificación de pago (hoy mudas).
3. `InventoryService`: consultas bajo stock, más vendidos, sin movimiento + `getStock` + `overview`.
4. `SalesService`: resumen diario/semanal/mensual, ticket promedio, productos vendidos, clientes frecuentes.
5. `CustomerService`: métricas (nuevos/recurrentes/inactivos/valor) + `getHistory`.
6. Capa `src/lib/analytics/` reutilizable (ventas, inventario, clientes).

### 🟡 Media
7. Registrar `StockMovement` (type `sale`→ o `return`) al cancelar una orden (hoy solo se restaura `product.stock`).
8. Refactorizar `status/route.ts` y `verify-payment/route.ts` para pasar por servicios (empezar añadiendo eventos — cambio aditivo sin riesgo).
9. Exponer `OrderService.getPending` y `onlineSales`.

### 🟢 Baja / Futuro
10. Tracking de vistas de producto (`product.viewed`) para "más vistos".
11. Columna `source` (`online`/`pos`) en `Order` para separar canales de forma explícita (hoy se infiere por `posPin`).
12. Centralizar decremento/restauración de stock en un único `StockService` atómico.

---

## 5. Datos incompletos

- **Rotación de inventario**: derivable de `StockMovement` (entradas/salidas por período), sin columna nueva.
- **Valor del cliente (LTV)**: derivable de `totalSpent` + `totalOrders` → `avgTicketCliente`.
- **Productos más vistos**: NO derivable — requiere captura futura.
- **Canal de la orden**: derivable por `posPin` (pos) vs `!posPin` (online).

---

## 6. Recomendaciones

1. **No cambiar schema** en 2C: todos los datos requeridos existen en `Product`, `StockMovement`, `Order`, `OrderItem`, `Customer`.
2. Los nuevos métodos viven en los servicios existentes (sin tocar la arquitectura 1B/1C).
3. Los eventos se añaden a `AppEvents` con payload mínimo y tipado estricto.
4. La capa de analytics será de **solo lectura** (usa repositorios) para poder probarse sin auth.
5. Registro de `StockMovement` al cancelar órdenes para mantener el historial consistente.

Ver implementación en `docs/PHASE_2C_REPORT.md`.
