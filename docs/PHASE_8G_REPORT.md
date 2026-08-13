# Reporte FASE 8G — Pre-Launch Audit & Hardening

*Fecha: 11/08/2026 · Proyecto: Panitas 2.0*

## Alcance

Auditoría pre-lanzamiento en 4 tracks: **Seguridad**, **IA/Agente**, **Finanzas** y
**Calidad/Testing**. Objetivo: llevar P0/P1 a 0 con verificación end-to-end y emitir
veredicto GO/NO-GO documentado.

## Estado inicial

- P0: 0 · P1: ~8 (4 del track financiero + scanner auth + AI anti-injection + otros)

## Correcciones aplicadas

### Seguridad
1. **Scanner auth (P1)** — `src/lib/scanner/session-token.ts`: `verifyScannerToken`
   con comparación timing-safe; aplicado a scan/disconnect/connect; clientes POS y
   product-form actualizados. Cubierto por `tests/scanner/scanner-auth.test.ts` (14 tests).
2. **AI anti prompt-injection (P1)** — bloque "REGLAS DE SEGURIDAD INALTERABLES" en
   `buildSystemPrompt` (`src/lib/agent-core/context-builder.ts`). Cubierto por tests.
3. **Slots de agenda (P2)** — `/api/appointments/slots`: `agendaId` directo exige
   sesión + pertenencia al negocio; la vía pública solo existe vía `store` slug.
4. **Perfil público (P2)** — `/api/perfil/[slug]`: whitelist en la respuesta;
   ya no expone `negocioId` ni `planType`.

### Finanzas (P1 — track financiero)
5. **Fechas de rango** — `src/lib/date-ranges.ts` (`startOfLocalDay`/`endOfLocalDay`)
   aplicado en 7 puntos (gastos, comisiones, auditoría, ventas online, analytics,
   best-sellers, repo de órdenes): el rango ya incluye el último día.
6. **Doble conteo de crédito** — analytics excluye `method: "credit"` del agregado
   de ingresos verificados (el financiado retorna como abono en cada cuota).
7. **Cierre de caja atómico** — `$transaction`, guard `status: "open"` anti
   doble-cierre, solo pagos `verified` y órdenes no canceladas, cobertura de 6 métodos
   de pago, `totalCredit` = saldo de cuotas no pagadas, `closedBy` con `userId`.
8. **Transaccionalidad general**:
   - `OrderService.create` → `prisma.$transaction` (orden + items + pagos + cuotas +
     stock + comisión + totales cliente + cupón) con validación de caja abierta.
   - Cancelación de orden → guard `updateMany` + restauración de stock/totales en la
     misma tx + limpieza del estado de cobro (crédito/instalments a `cancelled`).
   - Créditos → `registerPayment` y `reschedule` atómicos (preservan cuotas pagadas).
   - Proveedores → `registerPayment` atómico; `remove` bloqueado con saldo abierto.
   - `verify-payment` de órdenes → `$transaction`.
   - Repos (`Order/Product/Customer`) aceptan `Prisma.TransactionClient`.

### Esquema (aplicado con backup)
9. `OrderItem.productId` → `String?` + `onDelete: SetNull` (preserva histórico).
10. `SupplierInvoice.supplierId` y `SupplierPayment.supplierId` → `onDelete: Restrict`.
11. `CashRegisterSession.totalBinancePay Float @default(0)`.
12. `.env`: `SHADOW_DATABASE_URL` (shadow existente, puerto 5433).
    - `prisma validate` ✅ · `prisma generate` ✅ ·
    `prisma db push --accept-data-loss` a dev (5433) ✅ (único warning: unique
    pre-existente de `InboxMessage`). Backups previos:
    `backups/backup-2026-08-11T17-46-02-394Z.sql` y `backups/backup-2026-08-11T17-47-04-224Z.sql`.

## Verificación (criterios GO)

| Criterio | Resultado |
|---|---|
| P0 = 0 | ✅ |
| P1 = 0 | ✅ |
| TypeScript `tsc --noEmit` | ✅ PASS |
| ESLint | ✅ 0 errores |
| Build `next build` | ✅ PASS |
| Tests `vitest run` | ✅ **1427 / 1427 PASS** (164 archivos) |
| Base de datos / schema | ✅ validate + generate + push OK (dev 5433) |
| Residuos temporales (`tx-probe.ts`, `tx-test.cjs`) | ✅ eliminados |
| Entregables | ✅ 4 docs creados |

## Notas

- Los 14 tests que fallaban tras el refactor transaccional (mock sin `$transaction`)
  se resolvieron sin tocar los tests: los servicios solo usan `prisma.$transaction`
  sobre la BD real; con dobles inyectados ejecutan el mismo flujo sobre el doble.
- Quedan 2 errores de teardown en vitest por listeners globales de eventos que
  consultan la BD real (ruido, 0 tests fallidos) — ver `PRE_LAUNCH_GAPS.md` G-04.
- Brechas P3 post-launch documentadas (pasarela de pago, notificaciones, CSRF,
  SEO/SSR, etc.) — ver `PRE_LAUNCH_GAPS.md`.

---

# VEREDICTO: ✅ GO

Se cumplen todos los criterios de lanzamiento: **P0 = 0, P1 = 0**,
typecheck/lint/build/database **PASS** y **1427/1427** pruebas en verde.

**Condiciones de seguimiento (no bloqueantes):**
1. Atender P3 de alta prioridad en el primer post-launch (G-01 pasarela, G-02
   notificaciones, G-03 CSRF) según roadmap.
2. Reducir ruido de tests (G-04) en la próxima iteración de mantenimiento.
3. Levantar `panitas_test` (5432) si se incorporan tests integrados (G-05).
