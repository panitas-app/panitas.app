# FIRST_VALUE_FLOW.md — Panitas · Primer Valor Real para el Cliente (FASE 11A)

**FASE 11A · 2026-08-15 · Branch: `develop-v2` · HEAD: `2e01908` · Deploy actual: `dpl_2TP7CoTuQeMXMw21ioWaMgeetJB9`**

Documento de la FASE 11A que define el recorrido de "primer valor" de un cliente real: desde que se registra hasta que percibe utilidad concreta de Panitas. Valida que cada paso del recorrido funciona con el flujo real de cliente en **producción** (panitas.app).

---

## 1. Definición de "primer valor"

Un cliente real de Panitas obtiene **primer valor** cuando cumple los siguientes hitos en orden:

1. **SIGNUP** — Crea su cuenta con email + contraseña (o Google).
2. **TENANT CREATION** — El sistema crea su negocio/tienda (Negocio + Store + StoreMember admin + Agenda si aplica).
3. **USER CREATION** — El usuario queda autenticado con su sesión (JWT).
4. **ONBOARDING** — El usuario completa el wizard de onboarding (tipo de negocio, información, activación).
5. **BUSINESS CONFIGURATION** — El usuario configura datos del negocio (nombre, descripción, enlace, dirección).
6. **FIRST PRODUCT** — Registra su primer producto.
7. **FIRST CUSTOMER** — Registra su primer cliente.
8. **FIRST SALE** — Registra su primera venta.
9. **FIRST REPORT** — Ve su primer reporte/analítica con datos propios.
10. **AI USAGE** — Usa el asistente con IA sobre sus datos.

**Sin estos hitos, un cliente no percibe valor.** Este documento audita cada hito contra el flujo real en producción.

---

## 2. Tenant de prueba creado para la validación (FASE 4)

| Campo | Valor |
|---|---|
| Email | `prueba11a.direct.1786795526,30682@pruebas.invalid` |
| Nombre de usuario | `PRUEBA-11A Direct` |
| Nombre del negocio (final) | `PRUEBA-11A Tienda Demo` |
| Slug | `prueba-11a-tienda-demo` |
| Plan | `comercio` (Plan Emprendedor) — planEstado `pendiente` |
| País | VE |
| Moneda | USD |
| IDs | User `cmsukhvq7000004joh8ucedol` · Negocio `cmsukp6nt000004k2su8i1rqe` · Store `cmsukp6o8000104k26gsomuci` · StoreMember `cmsukp6ol000204k2ftl6i9o4` (admin) · Agenda `cmsukp6ov000304k2c9e6soxq` |

Creado **en producción** con el flujo real de cliente (UI + endpoints reales), identificable con prefijo `PRUEBA-11A`. Sin seeds internos.

---

## 3. Flujo validado paso a paso (evidencia real, 2026-08-15)

### 3.1 SIGNUP — Registro (PASS, con observación)

- **Endpoint real**: `POST /api/auth/register` → 200 `{"success":true}`.
- Crea únicamente `User` (sin tienda). Envía email de bienvenida + email de verificación con `{codigo, token}` (expiración 15 min).
- **Rate limit**: 3 intentos / 15 min por IP (correcto).
- **Observación UI**: el checkbox de términos (`base-ui` Checkbox) no alternó con click programático estándar; el flujo UI de registro es el único que quedó validado por API directa, no por UI completa. El envío de email a dominio `.invalid` queda registrado en `EmailLog` (esperado en entorno de prueba).

### 3.2 VERIFICACIÓN DE EMAIL (PASS)

- Link real del email: `GET /api/auth/verify-email?token=<token>` → 307 → `/onboarding?verified=true`.
- `is_email_verified = t` confirmado en BD.
- Se envió email "verificado" (fallo de entrega esperado por dominio `.invalid`, observable).

### 3.3 USER CREATION / LOGIN (PASS)

