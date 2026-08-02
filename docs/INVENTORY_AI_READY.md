# INVENTORY_AI_READY — Módulo de Inventario listo para IA

> FASE 2C · Optimización del módulo core de inventario para el futuro agente IA.
> Sin cambios de schema. Todo derivable de `Product` y `StockMovement`.

---

## 1. Qué se añadió

### Consultas analíticas (`src/repositories/inventory.repository.ts`)

| Método | Qué devuelve |
|---|---|
| `findProductByStoreSku(storeId, sku)` | Producto por SKU dentro de una tienda |
| `findProductsByIds(ids)` | Bulk fetch de productos (evita N+1) |
| `lowStock(storeId, threshold)` | Productos con `stock <= threshold` (ordenados por stock asc) |
| `noMovement(storeId, days)` | Productos sin movimiento en los últimos N días |
| `bestSellers(storeId, days, take)` | Top productos por unidades vendidas |
| `overview(storeId, lowStockThreshold, windowDays)` | Resumen: total de productos, stock total, entradas/salidas del período |

### Servicio (`src/services/inventory.service.ts`)

| Método | Qué devuelve |
|---|---|
| `getStock(ctx, productId)` | Stock actual + producto |
| `lowStock(ctx, threshold)` | Lista de bajo stock |
| `noMovement(ctx, days)` | Productos sin movimiento |
| `bestSellers(ctx, days, take)` | Ranking de ventas por producto |
| `overview(ctx, opts)` | Resumen de salud del inventario |
| `applyMovement` (existente) | Ahora **emite `inventory.updated` y `inventory.low_stock`** |

### Eventos

| Evento | Cuándo |
|---|---|
| `inventory.created` | `ProductService.create` (stock inicial) |
| `inventory.updated` | `applyMovement` y cambios de stock vía producto — payload `{ productId, storeId, productName, stock, delta, reason }` |
| `inventory.low_stock` | Al quedar stock en `1..LOW_STOCK_THRESHOLD` (`LOW_STOCK_THRESHOLD = 5`) |

---

## 2. Cómo lo consumirá el agente

**Consultas (tools lectura):**
- "¿Qué productos están por agotarse?" → `lowStock`
- "¿Qué no se ha movido este mes?" → `noMovement` (sin movimientos en 30 días)
- "¿Cuáles son los más vendidos?" → `bestSellers`
- "Resumen del inventario" → `overview`

**Señales (eventos):**
- `inventory.low_stock` → caso canónico: el agente sugiere comprar al proveedor.
- `inventory.updated` → mantener stock en memoria / alertar caídas bruscas.

**Punto de entrada unificado:** `getInventoryHealth(storeId)` en `src/lib/analytics/inventory.ts` combina `overview` + `lowStock` + `noMovement` en una sola llamada.

---

## 3. Reglas de uso

1. **El agente nunca cambia stock directo** → siempre `InventoryService.applyMovement` (valida tipo, tienda y stock disponible).
2. Las cancelaciones de órdenes restauran stock **vía movimiento tipo `return`** (ruta `status`), no con increment directo, para mantener trazabilidad en `StockMovement`.
3. Umbrales configurables: `lowStockThreshold` (default 5) e `inactiveDays` (default 30).
4. Integridad (Neon HTTP): movimiento → luego update de producto. No hay transacciones interactivas.
