# SECURITY AUDIT REPORT — FASE 3E

**Rama:** `develop-v2` · **Fecha:** 02/08/2026

Objetivo: revisar el aislamiento multi-tenant (cada negocio solo accede a sus datos) y los
vectores de acceso entre tiendas en la capa de servicios/repositorios/API.

---

## 1. Resumen

| Nivel | Estado |
|---|---|
| Aislamiento en repositorios nuevos (memory/conversation) | ✅ Correcto (`storeId`/`userId` en el `where`) |
| Aislamiento en rutas `/api/agent/*` | ✅ Correcto (`requireRole` deriva store de la sesión) |
| Aislamiento en `/api/orders/*`, `/api/scanner/*`, checkout | ✅ Correcto (validación tras fetch) |
| `OrderService.create` | 🔴 **Corregido en 3E** (antes aceptaba `body.storeId` ajeno) |
| `ProductRepository.findByIds` | 🔴 **Corregido en 3E** (ahora scoped por `storeId`) |
| Repositorios con `findById`/`update`/`delete` sin `storeId` | 🟡 Riesgo latente documentado (mitigado en capa de servicios) |

---

## 2. Vector corregido (severidad alta)

### 2.1 `OrderService.create` aceptaba `body.storeId` ajeno

**Antes** (`src/services/order.service.ts`):
```ts
let storeId = body.storeId
if (!storeId) {
  storeId = ctx.storeId
} else {
  const storeExists = await this.repo.findStoreById(storeId) // solo existencia
  if (!storeExists) throw serviceError("Tienda no encontrada", 404)
}
```
Un usuario autenticado podía crear una orden atribuida a **cualquier tienda existente**
(validando solo que existiera, no que fuera suya).

**Ahora**:
```ts
const storeId = ctx.storeId
if (body.storeId && body.storeId !== ctx.storeId) {
  throw serviceError("No autorizado", 403)
}
```
La tienda siempre se deriva del contexto autenticado. Un `storeId` distinto → 403.
El POS sigue funcionando (envía su propio `storeId`, que coincide con `ctx.storeId`).

### 2.2 `ProductRepository.findByIds` sin scope

**Antes**: `findByIds(ids)` traía productos de cualquier tienda.
**Ahora**: `findByIds(ids, storeId?)` filtra por `storeId`. `OrderService.create` pasa
`storeId`, impidiendo referenciar productos de otro negocio.

Test actualizado: `tests/services/order.service.test.ts` — "rejects a storeId that differs
from the authenticated context with 403" (antes esperaba 404).

---

## 3. Riesgos latentes documentados (defensa en profundidad)

Los repositorios exponen métodos por ID sin frontera de `storeId`. Hoy la capa de servicios
valida `storeId` tras el fetch (`product.service`, `order.service`, `agenda.service`,
`customer.service`), pero la seguridad depende de que **todo** caller pase por los servicios
(y no use repositorios directamente). Recomendación futura: añadir `storeId` como parámetro
obligatorio a estos métodos o usar overrides tipo `findById(id, storeId)`.

| Repositorio | Métodos afectados |
|---|---|
| `product.repository.ts` | `findById`, `findByIdWithCategory`, `update`, `delete`, `decrementStock`, `incrementStock`, `setStock`, `deleteDigitalProduct`, `upsertDigitalProduct` |
| `order.repository.ts` | `findById`, `findByNumber`, `update`, `updateStatus`, `markClientNotified`, `delete`, `findCouponById`, `findSellerById`, `updateCouponUsedCount`, `decrementStock`, `incrementStock` |
| `customer.repository.ts` | `findById`, `update`, `updateTotals`, `updateLastPurchase` |
| `payment.repository.ts` | `findAccountById`, `updateAccount`, `deleteAccount`, `findByOrderId` |
| `agenda.repository.ts` | `findById` (el servicio valida `negocioId`) |

**Estado:** no explotable hoy vía API ni vía tools (los tools pasan por services), pero es
defensa en profundidad pendiente para fases futuras.

---

## 4. Verificado como correcto

- `MemoryRepository`: toda query con `storeId` + `OR [scope=store | user+userId]` (`memory.repository.ts:50`).
- `ConversationRepository`: `findById`/`update`/`delete`/`listMessages` con `userId+storeId` en el `where`.
- `/api/agent/chat|memory|profile`: `requireRole` → storeId desde la sesión; memoria scoped por BD.
- `/api/orders/[id]`, `/api/orders/[id]/verify-payment`, `/api/orders/[id]/status`: validan `order.storeId === current.store.id`.
- `/api/scanner/session/[id]/events`: valida `session.storeId === current.store.id`.
- `checkout/route.ts`: `product.findMany({ where: { id: { in }, storeId } })` y coupon `storeId` validado.
- `OrderService.getById/updateStatus`, `ProductService.getById/update/remove`, `AgendaService.cancel`:
  verifican pertenencia tras el fetch.

---

## 5. Gate de planes en APIs

- `/api/agent/chat` **no validaba plan** (la UI sí bloqueaba `unified_chat`). Corregido:
  ahora valida `basic_ai` (feature base, incluida en Panitas Negocios y Plus) → 403 si el
  plan no la incluye.
- Features huérfanas declaradas sin implementación: `whatsapp_inbox`, `instagram_inbox`,
  `facebook_inbox` (solo catálogo; sin rutas ni UI).
- Features base (`inventory`, `pos`, `crm`, `reports`) declaradas en catálogo pero sin gate
  en sus rutas → pendiente documentar en `PHASE_3E_STABILIZATION_REPORT.md`.

---

## 6. Recomendaciones pendientes (fuera de alcance 3E)

1. Convertir repositorios por-ID a frontera `storeId` obligatoria.
2. Gate de plan en rutas base (inventory/pos/crm/reports) cuando la lógica de negocio lo requiera.
3. RLS (Row Level Security) en Postgres como segunda capa (existe `rls-policies.sql` sin aplicar).
4. CSRF: verificar cobertura en todas las mutaciones (existe `csrfGuard`; no auditado 100% en 3E).
