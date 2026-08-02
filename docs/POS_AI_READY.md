# POS_AI_READY — Módulo de Ventas (POS) listo para IA

> FASE 2C · Optimización del módulo core de ventas para el futuro agente IA.
> Sin cambios de schema. Todo derivable de `Order`, `OrderItem` y `Customer`.

---

## 1. Qué se añadió

### Consultas analíticas (`src/repositories/sales.repository.ts`)

| Método | Qué devuelve |
|---|---|
| `summary(storeId, { from, to })` | `revenue`, `totalOrders`, `totalItems` del rango |
| `recent(storeId, take)` | Últimas órdenes |
| `topProducts(storeId, from, to, take)` | Ranking por unidades vendidas (`_sum.quantity`) |
| `frequentCustomers(storeId, from, to, take)` | Clientes por número de órdenes y total gastado |
| `productsByIds(ids)` / `customersByIds(ids)` | Bulk fetch de nombres (evita N+1) |

### Servicio (`src/services/sales.service.ts`)

| Método | Qué devuelve |
|---|---|
| `dailySummary(ctx)` | `SalesOverview`: hoy/semana/mes + `averageTicket` + `topProducts` + `frequentCustomers` |
| `averageTicket(ctx, from?, to?)` | Ticket promedio del rango |
| `productsSold(ctx, from?, to?, take?)` | `[{ productId, name, quantity }]` |
| `frequentCustomers(ctx, from?, to?, take?)` | `[{ customerId, name, phone, orders, total }]` |
| `summary` / `recent` (existentes) | Resumen y últimas ventas |

### Eventos

| Evento | Cuándo |
|---|---|
| `sale.completed` | Pago de orden verificado → `{ orderId, storeId, orderNumber, total }` |
| `sale.cancelled` | Orden cancelada → `{ orderId, storeId, orderNumber, total }` |
| `sale.created` (existente) | Alta de venta/orden |

---

## 2. Cómo lo consumirá el agente

**Consultas (tools lectura):**
- "¿Cuánto vendí hoy/esta semana?" → `dailySummary` o `getSalesMetrics` (analytics)
- "¿Cuál fue el ticket promedio?" → `averageTicket`
- "¿Qué producto se vende más?" → `productsSold`
- "¿Quiénes son mis mejores clientes?" → `frequentCustomers`

**Señales (eventos):**
- `sale.completed` → confirmar cobro, disparar reporte.
- `sale.cancelled` → ajustar métricas y alertar reposición.

**Punto de entrada unificado:** `getSalesMetrics(storeId)` en `src/lib/analytics/sales.ts` devuelve hoy/semana/mes + ticket promedio en una llamada.

---

## 3. Reglas de uso

1. **El agente nunca crea ventas con precio inventado** → `OrderService.create` lee el precio real del producto desde BD (regla #1 del checklist).
2. Las ventas anuladas se descuentan de `Customer.totalSpent`/`totalOrders` en la ruta `status` y emiten `sale.cancelled`.
3. `averageTicket` = `revenue / totalOrders`; 0 si no hay pedidos.
