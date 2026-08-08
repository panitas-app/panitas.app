# Centro Inteligente de Cobranza (FASE 6A)

Guía funcional y técnica del módulo de créditos inteligente: KPIs, estados,
abonos con re-cálculo automático, timeline, búsqueda/filtros, integración con
la IA y Business Memory.

---

## 1. Visión

El Centro de Cobranza convierte el módulo básico de créditos en un panel
orientado a **acciones** (no a tablas): el dueño ve de un vistazo cuánto tiene
por cobrar, quién está vencido y qué vence pronto, y desde cada tarjeta puede
ver el detalle, registrar abonos, recalcular cuotas o contactar por WhatsApp.

## 2. Estados del crédito

El estado es **derivado** en el servicio (`CreditService.toSummary`), no
persistido. Se calcula a partir de las cuotas, sus fechas de vencimiento y el
`creditStatus` de la orden.

| Estado | Valor | Cuándo |
|---|---|---|
| 🟢 Al día | `on_time` | Activo, sin cuotas vencidas ni próximas (≤ 7 días) |
| 🟡 Próximo a vencer | `upcoming` | Activo con próxima cuota dentro de 7 días |
| 🔴 Vencido | `overdue` | Activo con al menos una cuota vencida |
| 🔵 Pagado | `paid` | `creditStatus = completed` (todas las cuotas pagadas) |
| ⚫ Cancelado | `cancelled` | `creditStatus = cancelled` |

El campo persistido `Order.creditStatus` solo toma los valores
`active` / `completed` / `cancelled`.

## 3. Abonos con monto arbitrario

`CreditService.registerPayment` acepta **cualquier monto** y lo aplica en
**cascada** a las cuotas pendientes más antiguas (por fecha, luego número):

- Si el monto cubre la cuota → se marca `paid` (con `paidAt`).
- Si el monto es menor → la cuota queda **parcial** (`paidAmount > 0`,
  estado `pending` o `late` según su vencimiento).
- Si sobra → pasa a la siguiente cuota pendiente.
- Si con el abono se saldan todas las cuotas → el crédito pasa a
  `completed` y se emite `credit.completed`.

Reglas:

- El abono **no puede superar** el saldo pendiente total (se rechaza).
- Un crédito **cancelado o saldado bloquea** abonos y re-cálculos.
- Cada abono crea un `OrderPayment` verificado, emite `credit.payment.created`
  y deja una entrada de auditoría.

## 4. Re-cálculo de cuotas

`CreditService.reschedule` reemplaza el plan de cuotas vigente por uno nuevo:

- `count` — cantidad de cuotas (1 a 24).
- `totalAmount` — base del plan (por defecto, el saldo pendiente).
- `periodDays` — periodicidad en días (1 a 120).
- `startDate` — fecha de la primera cuota.

Cada cuota del nuevo plan vale `totalAmount / count`. Emite `credit.updated`.

## 5. KPIs (servidos por la API)

| KPI | Fuente |
|---|---|
| Total por cobrar | Suma de pendiente de créditos activos |
| Créditos activos | No pagados ni cancelados |
| Vencidos / monto vencido | Estado `overdue` |
| Vence en 7 días | Cuotas no pagadas con vencimiento en la ventana |
| Cobrado este mes | `OrderPayment` verificados del mes |
| % recuperación | Cobrado del mes ÷ (cobrado + por cobrar) |

Los KPIs se calculan en `CreditService.computeKpis` (backend), nunca en el
cliente.

## 6. Timeline por crédito

`CreditDetail.timeline` ordena cronológicamente:

1. **Crédito otorgado** (creación de la orden).
2. **Abonos** (cada `OrderPayment` verificado).
3. **Cuotas vencidas** (evento `overdue` por cuota).
4. **Cuotas recalculadas** (desde auditoría `credit.rescheduled`).
5. **Crédito cancelado** (desde auditoría `credit.cancelled`).
6. **Crédito saldado** (cierre automático).

## 7. API

### `GET /api/creditos`

Lista créditos con KPIs.

| Query | Valores |
|---|---|
| `status` | `all` \| `on_time` \| `upcoming` \| `overdue` \| `paid` \| `cancelled` |
| `search` | cliente, teléfono u número de orden |
| `limit` | máximo de resultados (default 100) |

Respuesta: `{ kpis, credits }`.

### `GET /api/creditos/[id]`

Detalle completo: resumen, productos, cuotas, abonos y timeline.

### `PATCH /api/creditos/[id]`

- `{ action: "reschedule", count, totalAmount?, periodDays, startDate? }`
- `{ action: "cancel", reason? }`

### `POST /api/creditos/[id]/payments`

Registra un abono. Body: `{ amount, method?, paidAt?, reference?, notes? }`.

### `GET|POST /api/business-memory/creditos/preferences`

Lee/guarda la vista del usuario (filtro y búsqueda) en Business Memory.

## 8. UI

- **`/dashboard/creditos`** — Centro de Cobranza:
  - Grilla de KPIs.
  - Buscador con debounce (350 ms).
  - Filtros por estado como chips con punto de color.
  - Tarjetas por crédito (cliente, saldo, barra de avance, próxima cuota,
    badges de estado) con acciones: ver detalle, registrar abono, recalcular,
    WhatsApp, historial.
  - Modales de abono y re-cálculo.
- **`/dashboard/creditos/[id]`** — Detalle con resumen, productos, cuotas
  (Pagada / Vencida / Parcial / Pendiente), abonos y timeline.

## 9. IA (asistente)

Nuevas acciones en el dominio `cobranza`:

| Acción | Qué hace |
|---|---|
| `consultar_vencidos` | Lista créditos vencidos + monitor |
| `quien_debe_mas` | Tabla con los mayores deudores |
| `proximos_vencimientos` | Créditos con cuotas por vencer en 7 días |
| `total_pendiente` | Resumen KPI de la cartera |
| `registrar_abono` | Abono a un crédito (confirmación crítica) |

`registrar_abono` resuelve el cliente por nombre/teléfono, toma su crédito
activo con saldo pendiente y registra el abono; el usuario **confirma** el
monto antes de aplicar (las mutaciones siempre piden confirmación).

## 10. Business Memory

El panel recuerda la vista del usuario:

- `bm.preference.creditos.filtro`
- `bm.preference.creditos.busqueda`

Al volver a la pantalla se restaura el filtro y la búsqueda exactos.
Aislamiento garantizado por `storeId`.

## 11. Eventos

- `credit.created` — al otorgar un crédito (desde `order.service`).
- `credit.payment.created` — al registrar un abono.
- `credit.completed` — al saldar todas las cuotas.
- `credit.updated` — al recalcular o cancelar.
- `credit.overdue` — desde el cron de recordatorios de cuotas.

## 12. Verificación

- `npx tsc --noEmit` → OK
- `npx eslint` (código nuevo) → 0 errores
- `npx vitest run` → suite completa en verde
- `npm run build` → OK

Detalle completo en [`docs/PHASE_6A_REPORT.md`](./PHASE_6A_REPORT.md).
