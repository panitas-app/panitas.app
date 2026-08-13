# Matriz de Pruebas — Panitas 2.0 (Pre-Launch)

*Actualizado: 11/08/2026 · FASE 8G · Vitest*

## Resultado global

| Métrica | Valor |
|---|---|
| Archivos de prueba | **164** |
| Pruebas | **1427 / 1427 PASS** (0 failed) |
| Errores de teardown | 2 (ruido de listeners asíncronos, no fallan pruebas) |
| TypeScript `tsc --noEmit` | ✅ PASS |
| ESLint | ✅ 0 errores (423 warnings, en su mayoría `any` preexistentes) |
| Build `next build` | ✅ PASS |

## Cobertura por área funcional

### IA / Agente (416 pruebas)
- `agent-core/*` — pipeline, contexto, enrutado de modelo, herramientas, permisos, proveedores, wiring.
- `agent-intel/*` — intención, planificador, síntesis, inteligencia de conversación.
- `assistant*` · `assistant-behavior/*` — renderizado, monitores, personalidad, priorización.
- `conversation*` · `conversational*` · `conversational-actions/*` — motor de conversación, ejecutores de acciones (incl. créditos/financiero).
- `recommendations/*` — reglas, motor, analizadores, resumen.
- **FASE 8G**: `context-builder.test` verifica el bloque "REGLAS DE SEGURIDAD INALTERABLES" (anti prompt-injection).

### Memoria / Negocio
- `business-memory/*` — motor de memoria, preferencias por módulo (créditos, proveedores, finanzas, inbox, colección).
- `memory/*` — clasificador, extractor, retriever, storage.
- `knowledge/*` — índice, búsqueda, respuestas, listener.
- `business-intelligence*` — monitores, analizadores (ventas, inventario, clientes, órdenes), centro de BI.

### Finanzas (crítico 8G)
- `services/credit.service.test` — abono en cascada, cierre automático, reprogramación (pago 1 a 1), estados derivados.
- `services/supplier.service.test` — pagos, saldos, cascada de facturas, guard de saldo.
- `services/order.service.test` — creación POS con precios validados por servidor, stock, cupón, cliente, multitenant.
- `services/customer.service.test`, `services/product.service.test`, `services/inventory.service.test`, `services/sales.service.test`, `services/collection.service.test` — totales, stock, ventas, colección.
- `analytics/analytics.test` — métricas de ventas/ingresos.
- **FASE 8G**: los 4 archivos que fallaban por `$transaction` ahora pasan (57/57): credit, order, supplier, order-update-status.

### Seguridad (crítico 8G)
- `scanner/scanner-auth.test` — verificación de token de escáner (timing-safe), expiración, reutilización.
- `platform/*` — firma HMAC, SSRF, API keys, permisos, paginación, idempotencia, webhooks.
- `services/seller-auth.test` — autenticación de vendedores.
- `features/*` — gates de chat, feature flags, acceso por plan.
- `communication/*` — seguridad de proveedores.

### Eventos / Automatización
- `events/*` — bus, listeners (financiero, inbox), middlewares, bridge legacy.
- `automations` via `events/listeners` + `webhooks-service`.

### Plataforma
- `platform/dispatcher` · `deliver` · `signature` · `idempotency` · `permissions` · `pagination` · `public-api-route`.

## Pruebas agregadas en FASE 8G

| Fecha | Área | Archivo(s) | Resultado |
|---|---|---|---|
| 8G | Scanner auth | `tests/scanner/scanner-auth.test.ts` | ✅ |
| 8G | AI anti-injection | `tests/agent-core/context-builder.test.ts` | ✅ |
| 8G | Refactor transaccional | credit/order/supplier/order-update-status (57 tests) | ✅ 1427/1427 |

## Ruido conocido (no bloqueante)

- **2 errores de teardown** (`EnvironmentTeardownError: Closing rpc while "onUserConsoleLog" was pending`):
  listeners globales de eventos (webhooks, attention) que, ante `fireDomainEvent` no mockeado,
  intentan consultar la BD real y loguean `prisma:error` durante el cierre del worker.
  Pre-existente, no afecta el resultado (0 tests fallidos). Ver `PRE_LAUNCH_GAPS.md` G-04.

## Nota sobre base de datos de pruebas

- Los tests son **mockeados** (dobles inyectados); no requieren `panitas_test` (localhost:5432),
  actualmente inalcanzable (solo corre PostgreSQL de desarrollo en Docker puerto 5433).
- Verificación real de esquema: `prisma validate` ✅ + `prisma generate` ✅ +
  `prisma db push` a dev (5433) con backup previo ✅.
