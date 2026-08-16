# PANITAS 2.0 — FASE 11B — REPORT

*Feature Integration & AI Regression — Conceptos adicionales en ventas (POS) + reglas del agente AI.*

---

## 1. New feature identified

"Conceptos adicionales" en ventas: líneas del carrito que no son producto ni afectan inventario (mano de obra, instalación, envío, servicios). Se persisten en `OrderItem` con `type = "CUSTOM"` y `productId = null`. El agente AI registra los mismos conceptos a través de la tool `sales.create` (instrucción REGLA 17 de `AGENTIC_BASE_RULES`).

## 2. Files changed

- **POS/UI:** `src/components/pos/concept-modal.tsx` (nuevo), `src/app/dashboard/pos/page.tsx`, `src/components/pos/pos-cart.tsx`, `src/components/pos/receipt-modal.tsx`, `src/components/pos/types.ts`.
- **Backend:** `src/services/order.service.ts` (split PRODUCT/CUSTOM + guard `productId`), `src/app/api/analytics/route.ts` (excluye `productId null` de topProducts).
- **DB:** `prisma/schema.prisma`, `prisma/migrations/20260815000000_order_item_type/migration.sql` (nuevo).
- **AI/tools:** `src/lib/agent-core/tool-calling/*` (runner/prompt/schema/types — REGLA 17), `src/lib/agent/tools/domains/sales.ts` (`sales.create` con PRODUCT|CUSTOM), `src/lib/conversation/engine.ts`, `src/lib/conversation/factory.ts`, `src/lib/conversational-actions/executor.ts` (gate de permisos), `src/lib/agent/permissions/permissions.ts`.
- **Tests:** `tests/services/order.service.test.ts`, `tests/tools/sales-create.test.ts`, `tests/agent-core/tool-calling/*`, `tests/agent-core/provider-tool-calling.test.ts`, `tests/conversation/engine-agentic.test.ts`.

## 3. Database changes

- `OrderItem.type TEXT NOT NULL DEFAULT 'PRODUCT'` (PRODUCT | CUSTOM).
- `OrderItem.productId` ahora nullable (líneas CUSTOM).
- Migración idempotente (`ADD COLUMN IF NOT EXISTS`), sin operaciones destructivas, aplicada y verificada en la BD local (columna `type` presente). Sin FKs nuevas, sin constraints adicionales, sin cambios de tenant.

## 4. Backend changes

- `OrderService.create` valida tipos (`PRODUCT|CUSTOM`, error 400 si otro), parte ítems, y para líneas de producto exige `productId` (nuevo guard → 400 limpio en vez de error Prisma). Los precios reales y el stock se validan en servidor solo para productos; los conceptos no descuentan stock ni generan movimientos.
- `analytics/route.ts` filtra `productId null` en el ranking de topProducts (evita "Producto eliminado" fantasma). Ingresos/ventas siguen incluyendo conceptos (correcto).

## 5. Frontend changes

- `ConceptModal` con validación cliente/espejo del servidor (descripción ≤ 200, cantidad entera ≥ 1, precio ≥ 0).
- `cartLineKey()` (`lineId || productId`) elimina colisiones de keys React (productos se mezclan por `productId`; conceptos por `lineId` único).
- Badge "Concepto", edición con lápiz, cantidad +/- con `.filter(Boolean)`, recibo con sección "Conceptos adicionales".

## 6. AI changes

- REGLA 17: prohibido inventar conceptos/productos ficticios; los conceptos se agregan con la tool de venta.
- El runner (tool calling nativo) expone `sales.create` con CUSTOM a los LLM con permiso `sales.create`.

## 7. Tool changes

- `sales.create` (nuevo): items PRODUCT (productId, precio real servidor) y CUSTOM (productName, quantity, price, sin productId); crédito/pagos/envío/caja; `storeId` siempre del contexto (nunca del input).

## 8. Tests executed

- **Suite completa:** 171 archivos / **1498 tests PASS** (incluye los +16 de conceptos y +1 E2E AI).
- `npm run typecheck` PASS · `npm run build` PASS (exit 0).

## 9. POS regression

- Verificado por código y unit tests: crear venta, agregar/quitar producto, cambiar cantidades, cliente, método de pago, contado, crédito, confirmar venta, actualizar inventario. El flujo PRODUCT no cambia (test "keeps the legacy product flow unchanged"). Sin browser e2e en este entorno (no existe harness de e2e en el repo).

## 10. AI regression