- `POST /api/auth/login` → 200 `{"success":true}`.
- Sesión JWT (`__Secure-authjs.session-token`) establecida, reutilizada para el flujo UI.

### 3.4 ONBOARDING — Wizard 3 pasos (PASS funcional, hallazgo de datos)

- `GET /onboarding/negocio` renderiza wizard (Stepper 1-3): tipo de negocio → información → activación.
- Se completaron los 3 pasos por UI real y se redirigió a `/choose-plan`.
- **HALLAZGO (10A/11A)**: el wizard guarda `panitas:onboarding:intent` solo en `localStorage` y **ningún código lo lee** (`grep` confirma única lectura en el propio wizard). Los datos capturados (nombre del negocio, categoría, moneda) se descartan; la tienda se crea con `user.name`. → El cliente escribe datos que no se usan; debe volver a escribirlos en el SetupWizard del dashboard. **Observación UX/funcional, no blocker.**
- **Hallazgo menor**: banner de cookies (overlay `fixed z-100`) cubre el área de los botones del wizard en viewport móvil; un cliente debe aceptarlo para poder continuar. Funciona, pero interfiere el primer clic.

### 3.5 PLAN SELECTION — `applyPlanSelection` (PASS)

- Server action `applyPlanSelection("comercio")` (invocada por la UI en `/choose-plan`, botón "Ir al dashboard y pagar después").
- Resultado verificado en BD: creó `Negocio` (`planId=comercio`, `planEstado=pendiente`), `Store` (`plan=comercio`, `planStatus=pendiente`, `planType=tienda`), `StoreMember` (role `admin`), `Agenda` ("Mi Agenda").
- Redirección a `/dashboard?plan=comercio`.

### 3.6 BUSINESS CONFIGURATION — SetupWizard (PASS)

- `SetupWizard` del dashboard (4 pasos para plan comercio): Datos del negocio → Métodos de pago → Horarios → Dirección.
- Completado por UI real: nombre `PRUEBA-11A Tienda Demo`, descripción, enlace `prueba-11a-tienda-demo`, dirección. Paso 2 (pagos) saltado; pasos 3-4 continuados/finalizados. Toast "Configuración completada".
- Verificado en BD: `Store.name`, `Store.description`, `Store.slug`, `Store.address` actualizados (PUT `/api/stores`). `Negocio.slug` se sincroniza con el nuevo slug.

### 3.7 Hitos pendientes (FASES 11-18)

- **FIRST PRODUCT / CUSTOMER / SALE / REPORT / AI USAGE**: aún NO ejecutados en este tenant. Se ejecutarán en FASE 11-18 (CRUD de negocio) y FASE 28 (simulación completa) sobre este mismo tenant.

---

## 3b. FASE 8-20: CRUD real, aislamiento, financiero y AI (2026-08-15, mismo día)

### 3b.1 Roles y permisos (FASE 8) — PASS con hallazgo de arquitectura

- Invitación de miembro (POST `/api/stores/members`) como admin A → 200 con `inviteLink`.
- Aceptación (POST `/api/stores/join`) → 200; StoreMember creado con rol `seller` en tienda A.
- `requireRole(["admin"])` bloquea a un seller **solo si su contexto de tienda es la tienda correcta**.
- **HALLAZGO 11A-04 (OBSERVATION de arquitectura)**: `getCurrentStore` usa `findFirst({ userId })` sin tienda activa seleccionable (src/lib/permissions.ts:232). Un usuario miembro de 2+ tiendas recibe la tienda de su primer StoreMember — no hay selector de tienda en la UI. El caso A/B probado (B es admin de su tienda B y seller de la tienda A) NO expuso datos cruzados, pero el modelo "una tienda por sesión implícita" es frágil si un usuario con roles distintos en 2 tiendas opera la equivocada.

### 3b.2 Aislamiento multi-tenant (FASE 9-10) — PASS

