# BUSINESS_ANALYTICS_ARCHITECTURE — Capa de métricas de negocio

> FASE 2C · Capa de solo lectura para las métricas que consumirá el agente IA.
> Se apoya en los repositorios existentes; **no toca la BD directamente ni ejecuta escrituras**.

---

## 1. Estructura

```
src/lib/analytics/
├── index.ts        # re-exports públicos
├── sales.ts        # getSalesMetrics(storeId, opts?)          → { today, week, month }
├── inventory.ts    # getInventoryHealth(storeId, opts?)       → { overview, lowStock, noMovement }
└── customers.ts    # getCustomerMetrics(storeId, opts?)       → CustomerMetrics
```

- **Solo lectura**: los tres puntos de entrada devuelven métricas agregadas; ningún flujo de analytics escribe en la BD.
- **Inyección de dependencias**: cada función acepta `repo?: XRepository` en `opts`, permitiendo tests con mocks sin tocar la BD (`tests/analytics/analytics.test.ts`).
- **Aislada de `src/lib/analytics/track.ts`**: `track.ts` es tracking de navegación del cliente (posthog-like); la capa nueva es métricas de negocio. No comparten módulos.

---

## 2. Contratos

### `getSalesMetrics(storeId, opts?)`
```ts
type SalesMetrics = {
  today:  { label, revenue, totalOrders, totalItems, averageTicket }
  week:   { label, revenue, totalOrders, totalItems, averageTicket }
  month:  { label, revenue, totalOrders, totalItems, averageTicket }
}
```
- Semana: lunes a hoy. Mes: 1ro del mes a hoy.
- `averageTicket = revenue / totalOrders` (0 si no hay pedidos).

### `getInventoryHealth(storeId, opts?)`
```ts
type InventoryHealth = {
  overview:  { totalProducts, totalStock, totalEntries, totalExits }
  lowStock:  Product[]      // stock <= lowStockThreshold (default 5)
  noMovement: Product[]     // sin movimientos en inactiveDays (default 30)
}
```

### `getCustomerMetrics(storeId, opts?)`
```ts
type CustomerMetrics = {
  total, newThisMonth, recurrent, inactive, inactiveDays,
  averageCustomerValue, totalSpent
}
```

---

## 3. Uso

```ts
import { getSalesMetrics, getInventoryHealth, getCustomerMetrics } from "@/lib/analytics"

const sales = await getSalesMetrics(storeId)
const stock = await getInventoryHealth(storeId, { lowStockThreshold: 5, inactiveDays: 30 })
const crm = await getCustomerMetrics(storeId, { inactiveDays: 60 })
```

Estos puntos de entrada son los que la futura capa de tools del agente usará para responder reportes de una sola llamada (vs. N consultas separadas).

---

## 4. Reglas

1. **Nunca añadir escrituras aquí**; si el agente necesita escribir, pasa por los servicios (`InventoryService`, `SalesService`, `CustomerService`, `OrderService`).
2. No importar `@/lib/prisma` directamente: los repositorios encapsulan la BD.
3. Umbrales siempre configurables vía `opts`, con defaults documentados.
4. Tests en `tests/analytics/analytics.test.ts` validan agregación + inyección de repos.
