# Centro de Proveedores — Cuentas por pagar (FASE 6C)

Guía funcional y técnica del módulo de proveedores: cuentas por pagar con
saldos automáticos, facturas, pagos y abonos en cascada, timeline, KPIs,
integración con la IA y Business Memory.

---

## 1. Visión

El Centro de Proveedores convierte la capa delgada de `Expense.vendor`
(compras como simple gasto) en un módulo real de **cuentas por pagar**: el
dueño registra proveedores, anota cada compra/factura que incrementa la deuda
y registra pagos o abonos que se aplican solos a las facturas más antiguas,
con el saldo actualizado en tiempo real. No reemplaza el módulo de gastos:
ambos conviven (una compra puede seguir registrándose como gasto).

## 2. Estados del proveedor

El estado es **derivado** en el servicio (`SupplierService.stateOf`), no
persistido.

| Estado | Valor | Cuándo |
|---|---|---|
| 🟢 Saldado | `saldado` | Sin facturas pendientes |
| 🔵 Al día | `al_dia` | Con deuda, nada vencido ni por vencer (≤ 7 días) |
| 🟡 Por vencer | `por_vencer` | Con deuda que vence en los próximos 7 días |
| 🔴 Vencido | `vencido` | Con al menos una factura vencida con saldo |
| ⚪ Inactivo | `inactivo` | Proveedor desactivado (`isActive = false`) |

## 3. Facturas y saldo automático

`SupplierService.recordPurchase` registra una factura/compra:

- Acepta `supplierId` o `supplierName`; si el nombre no existe, **crea el
  proveedor automáticamente** (y emite `supplier.created`).
- La factura nace `pending` con `paidAmount = 0` e incrementa el saldo.
- Se emiten `supplier.invoice.created` y `supplier.balance.updated`.

El **saldo pendiente** de un proveedor se recalcula siempre desde sus
facturas abiertas: `Σ max(0, amount − paidAmount)` para `status ∉ {paid,
cancelled}`.

## 4. Pagos y abonos en cascada (oldest-first)

`SupplierService.registerPayment` acepta **cualquier monto** y lo aplica en
**cascada** a las facturas pendientes más antiguas (orden por fecha de
vencimiento efectiva `dueDate ?? date`, empate por fecha de la factura):

- Si el monto cubre la factura → pasa a `paid`.
- Si el monto es menor → la factura queda **parcial** (`partial`).
- Si sobra → se aplica a la siguiente factura pendiente.
- El saldo del proveedor y su estado se recalculan automáticamente.

Reglas:

- El pago **no puede superar** el saldo pendiente total (se rechaza).
- Cada pago crea un `SupplierPayment` y emite `supplier.payment.created`
  (+ `supplier.payment.partial` si queda saldo) y `supplier.balance.updated`.
- Se audita cada mutación (`supplier.payment` / `supplier.payment.partial`).

## 5. KPIs (servidos por la API)

| KPI | Fuente |
|---|---|
| Por pagar | Suma del saldo de facturas abiertas |
| Facturas pendientes | Facturas abiertas |
| Vencidas / monto vencido | Facturas abiertas con `dueDate` pasada |
| Por vencer (7 días) | Facturas abiertas con vencimiento en la ventana |
| Pagado este mes | `SupplierPayment` del mes en curso |
| Proveedores activos | `Supplier.count({ isActive: true })` |

Los KPIs se calculan en `SupplierService.computeKpis` (backend).

## 6. Timeline por proveedor

`SupplierDetail.timeline` ordena cronológicamente: **Proveedor registrado**,
**compras** (facturas) y **pagos** (abonos), cada uno con su fecha y monto.

## 7. API

### `GET /api/suppliers`

Lista proveedores con KPIs.

| Query | Valores |
|---|---|
| `status` | `all` \| `saldado` \| `al_dia` \| `por_vencer` \| `vencido` \| `inactivo` |
| `search` | nombre, RUC, teléfono, email o categoría |
| `limit` | máximo de resultados (default 100, tope 500) |

Respuesta: `{ kpis, suppliers }`.

### `POST /api/suppliers`

Crea un proveedor. Body: `{ name*, ruc?, phone?, email?, address?,
category?, notes? }`. Nombre único por store (case-insensitive).

### `GET /api/suppliers/[id]`

Detalle completo: resumen, facturas, pagos y timeline.

### `PATCH /api/suppliers/[id]`

Actualiza campos y/o `isActive`. Body: mismo que POST + `isActive?`.

### `DELETE /api/suppliers/[id]`

Elimina el proveedor. Devuelve `{ removed: true, id }`.

### `POST /api/suppliers/[id]/purchases`

Registra una factura/compra. Body: `{ description*, amount*, number?, date?,
dueDate?, paymentMethod?, documentRef?, notes? }`. Devuelve la factura (201).

### `POST /api/suppliers/[id]/payments`

Registra un pago/abono. Body: `{ amount*, date?, paymentMethod?, reference?,
notes? }`. Aplica en cascada y devuelve el detalle actualizado.

Todas las mutaciones requieren token CSRF (`csrfGuard`).

### `GET|POST /api/business-memory/proveedores/preferences`

Lee/guarda la vista del usuario (filtro activo) en Business Memory. El POST
acepta `{ filter }` con valores `all | saldado | al_dia | por_vencer |
vencido | inactivo`.

## 8. UI

- **`/dashboard/suppliers`** — KPIs superiores, búsqueda (debounce 350 ms),
  filtros por estado persistidos en Business Memory, tarjetas con saldo y
  estado; modales para crear proveedor, registrar compra y registrar pago.
- **`/dashboard/suppliers/[id]`** — detalle del proveedor con facturas,
  pagos, timeline, toggle activo/inactivo y eliminar (con confirmación).
- Sidebar: **"Proveedores"** (icono Truck) en roles admin/manager.

## 9. IA (asistente)

Cinco acciones nuevas en el catálogo conversacional:

| Acción | Qué hace |
|---|---|
| `deuda_total` | Resume el total por pagar a proveedores y alerta vencidos |
| `pagar_esta_semana` | Lista pagos que vencen en los próximos 7 días |
| `registrar_pago_proveedor` | Registra un pago (confirma antes de aplicar) |
| `facturas_vencidas` | Lista proveedores con facturas vencidas |
| `mayor_deuda` | Nombra al proveedor con mayor saldo |

Los pagos se resuelven por nombre del proveedor; "pagarle a / pague a / le
pague a" dispara `registrar_pago_proveedor`, mientras "compre a" mantiene el
registro de compra legacy (gasto con `vendor`).

## 10. Eventos de dominio

Registrados en `event-registry.ts` bajo la categoría `suppliers`:

- `supplier.created` · `supplier.updated` · `supplier.deleted`
- `supplier.invoice.created` · `supplier.payment.created`
- `supplier.payment.partial` · `supplier.balance.updated`

## 11. Business Memory

`src/lib/business-memory/supplier-preferences.ts` aprende:

- Categoría de proveedor favorita (`bm.preference.proveedores.categoria`).
- Método de pago más usado (`bm.preference.proveedores.metodo`).
- Filtro activo del panel (`bm.preference.proveedores.filtro`, explícito).

Las dos primeras se aprenden por repetición (umbral `preference` = 3), la
última se persiste explícitamente desde el panel.