- Productos `PROD-AISLA-ALFA` (tienda A) y `PROD-AISLA-BETA` (tienda B): cada tenant lista SOLO los suyos (`total: 2`, `A contiene BETA: false`; `B contiene ALFA: false`).
- Cross-store por ID: GET `/api/products/<id-otra-tienda>` → 403 `Unauthorized` en ambas direcciones.
- Data ownership en BD: los 4 productos tienen `storeId` correcto según tenant (2 y 2).
- `OrderService.create` valida `body.storeId !== ctx.storeId` → 403 (ordenes: se deriva siempre del contexto autenticado).

### 3b.3 CRUD negocio (FASE 11-16) — PASS

- **Venta POS** (POST `/api/orders`, `source: pos`, 2×10.5 + 1×10.5): 201, total 31.5, `paymentStatus: paid`, cliente auto-creado (findOrCreateByPhone). Stock descontado (50→49 y 50→48). `Customer.totalSpent=31.5`, `totalOrders=1`.
- **Venta a crédito** (3 cuotas quincenales, 5×10.5=52.5): 201, `paymentStatus: credit`, 3 instalments de 17.5. **Abono parcial 17.5** (POST `/api/creditos/:id/payments`): cuota 1 `paid`, `paid:17.5`, `pending:35`, `state: on_time`. Consistente en BD.
- **Orden online anónima** (POST `/api/checkout`): 201, total 21, `paymentStatus: pending`, cliente auto-creado. Stock 48→41 (con crédito).
- **Proveedor** (POST `/api/suppliers`): 201. **Compra** 150 (SupplierInvoice pending). **Pago al proveedor** 150 → `state: saldado`, `balance: 0`.
- **Gasto** (POST `/api/expenses`): 201, 80.
- **Ajuste stock** (POST `/api/products/stock`, `increase` +10): 201, `balance: 51`, StockMovement registrado.

### 3b.4 Chequeos financieros y reporting trust (FASE 17-18) — HALLAZGOS BLOCKER

- **Cierre diario** (GET `/api/reports/daily`): `totalRevenue: 17.5` cuando los ingresos **cobrados** reales son **49** (31.5 efectivo POS pagado + 17.5 abono crédito). La venta POS pagada queda **excluida**.
- **analytics/finanzas**: valorización de inventario correcta (totalSellValue 1050 = (49+51)×10.5); no es métrica de ventas.

### 3b.5 AI business trust (FASE 19-20) — HALLAZGOS BLOCKER

- Pregunta "¿Cuántas ventas tiene mi tienda hoy?": responde **Ingresos $31.50** y **Ticket promedio $0.00** con 3 pedidos — inconsistente con reporte (17.5) y con la realidad (49). El ticket promedio 0 es un cálculo roto (31.5/3=10.5).
- Pregunta "¿Cuántos productos tengo en inventario?": responde **"no hay productos registrados (0)"** cuando hay 2 productos con stock 49 y 51. Falso negativo de la tool de inventario del agente.
- Pregunta "¿Cuánto me deben mis clientes en créditos?": **CORRECTA** — $35 por cobrar, 1 crédito activo, $17.50 cobrado, 33% recuperación. **PASS.**

### 3b.6 FASE 21-28: AI action safety, security, mobile, data growth — PASS con hallazgos

- **AI action safety (21-22) PASS**: pedir "eliminar producto" → respuesta `confirmation_required` con descripción del impacto (no ejecuta). Pedir "crear producto" → ejecuta correctamente (PROD-AGENTE-TEST $15/stock 20/SKU PROD-7144) y **respeta aislamiento** (1 fila en tienda A, 0 en tienda B).
- **Security (23-25)**: cookies de sesión `__Secure-` httpOnly/sameSite lax/secure (auth.ts:15-31). CSRF validado: mutación sin Origin/Referer → 403 "CSRF: origen no válido".
- **Mobile (26-27)**: dashboard móvil funcional; tienda pública muestra placeholder "Esta tienda está en proceso de activación" (plan pendiente) — comportamiento correcto.
- **Data growth (28)**: 10 productos + 5 ventas + 1 venta UI-real. Inventario: 13 productos, `inventoryValue` correcto. Reporte diario con pagos `verified`: exacto (47.5 = 17.5 + 30).

