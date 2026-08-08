# FASE 6C — Supplier Center — Reporte

## Resumen ejecutivo

Se construyó el **Centro de Proveedores (cuentas por pagar)** sobre la capa
que antes era solo `Expense.vendor`: proveedores con saldo, facturas (compras)
que incrementan la deuda, pagos y abonos de monto arbitrario aplicados en
**cascada** a las facturas más antiguas, estados derivados, timeline
cronológico, KPIs, 5 acciones nuevas de IA, eventos de dominio `supplier.*` y
preferencias aprendidas en Business Memory.

**Verificación:** `tsc --noEmit` OK · **57 tests nuevos** (23 `SupplierService`
+ 7 `supplier-preferences` + 10 ejecutor 6C + 17 de regresión del ejecutor) ·
suite completa en verde · `db:push` aplicado con backup
`backup-2026-08-06T02-06-17-540Z.sql`.

## Qué se implementó

### 1. Schema y dominio (`P1`)
- **`prisma/schema.prisma`** — tres modelos nuevos tras el bloque Collection:
  - `Supplier` (`@@unique([storeId, name])`, campos de contacto, `isActive`).
  - `SupplierInvoice` (número, descripción, monto, `dueDate`, estado
    `pending|partial|paid|cancelled`, `paidAmount`, método, ref, notas).
  - `SupplierPayment` (`invoiceId` opcional con `onDelete: SetNull`, método,
    referencia, notas).
  - Relaciones añadidas al final de `model Store`.
- Aplicado con `npm run db:push` + `npx prisma generate` (Prisma v7.8.0).

### 2. `SupplierService` (`P2`)
- `list` (KPIs + tarjetas), `getDetail` (facturas, pagos, timeline),
  `create`/`update`/`remove` (nombre único case-insensitive, auditoría,
  eventos).
- `recordPurchase`: factura pendiente que incrementa saldo; auto-crea el
  proveedor cuando llega solo `supplierName`.
- `registerPayment`: cascada **oldest-first** por vencimiento efectivo
  (`dueDate ?? date`), rechaza montos > saldo, marca `paid`/`partial`,
  recalcula saldo y emite `payment.created` (+ `payment.partial` si queda
  saldo) y `balance.updated`.
- Estados derivados `saldado | al_dia | por_vencer | vencido | inactivo`.
- **Bug de list corregido durante tests**: cada tarjeta ahora suma solo sus
  facturas/pagos (`supplierId`), no los totales de la tienda.
- Export de `SupplierService` + 13 tipos en `src/services/index.ts`.

### 3. Business Memory (`P3`)
- `src/lib/business-memory/supplier-preferences.ts`: claves
  `bm.preference.proveedores.{categoria,metodo,filtro}`; aprendizaje por
  repetición (umbral 3) + filtro explícito con `importance: "LOW"`.
- API `GET|POST /api/business-memory/proveedores/preferences`.

### 4. APIs (`P4`)
- `GET|POST /api/suppliers`, `GET|PATCH|DELETE /api/suppliers/[id]`,
  `POST /api/suppliers/[id]/purchases`, `POST /api/suppliers/[id]/payments`.
- Mutaciones con `csrfGuard`, `isServiceError` y `params: Promise` (patrón
  Next 15 de la rama).

### 5. UI (`P5`)
- `src/components/dashboard/suppliers/`: `supplier-types` (estados, métodos,
  categorías, helpers), `kpi-grid`, `supplier-card`, `payment-modal`,
  `purchase-modal`, `supplier-form-modal`, `timeline`.
- Páginas `/dashboard/suppliers` (KPIs, búsqueda con debounce, filtros con
  memoria) y `/dashboard/suppliers/[id]` (detalle, toggle activo, eliminar).
- Sidebar: "Proveedores" (Truck) en roles admin/manager.

### 6. IA (`P6`)
- Catálogo: `deuda_total`, `pagar_esta_semana`, `registrar_pago_proveedor`
  (con confirmation critical), `facturas_vencidas`, `mayor_deuda`.
- Signals de pago ("pagarle a", "pague a", "le pague a") separadas de
  `registrar_compra_proveedor` (legacy); "compre a" permanece en compra.
- `rich.ts`: `suppliersSummary`, `supplierCard`, `suppliersList`,
  `suppliersTable` + `RichSupplier`/`SUPPLIER_STATE_LABEL`/`supplierDate`.
- `executor.ts`: `supplierService` en `ExecutorDeps`, `toRichSupplier`,
  `resolveSupplier`, 5 casos nuevos; `conversation/factory.ts` inyecta
  `SupplierService`.

### 7. Eventos
- 8 eventos `supplier.*` registrados en `event-registry.ts` (categoría
  `suppliers`) y emitidos por el servicio.

## Tests (57 nuevos)

- **`tests/services/supplier.service.test.ts` (23)**: create/update/remove
  con validaciones y eventos, recordPurchase (incl. auto-creación y
  reutilización por nombre), registerPayment en cascada (partial, pago total,
  rechazo por saldo, abono sobre factura parcial), KPIs, estados derivados y
  timeline. Con mock de BD en memoria.
- **`tests/business-memory/supplier-preferences.test.ts` (7)**: defaults,
  umbral de repetición, método, claves/dominio, filtro explícito, aislamiento
  por store y no-escritura redundante.
- **`tests/conversational-actions/executor.test.ts` (+10)**: `deuda_total`,
  `pagar_esta_semana`, `registrar_pago_proveedor` (éxito y errores),
  `facturas_vencidas`, `mayor_deuda`; `makeDeps` ahora incluye el mock de
  `supplierService`.

## Verificación

- `npx tsc --noEmit` → OK
- `npx vitest run` → suite completa en verde
- `npm run build` → paso final

## Notas

- `registerPayment` recalcula el saldo siempre desde las facturas abiertas
  (nunca lo persiste), igual que el patrón de abonos de 6A.
- El Centro de Proveedores **convive** con el módulo de gastos: las compras
  legacy (`Expense.vendor`) siguen funcionando; proveedores es la evolución a
  cuentas por pagar reales.
- El pago desde la IA se registra con nota "Pago registrado por el asistente"
  y requiere confirmación crítica antes de aplicarse.
- Guía funcional: [`docs/SUPPLIER_CENTER.md`](./SUPPLIER_CENTER.md).
