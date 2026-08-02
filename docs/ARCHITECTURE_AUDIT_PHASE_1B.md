# FASE 1B — Auditoría de Arquitectura

> Fecha: 02/08/2026 · Rama: `develop-v2` · Tipo: audit + preparación para agente IA (sin IA todavía)

---

## 1. Estado detectado (línea base)

### 1.1 Route handlers "gordos" (fat route handlers)

- **161 route handlers** en `src/app/api/**/route.ts` (≈138 archivos).
- **~607 llamadas directas a `prisma.*`** repartidas en esos handlers.
- Patrón típico de cada handler:
  1. `getCurrentStore()` / `getCurrentNegocio()` → `401` si no hay sesión.
  2. `csrfGuard(request)` en mutaciones.
  3. `safeStr/safeFloat/safeInt/safeBool/safeImages/safeStringArray` de `lib/validate.ts`.
  4. Lógica de negocio inline (precios, cupones, stock, comisiones).
  5. Side effects inline (emails, auditoría, notificaciones).
  6. `paginatedResponse(...)` de `lib/pagination.ts`.
- **Consecuencia**: los handlers mezclan transporte HTTP, validación, reglas de negocio y persistencia. No son reutilizables por cron, agente IA ni otros módulos.

### 1.2 Datos y tenant

- **71 modelos Prisma** (~1587 líneas en `prisma/schema.prisma`).
- **Tenant dual**:
  - `Store` (comercio clásico, `storeId` como scope) → relación `Store.negocioId → Negocio`.
  - `Negocio` (plan negocio/agenda, `negocioId` como scope).
  - Productos/Órdenes/Clientes se filtran por `storeId`; Citas por `negocioId`.
- **Neon HTTP (serverless) no soporta transacciones implícitas** (interactive transactions). Los handlers lo documentan con comentarios `NOTE: ... Neon HTTP doesn't support transactions` y hacen operaciones **secuenciales** (ej. `update` + `findUnique` por separado).

### 1.3 Autenticación y permisos

- `lib/permissions.ts`: `getCurrentStore()`, `getCurrentNegocio()`, `requireRole(["admin","manager","seller"])`, `requireNegocio()`.
- `requireRole` lanza `Error("No tienes...")` → los handlers lo convierten en `403`.
- `current.store.plan` alimenta `resolvePlanLimitKey` + `PLAN_LIMITS` (límite de productos por plan).

### 1.4 Testing y CI

- `tests/smoke.spec.ts` existe, pero **`@playwright/test` NO está instalado**, no hay `playwright.config.ts`, ni script `test` en `package.json`.
- `tsconfig.json` excluye `tests/`.
- CI: `.github/workflows/verify.yml` = `lint` + `typecheck` + `build` (PRs a `main`/`develop-v2` y push a `develop-v2`).
- Alias `@/*` → `./src/*`.

---

## 2. Duplicación y deuda detectada

| Problema | Cantidad | Dónde |
|---|---|---|
| Creación de órdenes duplicada | ×3 | `orders`, `checkout`, `seller` |
| Validación de cupón duplicada | ×3 | idem |
| Find-or-create de cliente duplicado | ×3 | idem |
| Decremento de stock + movimiento duplicado | ×3 | idem |
| Chequeo de ownership (`storeId !== current.store.id`) | ×21 | varios handlers |
| `generateSku()` duplicado | ×2 | `products/route.ts`, `products/[id]/route.ts` |
| Lógica de precios (mayorista, descuento POS) inline | ×3 | órdenes |

---

## 3. Plan de migración (priorizado)

| Prioridad | Dominio | Rutas | Estado FASE 1B |
|---|---|---|---|
| 1 | Inventario | `products`, `products/[id]`, `products/stock` | ✅ Migrado |
| 2 | Ventas/POS | `orders` (parcial: creación) | ✅ Migrado |
| 3 | Clientes | `customers` | ✅ Migrado |
| 4 | Agenda | `appointments` | ✅ Migrado |
| 5 | Pedidos | resto de `orders/*`, `checkout`, `seller` | ⏳ Pendiente |

> Regla: migración quirúrgica preservando **exactamente** códigos de estado, mensajes y validaciones. Los handlers restantes no se tocan en esta fase.