### 3b.7 Re-clasificación de 11A-05/07/08 (validadas contra payload real de la UI)

El frontend POS real (src/app/dashboard/pos/page.tsx:354-362) envía `status: p.method === "credit" ? "pending" : "verified"`. Con ese payload, la orden queda `paid` con pago `verified`, y el reporte diario es **exacto** (verificado: 47.5).

- Mi primera simulación envió `payment: {method, amount}` **sin `status`**, lo que disparó la inconsistencia. El servidor la acepta (marca `paid` con pago `pending`). → **Debilidad de robustez del API, no bug del flujo UI principal.**

### 3b.8 FASE 37-40: Fix loop aplicado y verificado en producción

Deploy `dpl_B1B9DMyCrtK7JQWRNMLzirdApxMp` (target production). 1435 tests PASS + regresión en prod:

- **Fix 11A-08** (src/repositories/sales.repository.ts): `summary()` ahora usa el MISMO filtro (`status != cancelled`) para `revenue` y `totalOrders`. Antes `revenue` filtraba solo paid/verified y `totalOrders` contaba todas → `averageTicket` inconsistente (229/9=25.44) e ingresos excluían ventas a crédito. **Verificado**: agente reporta "$302.50 con 9 órdenes" (302.5 = suma exacta de todas las no canceladas) y "Ticket promedio $33.61" (= 302.5/9, exacto).
- **Fix 11A-09** (src/lib/agent-intel/task-planner.ts): para consultas de inventario sin entidad de producto específica (ej. "cuáles son mis productos"), usa `inventory.getProducts` (listado) en vez de `inventory.searchProduct` con el mensaje completo como término. **Verificado**: el agente lista los productos reales (antes respondía "0 productos").
- **Hardening 11A-05** (src/services/order.service.ts:550/:610/:617 + src/lib/agent/tools/sales.tools.ts): un pago sin `status: "verified"` explícito ya NO marca la orden `paid` ni el pago `verified`. **Verificado en prod + BD**: pago sin status → orden `pending`, pago `pending`, sin paidAt; pago con `status: verified` → orden `paid`, pago `verified`, con paidAt. La UI POS (siempre envía status) y el agente (normaliza status) no se ven afectados.

---

## 4. Resumen de estado del primer valor

| # | Hito | Estado | Evidencia |
|---|---|---|---|
| 1 | SIGNUP | ✅ PASS | `POST /api/auth/register` 200 |
| 2 | TENANT CREATION | ✅ PASS | Negocio+Store+StoreMember+Agenda en BD |
| 3 | USER CREATION | ✅ PASS | Login 200, sesión JWT |
| 4 | ONBOARDING | ⚠️ PASS con hallazgo | Wizard completo; intent descartado (localStorage nunca leído) |
| 5 | BUSINESS CONFIG | ✅ PASS | SetupWizard 4 pasos + BD actualizada |
| 6 | FIRST PRODUCT | ✅ PASS | 2 productos creados (ALFA/BETA en A) |
| 7 | FIRST CUSTOMER | ✅ PASS | Clientes auto-creados en ventas (2) |
| 8 | FIRST SALE | ✅ PASS | 3 órdenes (POS, crédito, online) |
| 9 | FIRST REPORT | ✅ PASS (UI real) | Cierre diario exacto con pagos verified (47.5) |
| 10 | AI USAGE | ⚠️ PASS con hallazgo | Créditos correctos; ingresos/ticket promedio con bug (11A-08) |

---

