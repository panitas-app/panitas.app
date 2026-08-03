# Inteligencia Operacional — Analizadores (FASE 4B)

> Analizadores deterministas que detectan situaciones de negocio usando
> **únicamente datos existentes** (capa de servicios 1B). Producen
> `AnalyzerResult<TData> = { observations, data }`.

## Reglas del cliente aplicadas

- **Sin predicciones**: se describe lo que pasó/está pasando, nunca lo que
  "ocurrirá" (no hay "se agotarán en 4 días").
- **Sin decisiones por el usuario**: cada observación puede sugerir una
  **revisión** (`action`), pero la decisión la toma el negocio.
- **Prioridad operativa**: pedidos pendientes > inventario > ventas > clientes.
- **Clientes por grupos**: sin insights individuales salvo solicitud explícita.

## Inventario (`analyzers/inventory-analyzer.ts`)

Consulta `InventoryService.overview/lowStock/noMovement/bestSellers` y detecta:
- productos agotados (`stock === 0`) → **importante**,
- productos con stock bajo (`0 < stock < umbral`, por defecto 5) → **importante**,
- productos sin movimiento en 30 días → info,
- más vendidos del mes → info.

Dependencias inyectables: `inventoryService`, `lowStockThreshold`, `inactiveDays`.

## Ventas (`analyzers/sales-analyzer.ts`)

Consulta `SalesService.summary` en 5 períodos (hoy, semana, mes, semana previa,
mes previo) + `productsSold`. Calcula ticket promedio y compara semana/mes con
el período anterior **solo si el período previo tiene datos y el cambio ≥ 10%**:
- aumento/descenso de la semana → info,
- aumento/descenso del mes → info,
- sin ventas hoy → info,
- más vendidos del mes → info.

La comparación expresa el **hecho observado**, no una proyección.

## Pedidos (`analyzers/order-analyzer.ts`)

Consulta `OrderService.getPending` + `OrderService.list(status: confirmed)`.
- pendientes de atender → **importante**,
- pendientes/confirmados con más de `delayDays` (por defecto 3) sin completar
  → **warning** ("posible demora").

## Clientes (`analyzers/customer-analyzer.ts`)

Consulta `CustomerService.metrics`, `SalesService.frequentCustomers` y
`OrderService.creditOutstanding`. **Solo por grupos:**
- activos este mes → info,
- nuevos este mes → info,
- con saldo pendiente (créditos/cuotas) → **warning**,
- inactivos en la ventana (por defecto 60 días) → info.

## Actividad (`analyzers/activity-analyzer.ts`)

Sintetiza el `ActivitySnapshot` del monitor en una observación general
("Hoy hay N ventas... Quedan M pedidos pendientes... X productos con inventario
bajo"). **No añade consultas.**

## Contratos de datos

Cada analizador expone su `data` para que el monitor arme el snapshot sin
repetir consultas:

| Analizador | `data` |
|------------|--------|
| Inventario | `{ lowStockCount, outOfStockCount, noMovementCount }` |
| Ventas | `{ todayOrders, todayRevenue, weekRevenue, monthRevenue, averageTicket }` |
| Pedidos | `{ pendingCount, delayedCount }` |
| Clientes | `{ totalCustomers, newThisMonth, activeThisMonth, outstandingCustomers, inactiveCount }` |

## Diseño para tests

Todos los analizadores aceptan deps por constructor (`AnalizerDeps`); en los
tests se inyectan servicios mockeados y se verifica que el `storeId` del
contexto se propaga a cada llamada de servicio (aislamiento por tienda).

## Tests

- `tests/business-intelligence/inventory-analyzer.test.ts` (3)
- `tests/business-intelligence/sales-analyzer.test.ts` (4)
- `tests/business-intelligence/order-analyzer.test.ts` (3)
- `tests/business-intelligence/customer-analyzer.test.ts` (3)
