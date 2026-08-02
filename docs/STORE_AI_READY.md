# STORE_AI_READY — Módulo de Tienda Online listo para IA

> FASE 2C · Optimización del módulo core de tienda online para el futuro agente IA.
> Sin cambios de schema. Los pedidos online se distinguen por `posPin = false`.

---

## 1. Qué se añadió

### Consultas (`src/repositories/order.repository.ts`)

| Método | Qué devuelve |
|---|---|
| `pending(storeId, take)` | Pedidos con `status = "pending"` (por atender), más recientes primero, con items + pagos |
| `online(storeId, from?, to?)` | Pedidos online (`posPin = false`), excluye cancelados, en rango de fecha |
| `incrementStock(productId, quantity)` | Helper para restauraciones (usado por cancelación) |
| `recordStockMovement` (existente) | Trazabilidad de movimientos |

### Servicio (`src/services/order.service.ts`)

| Método | Qué devuelve |
|---|---|
| `getPending(ctx, take = 50)` | Feed de pedidos pendientes (futuro: el agente los lista y sugiere acciones) |
| `onlineSales(ctx, from?, to?)` | `{ orders, count, revenue, totalItems, averageTicket }` del canal online |

### Eventos en el ciclo de vida

| Evento | Cuándo | Emisor |
|---|---|---|
| `order.created` / `sale.created` (existentes) | Alta de orden | `OrderService.create` |
| `order.completed` | Pago verificado → pedido pagado | Ruta `verify-payment` |
| `order.cancelled` | Cancelación → stock restaurado | Ruta `status` |

---

## 2. Cómo lo consumirá el agente

**Consultas (tools lectura):**
- "¿Qué pedidos hay pendientes de atender?" → `getPending`
- "¿Cuánto vendió la tienda online este mes?" → `onlineSales`
- "Estado de un pedido" → `getById` (existente)

**Señales (eventos):**
- `order.completed` → notificar preparación/envío.
- `order.cancelled` → liberar stock y avisar al cliente.

---

## 3. Reglas de uso

1. Al cancelar, el stock se restaura **con movimiento tipo `return`** y se registra en `StockMovement` (trazabilidad), además de descontar `Customer.totalSpent`/`totalOrders`.
2. La verificación de pago emite `sale.completed` + `order.completed` (el agente puede responder a cualquiera).
3. `online` excluye cancelados por defecto (ventas netas del canal).