## 5. Hallazgos registrados (desde esta fase)

| ID | Severidad | Hallazgo | Estado |
|---|---|---|---|
| 11A-01 | OBSERVATION (UX/funcional) | Onboarding wizard: `panitas:onboarding:intent` se guarda y nunca se lee; datos capturados se descartan | Documentado |
| 11A-02 | OBSERVATION (UX) | Banner de cookies (z-100) intercepta primeros clics en wizard móvil | Documentado |
| 11A-03 | OBSERVATION (UX) | Checkbox de términos `base-ui` no alterna con click programático estándar (flujo UI de registro) | Documentado |
| 11A-04 | OBSERVATION (arquitectura) | `getCurrentStore` = `findFirst` sin contexto de tienda activo seleccionable (multi-tienda frágil) | Documentado |
| 11A-05 | **HIGH → RESUELTO (FASE 37)** | API de órdenes: pago sin `status` explícito en método no-credit → orden `paid` con pago `pending` (order.service.ts:550/:617). Hardening: sin `status: "verified"` explícito la orden y el pago quedan `pending`. Verificado en prod + BD. | Resuelto |
| 11A-06 | OBSERVATION | Checkout público acepta ordenes de tienda con `planStatus: pendiente` (sin validar plan); tienda pública solo muestra catálogo con plan activo/trial | Documentado |
| 11A-07 | **HIGH (P2)** | `reports/daily` suma solo payments `status=verified`; con el fix 11A-05 el pago sin status ya no marca `paid`, así que ya no puede haber orden `paid` con pago `pending` (consistencia total). Correcto con payload de la UI. | Mitigado por 11A-05 |
| 11A-08 | **HIGH → RESUELTO (FASE 37)** | Agente IA: ingresos/ticket promedio inconsistentes (revenue excluía crédito, count lo incluía). Fix en sales.repository.ts (mismo filtro). Verificado: $302.50/9 órdenes, ticket $33.61 exacto. | Resuelto |
| 11A-09 | **HIGH → RESUELTO (FASE 37)** | Agente IA: "no hay productos registrados (0)" con productos con stock. Fix en task-planner.ts (usa getProducts para consultas generales). Verificado: el agente lista los productos. | Resuelto |
| 11A-10 | MEDIUM (security) | Google provider: `allowDangerousEmailAccountLinking: true` (auth.ts:37) — vincula cuenta existente por email sin verificación adicional | Documentado |
| 11A-11 | OBSERVATION | `signIn` Google crea User con `emailVerified: now()` automáticamente (correcto: Google verifica) | Documentado |
| 11A-12 | OBSERVATION (security) | csrf.ts:40-45 permite que header `Host` iguale al origin (mitigado en Vercel; DNS rebinding) | Documentado |
| 11A-13 | **HIGH** | Un cliente real no tiene canal de soporte funcional: `SupportTicket` solo tiene API admin, sin ruta cliente, sin página de ayuda/FAQ | Documentado (ver CUSTOMER_SUPPORT_DIAGNOSTICS.md) |
| 11A-14 | OBSERVATION | Diagnóstico del operador es manual (BD + logs Vercel); sin health-check interno ni auditoría de acciones en la app | Documentado |
| 11A-15 | **HIGH** | Sin offboarding self-service del cliente: no puede cancelar plan ni borrar/exportar sus datos (solo admin). Riesgo GDPR/fricción real | Documentado (ver OFFBOARDING_BILLING_AUDIT.md) |
| 11A-16 | OBSERVACIÓN (bloqueante de escala) | Billing 100% manual (comprobante + activación admin), sin pasarela ni renovación automática (backlog #8) | Documentado |
| 10C-13 | P3 OPEN | GA4/GTM beacons bloqueados por CSP (`connect-src` sin google-analytics.com/google.com) — reproducido en cada página del flujo (register, onboarding, choose-plan, dashboard) | Confirmado |