---

## 4. Capas creadas (FASE 1B)

### 4.1 Repositorios (`src/repositories/`) — solo Prisma

| Archivo | Modelos |
|---|---|
| `product.repository.ts` | `Product`, `DigitalProduct` |
| `customer.repository.ts` | `Customer` |
| `inventory.repository.ts` | `StockMovement`, `Product` (stock) |
| `agenda.repository.ts` | `Appointment`, `Agenda`, `Store`, `Negocio`, `User` |
| `order.repository.ts` | `Order`, `OrderItem`, `OrderPayment`, `Installment`, `SellerCommission`, `Coupon`, `BcvRate`, `Seller`, `Store` |
| `sales.repository.ts` | `Order` (agregaciones) |
| `payment.repository.ts` | `PaymentAccount`, `OrderPayment` |

### 4.2 Servicios (`src/services/`) — lógica de negocio + eventos + auditoría

| Archivo | Métodos clave |
|---|---|
| `product.service.ts` | `list`, `getById`, `create`, `update`, `remove` |
| `inventory.service.ts` | `list`, `applyMovement` (increase/decrease/adjustment) |
| `customer.service.ts` | `list`, `findOrCreateByPhone`, `updateTotals` |
| `agenda.service.ts` | `list`, `create` (reserva autenticada y pública por `storeSlug`, emails) |
| `order.service.ts` | `list`, `create` (precios desde BD, cupón, cuotas, stock, comisiones, emails) |
| `errors.ts` | `ServiceError` (message, status, code, details), `isServiceError`, `serviceError` |
| `context.ts` | `ServiceContext`, `StoreServiceContext`, `NegocioServiceContext` |
| `http.ts` | `toServiceResponse`, `createdResponse`, `jsonSuccess` |

### 4.3 Eventos (`src/events/`)

- `event.service.ts`: bus tipado (`AppEvents`), suscripción `on`, emisión `emit`/`emitAsync`.
- Eventos definidos: `sale.created`, `product.low_stock`, `appointment.created`, `customer.created`.
- Emitidos hoy desde: `order.service` (sale.created, product.low_stock), `customer.service` (customer.created), `agenda.service` (appointment.created).

### 4.4 Esqueleto del agente (`src/lib/agent/`) — sin IA

| Archivo | Responsabilidad |
|---|---|
| `types.ts` | `AgentContext`, `AgentTool`, `AgentToolInput`, `AgentToolResult` |
| `permissions.ts` | permisos granulares `inventory.read/write`, `sales.read/create`, `customers.read`, `agenda.read/create` por rol |
| `context.ts` | `buildAgentContext()` desde la sesión (store + negocio + permisos) |
| `memory.ts` | `AgentMemory` con TTL (en memoria) |
| `registry.ts` | registro de tools + `executeTool` con chequeo de permisos |
| `router.ts` | `routeAgentIntent()` mapea intención en lenguaje natural → tool |
| `setup.ts` | registra las tools de ejemplo |
| `tools/inventory.tools.ts` | `inventory.get_stock`, `inventory.adjust_stock` |
| `tools/sales.tools.ts` | `sales.summary`, `sales.create_order` |
| `tools/customer.tools.ts` | `customers.list` |
| `tools/agenda.tools.ts` | `agenda.create`, `agenda.list` |

---

## 5. Decisiones tomadas

1. **Migración quirúrgica** de 6 rutas críticas; el resto queda con Prisma directo (fases siguientes).
2. **Los servicios reutilizan la validación existente** (`lib/validate.ts`), no la reimplementan.
3. **Mensajes de error y códigos de estado idénticos** a los originales (verificado campo a campo).
4. **Auditoría se mantiene en la capa de servicio** (mismas acciones `product.created`, `stock.low`, `order.created`, etc.).
5. **Eventos son aditivos**: no cambian el comportamiento de las rutas; son observables nuevos para el futuro agente.
6. **No se introdujo IA**: el esqueleto del agente es infraestructura (tools, permisos, routing) sobre los servicios.

---

## 6. Verificación

- `npm run typecheck` → ✅ sin errores.
- `npm run lint` y `npm run build` → ejecutados en la verificación final de la fase (ver `PHASE_1B_REPORT.md`).
