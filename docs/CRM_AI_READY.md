# CRM_AI_READY — Módulo de Clientes listo para IA

> FASE 2C · Optimización del módulo core de clientes para el futuro agente IA.
> Sin cambios de schema. Todo derivable de `Customer` y `Order`.

---

## 1. Qué se añadió

### Consultas analíticas (`src/repositories/customer.repository.ts`)

| Método | Qué devuelve |
|---|---|
| `metrics(storeId, inactiveDays)` | `{ total, newThisMonth, recurrent, inactive, inactiveDays, averageCustomerValue, totalSpent }` |
| `ordersByCustomer(storeId, customerId, take)` | Historial de compras del cliente (con items) |

### Servicio (`src/services/customer.service.ts`)

| Método | Qué devuelve |
|---|---|
| `metrics(ctx, inactiveDays = 60)` | Cartera completa: totales, nuevos del mes, recurrentes, inactivos, ticket de vida |
| `getHistory(ctx, customerId, take = 20)` | Perfil + pedidos del cliente (valida pertenencia a la tienda) |
| `updateTotals` (existente) | Ahora **emite `customer.updated`** con los totales actualizados |
| `findOrCreateByPhone` (existente) | Emite `customer.created` en altas |

### Definiciones de métricas

| Métrica | Definición |
|---|---|
| `newThisMonth` | Clientes creados en el mes actual |
| `recurrent` | `totalOrders >= 2` |
| `inactive` | Última compra hace >= `inactiveDays` (default 60) |
| `averageCustomerValue` | `totalSpent / total` |
| `totalSpent` | Suma de `totalSpent` de todos los clientes |

---

## 2. Cómo lo consumirá el agente

**Consultas (tools lectura):**
- "¿Cuántos clientes tengo?" / "¿Cuántos son nuevos este mes?" → `metrics`
- "¿Quiénes llevan tiempo sin comprar?" → `metrics.inactive` (segmentar campañas)
- "¿Qué ha comprado el cliente X?" → `getHistory`

**Señales (eventos):**
- `customer.created` → dar la bienvenida y construir perfil.
- `customer.updated` → recalcular segmentación y detectar caídas de actividad.

**Punto de entrada unificado:** `getCustomerMetrics(storeId)` en `src/lib/analytics/customers.ts`.

---

## 3. Reglas de uso

1. **Nunca editar totales de cliente directo** → `CustomerService.updateTotals` (valida tienda y emite `customer.updated`).
2. Cancelar una orden descuenta totales y emite `customer.updated` desde la ruta `status`.
3. `findOrCreateByPhone` es el único punto de alta (unicidad `[storeId, phone]`).
