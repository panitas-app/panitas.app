# Brechas Pre-Launch — Panitas 2.0

*Actualizado: 11/08/2026 · FASE 8G*

Brechas detectadas en el pre-launch. Se clasifican como **P1** (bloqueantes, ya
resueltas en 8G), **P2** (resueltas en 8G) y **P3** (post-launch / no bloqueantes,
sin features nuevas en 8G por alcance).

## P1 — Bloqueantes (resueltas en 8G)

| ID | Brecha | Fix |
|---|---|---|
| B-01 | Fecha corta `YYYY-MM-DD` excluía el último día en gastos, comisiones, auditoría, ventas online, analytics, best-sellers | `src/lib/date-ranges.ts` (`startOfLocalDay`/`endOfLocalDay`) aplicado en 7 puntos |
| B-02 | Crédito se contaba doble en analytics (pago + cuotas) | `revenueWhere(gte)` excluye `method: "credit"` |
| B-03 | Cierre de caja sin transacción, métodos incompletos, doble-cierre posible, `totalCredit` incorrecto | Cierre atómico con guard `status: "open"`, filtro `verified`/no-cancelado, 6 métodos, cuotas no pagadas |
| B-04 | Creación de orden no atómica (orden+pago+stock+totales) | `OrderService.create` en `$transaction` |
| B-05 | Cancelación de orden no atómica y con doble-restitución de stock posible | Guard `updateMany` + restauración en la misma tx + limpieza del estado de crédito |
| B-06 | Abono de crédito y reprogramación sin transacción | `registerPayment` y `reschedule` en `$transaction` (preserva cuotas pagadas) |
| B-07 | Pago a proveedor sin transacción; se podía borrar proveedor con saldo abierto | `registerPayment` atómico + guard `openBalance > 0.001` + Restrict en FK |
| B-08 | Verificación de pago de orden sin transacción | `$transaction` en `verify-payment` |
| B-09 | `OrderItem.productId` no nullable → borrar producto borraba el histórico de ventas | `productId String?` + `onDelete: SetNull` |
| B-10 | `tx-probe.ts` / `$env:TEMP\tx-test.cjs` temporales | Eliminados |
| B-11 | Tests que fallaban por el mock sin `$transaction` (14 tests) | Refactor DI: tx solo sobre BD real; **1427/1427 PASS** |

## P2 — Resueltas en 8G

| ID | Brecha | Fix |
|---|---|---|
| B-12 | `/api/appointments/slots` expuesto: `agendaId` directo sin validar pertenencia al negocio | Auth + verificación `agenda.negocioId === negocio.id`; acceso público solo vía `store` slug |
| B-13 | `/api/perfil/[slug]` devolvía campos internos (`negocioId`, `planType`) | Whitelist explícita en la respuesta pública |

## P3 — Post-launch / No bloqueantes (pendientes)

| ID | Brecha | Prioridad | Nota |
|---|---|---|---|
| G-01 | Pasarela de pago automática (Stripe/PayPal/Epayco) para suscripciones | 🔴 Alta | Hoy es comprobante + verificación admin |
| G-02 | Notificaciones por email (confirmación, recibo, alertas) | 🔴 Alta | Existe envío de confirmación de pedido; falta escala |
| G-03 | CSR: mutaciones de tienda pública sin token CSRF | 🔴 Alta | Revisar en fase post-launch |
| G-04 | Ruido de tests: listeners globales (webhooks/attention) loguean contra BD real (2 errores de teardown) | 🟡 Media | Mockear `@/lib/events` en suites de servicios o registrar listeners solo en runtime |
| G-05 | Base de datos de tests (`panitas_test` @5432) no disponible | 🟡 Media | Los tests son mockeados; levantar PG en 5432 si se agregan tests integrados |
| G-06 | Página 404 personalizada (`not-found.tsx`) | 🟡 Media | |
| G-07 | Error boundaries (`error.tsx`) | 🟡 Media | |
| G-08 | Loading states (`loading.tsx`) | 🟡 Media | |
| G-09 | Modo oscuro (next-themes instalado, no implementado) | 🟡 Media | |
| G-10 | Badge "Agotado" en stock 0 en tienda pública | 🟡 Media | |
| G-11 | Alertas de inventario bajo proactivas | 🟡 Media | |
| G-12 | Variantes de producto (hasSizes/sizes en schema, sin UI) | 🟡 Media | |
| G-13 | Límites de tamaño en request body de APIs | 🟡 Media | |
| G-14 | Validar contenido real de archivos (no solo MIME) | 🟡 Media | |
| G-15 | SSR para SEO en tienda pública | 🟡 Media | Página pública es client component |
| G-16 | Exportar CSV/Excel de analytics (promocionado en pricing) | 🟡 Media | Existe `/api/download`; validar alcance |
| G-17 | Dominio personalizado (schema `domain` sin UI) | 🟢 Baja | |
| G-18 | WhatsApp Business API (hoy solo enlace directo) | 🟢 Baja | |
| G-19 | PWA / instalable | 🟢 Baja | |
| G-20 | Carritos abandonados | 🟢 Baja | |
| G-21 | Código QR para tienda pública | 🟢 Baja | Componente existe, no integrado |
| G-22 | Multi-idioma (EN/ES) | 🟢 Baja | |
| G-23 | Multi-tienda por usuario (schema soporta, sin UI) | 🟢 Baja | |
| G-24 | Menú digital / QR mesas | 🟢 Baja | |
| G-25 | Monitoreo / observabilidad | 🟢 Baja | |

## Resumen

- **P1 resueltas**: 11/11 · **P2 resueltas**: 2/2
- **P3 pendientes**: 25 (ninguna bloquea el GO; priorizadas por el roadmap)
