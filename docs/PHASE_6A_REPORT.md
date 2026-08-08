# FASE 6A — Smart Collection Center — Reporte

## Resumen ejecutivo

Se transformó el módulo básico de créditos en un **Centro Inteligente de
Cobranza**: KPIs de cartera, tarjetas por crédito con estados y acciones,
página de detalle con timeline, registro de abonos con re-cálculo automático,
buscador/filtros, 5 acciones de IA en el dominio `cobranza` y preferencias de
vista persistidas en Business Memory.

**Verificación:** `tsc --noEmit` OK · lint 0 errores · **33 tests nuevos**
(19 `CreditService` + 9 ejecutor cobranza + 5 preferencias) · suite completa
sin regresiones.

## Qué se implementó

### 1. Schema y dominio (`P1`)
- **`prisma/schema.prisma`**: `Order.creditStatus String? @default("active")`
  y `OrderPayment.notes String?`. Aplicado con `npm run db:push` (backup
  automático) y `npx prisma generate`.
- **`src/services/credit.service.ts`** (`CreditService`):
  - `list` → KPIs + créditos filtrados por estado/búsqueda.
  - `listByCustomer` → créditos activos con saldo pendiente (para la IA).
  - `getDetail` → items, abonos, cuotas y timeline cronológico.
  - `registerPayment` → abono arbitrario en cascada oldest-first, pagos
    parciales, cierre automático, eventos `credit.payment.created`/
    `credit.completed`, auditoría.
  - `reschedule` → reemplaza el plan (count / total / periodicidad / inicio),
    emite `credit.updated`.
  - `cancel` → `creditStatus = cancelled`, bloquea abonos/re-cálculos.
  - Estados derivados `on_time | upcoming | overdue | paid | cancelled`.

### 2. APIs (`P2`)
- **`GET /api/creditos`** — `{ kpis, credits }` con `status`, `search`, `limit`.
- **`GET/PATCH /api/creditos/[id]`** — detalle; `reschedule` / `cancel`.
- **`POST /api/creditos/[id]/payments`** — abono verificado.
- Sin `any` en el código nuevo.

### 3. UI (`P3`)
- `src/components/dashboard/credits/`: `credit-types.ts`, `credit-card.tsx`,
  `payment-modal.tsx`, `reschedule-modal.tsx`, `kpi-grid.tsx` (6 KPIs),
  `timeline.tsx`.
- `src/app/dashboard/creditos/page.tsx` — KPIs, buscador (debounce 350 ms),
  filtros por chip con punto de color, tarjetas, modales.
- `src/app/dashboard/creditos/[id]/page.tsx` — detalle: resumen con saldo y
  barra, productos, cuotas (Pagada/Vencida/Parcial/Pendiente), abonos,
  historial/timeline, acciones WhatsApp/abono/recalcular/cancelar.

### 4. IA (`P4`)
- Dominio `cobranza` en `ACTION_DOMAINS`.
- 5 acciones en el catálogo: `consultar_vencidos`, `quien_debe_mas`,
  `proximos_vencimientos`, `total_pendiente`, `registrar_abono`
  (este último con `confirmation: "critical"`).
- `executor.ts`: casos de ejecución con `resolveCreditByCustomer` y
  `registerCreditPayment`; rich output (monitor, list, table, kpi, card).
- `rich.ts`: `creditsSummary`, `creditCard`, `creditsList`, `creditsTable`.
- `renderers/icons.ts`: iconos `wallet` y `calendar-check`.
- `conversation/factory.ts`: `creditService` cableado en el engine.

### 5. Business Memory
- **`src/lib/business-memory/credit-preferences.ts`**: claves
  `bm.preference.creditos.filtro` / `bm.preference.creditos.busqueda`.
- **`GET|POST /api/business-memory/creditos/preferences`**: lee/guarda la vista.
- La página del centro de cobranza restaura y persiste filtro + búsqueda.

## Tests (33 nuevos)

- **`tests/services/credit.service.test.ts` (19)**: estados derivados
  (overdue/upcoming/on_time/paid), filtros (estado, búsqueda, por cliente),
  cascada de abonos (parcial, múltiples cuotas, cierre automático), rechazos
  (monto > saldo, crédito cancelado/saldado), reschedule, cancel, aislamiento
  por tenant y timeline. Con mock de BD en memoria.
- **`tests/conversational-actions/credit-executor.test.ts` (9)**: las 5
  acciones de cobranza, validación de montos y casos sin créditos.
- **`tests/business-memory/credit-preferences.test.ts` (5)**: defaults, guardar/
  leer, claves, aislamiento por store y no-escritura redundante.

## Verificación

- `npx tsc --noEmit` → OK
- `npx eslint` (archivos nuevos) → 0 errores (1 warning heredado)
- `npx vitest run` → suite completa en verde
- `npm run build` → paso final confirmado

## Notas

- El estado es derivado; `creditStatus` solo persiste `active`/`completed`/
  `cancelled`.
- `cancel` ya no elimina cuotas (bloquea mutaciones en su lugar).
- La IA de clientes conserva su `regresar_credito`; las acciones de cobranza
  son adiciones.
- Guía funcional: [`docs/COLLECTION_CENTER.md`](./COLLECTION_CENTER.md).
