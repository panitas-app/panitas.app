# PANITAS 2.0 — FASE 11B — CHANGE MAP

*Integración de la nueva funcionalidad del POS y las nuevas instrucciones del agente AI.*

---

## Feature nueva

**Conceptos adicionales en ventas (POS):** el carrito permite agregar líneas que no son productos ni afectan inventario (mano de obra, instalación, envío, servicios). Se validan en servidor (descripción obligatoria ≤ 200 chars, cantidad entera ≥ 1, precio ≥ 0), se incluyen en subtotal/total, y se persisten en `OrderItem` con `type = "CUSTOM"` y `productId = null`.

## POS

- `Agregar concepto` abre `ConceptModal` (descripción, cantidad, precio).
- Las líneas CUSTOM se marcan con badge "Concepto" y botón editar (Pencil).
- `cartLineKey()` = `lineId || productId`: productos se mezclan por `productId`, conceptos usan `lineId` único → sin colisiones de React keys.
- Cantidad: `+/-`; llegar a 0 elimina la línea (`.filter(Boolean)`).
- Precio editable; en CUSTOM se fija directo, en PRODUCT se clamp a `[max(costPrice, price*0.5), price]`.
- `processSale` envía `{ type: "CUSTOM", productName, quantity, price }` para conceptos y `{ productId, quantity, price, useWholesale }` para productos.
- Recibo: separa líneas PRODUCT y CUSTOM ("Conceptos adicionales").

## Backend

- `OrderService.create` parte los ítems en `productItems` (type ≠ CUSTOM) y `customItems` (type = CUSTOM).
- PRODUCT: valida `productId` (nuevo guard), precios reales desde BD, stock atómico, descuento de stock + stock movement + low stock.
- CUSTOM: sin productRepo, sin stock, sin stock movements. Validación completa en servidor.
- Totales calculados en servidor sobre la mezcla.
- `analytics/route.ts`: `topProducts` excluye líneas con `productId = null` (conceptos no se reportan como "Producto eliminado").

## Database

- `OrderItem.type TEXT NOT NULL DEFAULT 'PRODUCT'` (PRODUCT | CUSTOM).
- `productId` ahora nullable en `OrderItem` (relación opcional) para líneas CUSTOM.
- Migración `20260815000000_order_item_type`: idempotente (`ADD COLUMN IF NOT EXISTS`), nunca dropea, aplicada en la BD local (docker `panitas-postgres`). Pendiente de commit/deploy.
- Regresiones revisadas: reportes que agregan `OrderItem` por `productId` ya filtran `null` (`sales.service`, `analytics`); los que agregan por `productName` muestran el concepto como línea vendida (correcto); `credit.service` y emails usan `productName`.

## AI

- REGLA 17 en `AGENTIC_BASE_RULES`: "No inventes conceptos adicionales ni productos ficticios. Los conceptos adicionales se agregan con la tool de venta usando el campo correspondiente, nunca creando un producto."
- Tool `sales.create` (tool calling nativo): `items` acepta `PRODUCT` (productId + price real del servidor) y `CUSTOM` (productName, quantity, price, sin productId).
- Confirmaciones: los conceptos son líneas aditivas (sin inventario); `sales.create` no exige confirmación (es la acción solicitada). Cancelar venta (restaura stock) sí la exige.

## Tools

- `sales.create` (nuevo, permiso `sales.create`, dominio sales).
- Flujo: `AgenticToolRunner` (provider) → `ToolExecutor` → `sales.create` → `OrderService.create` → repos/Prisma → `findById` → respuesta natural.

## UI

- `concept-modal.tsx` (nuevo), `pos-cart.tsx` (badge/editar/Agregar concepto), `pos/page.tsx` (estado de modal + handler), `receipt-modal.tsx` (sección Conceptos), `types.ts` (`CartItem.type`, `lineId`, `cartLineKey`).

## Tests

- `tests/services/order.service.test.ts`: +13 casos CUSTOM (solo conceptos, persistencia, mezcla, validaciones, type inválido, precio 0) + 3 nuevos (productId obligatorio, PRODUCT sin id, mezcla con precio servidor).
- `tests/tools/sales-create.test.ts`: 6 casos tool + 1 E2E AI (el LLM elige sales.create con CUSTOM vía runner).

## Dependencias

- Sin dependencias nuevas. `Product` → `OrderItem` (relación) se vuelve opcional; Prisma lo maneja con `productId` nullable.

---

## Archivos modificados (working tree sobre baseline 11A)

```
prisma/schema.prisma                      (OrderItem.type + productId nullable)
prisma/migrations/20260815000000_order_item_type/migration.sql  (nuevo, idempotente)
src/app/api/analytics/route.ts            (topProducts excluye productId null)
src/app/dashboard/pos/page.tsx            (ConceptModal + cartLineKey + items CUSTOM)
src/components/pos/concept-modal.tsx      (NUEVO)
src/components/pos/pos-cart.tsx           (Agregar concepto + badge + editar)
src/components/pos/receipt-modal.tsx      (sección conceptos)
src/components/pos/types.ts               (type, lineId, cartLineKey)
src/services/order.service.ts             (split items + guard productId + CUSTOM)
tests/services/order.service.test.ts      (+16 casos CUSTOM)
```

## Cambios del ciclo AI/tool-calling (relacionados)

```
src/lib/agent-core/tool-calling/*          (runner/prompt/schema/types — REGLA 17)
src/lib/agent/tools/domains/sales.ts       (sales.create con PRODUCT|CUSTOM)
src/lib/conversation/engine.ts + factory.ts (capa 3E)
src/lib/conversational-actions/executor.ts  (gate de permisos)
tests/*                                     (provider, tool-calling, engine-agentic, sales-create)
```
