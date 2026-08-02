# EVENT_CATALOG — Catálogo de eventos de dominio

> Fuente de verdad: `src/events/event.service.ts` (`AppEvents`).
> Emitidos por los servicios (no por las rutas). El agente IA podrá suscribirse para actuar de forma proactiva.

---

## Convención

- **`on(event, listener)`** → suscribirse (devuelve función para desuscribirse).
- **`emit(event, payload)`** → disparo sincrónico (fire-and-forget).
- **`emitAsync(event, payload)`** → espera a los listeners async.

```ts
import { eventService } from "@/events/event.service"

const off = eventService.on("inventory.low_stock", (p) => {
  console.log(`Stock bajo de ${p.productName}: ${p.remainingStock}`)
})
```

---

## 1. `sale.created`

| Atributo | Valor |
|---|---|
| **Cuándo ocurre** | Al crear una venta/orden con pago (POS, checkout, manual). |
| **Payload** | `{ orderId, storeId, total, orderNumber }` |
| **Emisor** | `OrderService.create` |

**Futuros usos con IA**
- Confirmar al usuario la venta realizada.
- Calcular comisiones/tendencias de venta en tiempo real.
- Detectar anomalías (ventas inusuales) y alertar.

---

## 2. `order.created`

| Atributo | Valor |
|---|---|
| **Cuándo ocurre** | Al crear cualquier orden/pedido (independiente del estado de pago). |
| **Payload** | `{ orderId, storeId, orderNumber, total, paymentStatus }` |
| **Emisor** | `OrderService.create` |

**Futuros usos con IA**
- Seguimiento de pedidos y recordatorios de entrega.
- Sugerir productos complementarios al cliente.
- Detectar pedidos pendientes de cobro para seguimiento de crédito.

---

## 3. `product.created`

| Atributo | Valor |
|---|---|
| **Cuándo ocurre** | Al crear un producto en el catálogo. |
| **Payload** | `{ productId, storeId, name, sku }` |
| **Emisor** | `ProductService.create` |

**Futuros usos con IA**
- Informar al negocio del alta de producto.
- Recomendar precios/categoría según catálogo existente.

---

## 4. `product.updated`

| Atributo | Valor |
|---|---|
| **Cuándo ocurre** | Al actualizar un producto existente. |
| **Payload** | `{ productId, storeId, name, sku }` |
| **Emisor** | `ProductService.update` |

**Futuros usos con IA**
- Detectar cambios de precio significativos y alertar.
- Auditar historial de modificaciones de catálogo.

---

## 5. `inventory.low_stock`

| Atributo | Valor |
|---|---|
| **Cuándo ocurre** | Al decrementar stock por una venta y quedar en 1..5 unidades (> 0). |
| **Payload** | `{ productId, storeId, productName, remainingStock }` |
| **Emisor** | `OrderService.create` (durante el decremento de stock) |

**Futuros usos con IA**
- **"El agente recomienda realizar una compra al proveedor"** (caso canónico).
- Alertas proactivas de reposición.
- Estimar cuántos días de stock restan según ventas promedio.

---

## 6. `customer.created`

| Atributo | Valor |
|---|---|
| **Cuándo ocurre** | Al crear un cliente nuevo (`findOrCreateByPhone` no encontró existente). |
| **Payload** | `{ customerId, storeId, name }` |
| **Emisor** | `CustomerService.findOrCreateByPhone` |

**Futuros usos con IA**
- Dar la bienvenida al nuevo cliente.
- Construir perfil de cliente para recomendaciones.
- Segmentar por fecha de alta.

---

## 7. `appointment.created`

| Atributo | Valor |
|---|---|
| **Cuándo ocurre** | Al crear una cita en la agenda (booking autenticado o público). |
| **Payload** | `{ appointmentId, negocioId, date, time }` |
| **Emisor** | `AgendaService.create` |

**Futuros usos con IA**
- Recordatorios de citas al cliente.
- Detectar huecos libres y sugerir reagendamientos.
- Resumir la agenda del día al abrir el dashboard.

---

## 8. Eventos planificados (futuro)

| Evento | Propósito IA |
|---|---|
| `order.status_changed` | Seguimiento y notificaciones de estado |
| `appointment.cancelled` | Liberar huecos y ofrecer re-agenda |
| `payment.received` | Conciliación y alertas de cobro |
| `subscription.renewed` / `subscription.expiring` | Retención y cobro |
| `agent.action_completed` | Feedback al usuario de acciones del agente |