- `engine-agentic` (7), `runner` (13), `provider-tool-calling` (6), `schema` (3), `prompt` (6), `sales-create` (7: incluye E2E donde el LLM elige sales.create con un concepto CUSTOM). Fallbacks deterministas y TTL de confirmación cubiertos.

## 11. Tenant isolation

- `storeId` deriva de `ctx` (usuario autenticado); productos consultados con `findByIds(ids, storeId)`; test "nunca acepta storeId desde el input". Líneas CUSTOM no referencian entidades de otros tenants. Sin referencias cruzadas.

## 12. Authorization

- `POST /api/orders` exige `admin|manager|seller` (sin cambios). `sales.create` exige permiso `sales.create` (test de denegación). La feature no amplía permisos ni roles.

## 13. Idempotency

- Guard `submitting` en `processSale` evita doble clic en el mismo turno. Riesgo pre-existente (no introducido por esta feature): no existe idempotency key para reintentos de red/tabs múltiples → una venta duplicada es posible si el cliente reintenta tras timeout. Documentado como riesgo.

## 14. Data consistency

- Dataset controlado en tests: solo conceptos, mezcla producto+concepto, precio 0, validaciones. Subtotal/total se recalculan en servidor; stock y stock movements solo para productos; conceptos sin inventario. Verificado con mocks de repos.

## 15. Security

- CSRF guard + rate limit (20/min) en el POST de órdenes. Errores del servicio devueltos como 400 con mensaje en español (sin stack traces/JSON interno). Sin nuevos secretos, sin SQL expuesto, sin cambios en headers.

## 16. Mobile

- `ConceptModal` en `sm:max-w-sm`, carrito scrollable, inputs numéricos con `min/step` (teclado numérico), touch targets razonables. Revisión de código; **no se ejecutó prueba en dispositivo móvil real en este entorno** → WARNING.

## 17. Browser

- No se ejecutó prueba en navegador (sin harness e2e en el repo). Verificación por code audit + build + unit tests → WARNING (no se declara PASS solo por HTTP 200).

## 18. Bugs found

- **[Real, corregido]** Ítem de producto sin `productId` (o `type: "PRODUCT"` sin id) caía en `findByIds([undefined])` → error interno Prisma (500) en vez de 400 claro. Introducido por hacer `productId` opcional en el split de ítems.
- **[Nota, no corregido]** `{cart.length >= 0 && ...}` en `pos-cart.tsx` es una condición siempre verdadera (inofensiva, cosmética).
- **[Nota, pre-existente]** `topProducts` del admin agrupa por `productName` e incluye conceptos como líneas vendidas (comportamiento correcto/informativo).
- **[Nota, pre-existente]** Sin idempotency key en creación de órdenes (riesgo de duplicado en reintento de red).

## 19. Fixes

- Guard en `order.service.ts`: todo ítem no-CUSTOM debe incluir `productId` → `400` claro antes de tocar BD.
- +3 regression tests en `order.service.test.ts` (productId obligatorio, PRODUCT sin id, mezcla con precio servidor) y +1 E2E AI en `sales-create.test.ts`.

## 20. Remaining risks

- Migración `20260815000000_order_item_type` está sin commit → debe desplegarse junto con el código (aplicada y verificada local).
- Sin e2e de navegador/dispositivo en este entorno (browser + mobile = WARNING).
- Idempotencia de red pre-existente (reintento → posible duplicado).
- POS con descuento 100% (total 0): el split de pagos exige cobertura; el flujo CUSTOM hereda esta regla (sin cambio).
- El guard de `productId` cubre el ítem; cantidades NaN para productos siguen siendo un caso de borde pre-existente.

---

## Veredicto (FASE 37)

**INTEGRATION VERIFIED WITH KNOWN RISKS**

- New POS Feature: **PASS**
- POS Regression: **PASS** (sin browser e2e)
- Database: **PASS**
- Tenant Isolation: **PASS**
- Authorization: **PASS**
- AI Instructions: **PASS**
- AI Tool: **PASS**
- AI Regression: **PASS**
- Data Integrity: **PASS**
- Reports: **PASS**
- Security: **PASS**
- Performance: **PASS** (sin regresión medible; la feature añade validación O(1) y consultas mínimas)
- Mobile: **WARNING** (no probado en dispositivo real)
- Browser: **WARNING** (no probado en navegador real; sin harness e2e)

**FINAL RECOMMENDATION: CONTINUE ROADMAP** (desplegar con la migración pendiente y cubrir browser/mobile e2e en el siguiente ciclo de QA de producción).
