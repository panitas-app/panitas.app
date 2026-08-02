# FASE 2B — Auditoría del sistema de suscripciones y planes

> Estado: **Completada** — FASE 2B · Repositorio: `panitas.app` · Rama: `develop-v2`
> Fecha: 02/08/2026

Esta auditoría documenta cómo funciona hoy el sistema de planes, suscripciones y permisos en Panitas, qué se puede reutilizar para la nueva arquitectura de features y qué debe evolucionar.

---

## 1. Objetivo

Antes de construir la capa central `src/lib/features/` (catálogo BUSINESS / BUSINESS_PLUS + `hasFeature`), necesitábamos saber:

1. Dónde vive el plan de un negocio hoy (schema y en runtime).
2. Qué modelos ya existen y cuáles son conceptuales vs. formales.
3. Cómo se protegen los módulos hoy (rutas, layouts, validaciones, API).
4. Qué se puede reutilizar y qué hay que cambiar (sin romper suscripciones actuales).

---

## 2. Hallazgo principal

**No existe un único "plan" en runtime.** El plan de un negocio está repartido en **cuatro representaciones distintas** que deben mantenerse sincronizadas:

| Representación | Dónde | Campo clave | Uso actual |
|---|---|---|---|
| Plan formal | `prisma/schema.prisma` — `Plan` (L52–67) | `id` / `nombre` (`basico`, `negocio`, `empresarial`) | Catálogo + pricing + `ensurePlanExists` |
| Negocio canónico | `Negocio` (L82–124) | `planId` FK → `Plan` | Fuente de verdad del plan del negocio |
| Store runtime | `Store` | `plan` (`free`) + `planType` (`tienda`, `agenda`, `empresa`) | La **mayoría** del código lee esto |
| Feature flags 2A | `src/lib/feature-flags.ts` | `PanitasPlan` (`negocios` / `negocios_plus`) | UI (badges, gating de conversaciones) |

**Problema:** el gating real de módulos hoy se hace con **dos catálogos independientes**:

- `PLAN_DEFINITIONS` en `src/lib/plans.ts` — catálogo **legacy** (agenda / comercio / mayorista / basico / negocio / empresarial) con `modules` y `requireAccesoModulo`.
- `PLAN_LIMITS` en `src/lib/constants.ts` — límites legacy (free/basic) para productos.

Esto no escala a "un negocio tiene un plan y puede usar estas features": faltaba una **capa única de features por plan**.

---

## 3. Modelos Prisma (existentes, NO se migran en esta fase)

### `Plan` — prisma/schema.prisma L52–67
```prisma
model Plan {
  id          String   @id @default(cuid())
  nombre      String   @unique   // "basico", "negocio", "empresarial"
  label       String              // "Básico", "Negocio", "Empresarial"
  descripcion String?
  precioUsd   Float
  precioUsdAnual Float?
  activo      Boolean  @default(true)
  sortOrder   Int      @default(0)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  negocios    Negocio[]
  features    PlanFeature[]
}
```

### `PlanFeature` — L69–80
```prisma
model PlanFeature {
  key       String   // "productos_ilimitados", "crm", "automations", "dominio_propio"
  label     String
  tipo      String   @default("boolean") // boolean, numero, texto
  valor     String?  // valor default serializado
  planId    String
  plan      Plan     @relation(...)
  @@unique([planId, key])
}
```
**Conclusión:** el modelo conceptual (Plan → Features → Feature con tipo/valor) ya existe de forma **formal** en el schema. La fase 2B **no toca schema**: la capa de código se construye sobre estos conceptos y `PlanFeature` queda disponible para materializar features en BD en una fase futura.

### `Negocio` — L82–124 (modelo canónico del plan)
```prisma
model Negocio {
  id        String   @id @default(cuid())
  nombre    String
  slug      String   @unique
  isActive  Boolean  @default(true)
  // Plan
  planId    String
  plan      Plan     @relation(fields: [planId], references: [id])
  modalidad String?  // "tienda" | "agenda" | null
  planEstado  String  @default("activo") // activo, suspendido, cancelado, trial
  planInicio  DateTime @default(now())
  planVencimiento DateTime?
  planRenovacionAutomatica Boolean @default(false)
  userId    String   @unique
  user      User     @relation(...)
  store     Store?
  agendas   Agenda[]
  ...
  @@index([planEstado])
  @@index([planVencimiento])
}
```
**Nota:** `userId` es `@unique` → **1 negocio por usuario** hoy. `planEstado`/`planVencimiento` son la base para suspensiones y vencimientos.

### `Store` y `StoreSubscription` (leídos en la auditoría)
- `Store`: `plan` (string, `"free"`), `planType` (`agenda`/`tienda`/`empresa`), `planStatus`, `negocioId`.
- `StoreSubscription`: estado (`active`, etc.), `paymentMode` (`single`/`installment`), `period` (`monthly`/`yearly`), `planType`, `verifierId` (admin), relaciones a `User` (`user` y `verifiedBy`).

---

## 4. Cómo se crea hoy una suscripción

Flujo actual (pago manual, sin pasarela):

1. `/pricing` (Next) → CTA según sesión:
   - Con sesión → `/subscribe?plan=X&period=Y&paymentMode=Z`
   - Sin sesión → `/register?plan=X&paymentMode=Z`
2. `/choose-plan` → selección → `applyPlanSelection(planParam)` (server action).
3. `applyPlanSelection` (`src/lib/actions/plan-selection.ts`):
   - `resolvePlanId(planParam)` de `@/lib/plans`.
   - `ensurePlanExists(id)` crea el `Plan` en BD si no existe (P2002 ignorado).
   - Crea **`Negocio` + `Store` + `StoreMember(admin)`** (y `Agenda` si `hasAgenda`) para el usuario.
   - Si ya existe `Store`, actualiza `planType` y sincroniza `Negocio.planId`.
4. `/subscribe` → el usuario sube comprobante → **admin verifica** y activa la suscripción (`StoreSubscription`).

**Clave para 2B:** `applyPlanSelection` ya crea la **dupla `Negocio.planId` + `Store.planType`**. La capa de features debe resolver el plan leyendo ambos (`Store.plan/planType` + `Negocio.planId` vía `plan-validation.getNegocioActivo()`), igual que hace `src/lib/permissions.getCurrentStore()`.

---

## 5. Protección de módulos hoy

- **No existe `middleware.ts`** en el proyecto (verificado por glob + grep). No hay gating de planes a nivel de edge middleware.
- El gating se hace **dentro de layouts y páginas**:
  - `src/lib/plans.ts` → `hasModule(planId, module)` + `requireAccesoModulo(store.planType, ...)` (retorna `{ allowed, error }`).
  - `src/lib/plan-validation.ts` → `getNegocioActivo()` (valida `planEstado`/`planVencimiento`, lanza si suspendido/cancelado/vencido) + `requireAccesoModulo` re-exportado.
  - FASE 2A: `src/app/dashboard/conversaciones/page.tsx` usa `isPlusPlan(current.store.plan || planType)` para decidir entre contenido y `FeatureLockCard`.
- Validación de límites: `PLAN_LIMITS` en `src/lib/constants.ts` se verifica en creación de productos (API).

---

## 6. Problemas detectados

1. **Plan disperso en 4 representaciones** — riesgo de desincronización (`Store.planType` vs `Negocio.planId`).
2. **Dos catálogos legacy independientes** (`plans.ts` y `constants.ts`) — los módulos se validan contra `PLAN_DEFINITIONS.modules`, no contra features nombradas.
3. **Naming legacy confuso** — `Store.planType` vale `"tienda"` mientras el plan es `"comercio"` (Emprendedor); `applyPlanSelection` mapea `comercio → planType "tienda"`, `mayorista → planType "empresa"`. Difícil de leer y de extender.
4. **Sin capa de features central** — cada llamada hace `switch`/`if` sobre strings de plan en el punto de uso.
5. **`feature-flags.ts` (2A) no conoce el negocio** — toma un string (`planIdOrType`) y decide; el string lo pasa cada página. Necesita delegar en la capa que resuelve el plan real.
6. **Sin límites en la capa de planes nuevos** — los límites (productos, usuarios, sucursales, IA) deben quedar declarados por plan para fases futuras sin tocar código de negocio.

---

## 7. Qué se reutiliza (sin cambios)

- `src/lib/permissions.getCurrentStore()` → resuelve `{ store, role, memberId, userId }`.
- `src/lib/plan-validation.getNegocioActivo()` → estado/vencimiento + `planId`.
- `src/lib/plans.ts` (`PLAN_DEFINITIONS`, `resolvePlanId`, `getInstallmentAmount`, ...) → **se mantiene intacto** para el flujo de pago legacy.
- `src/lib/actions/plan-selection.ts` → **se mantiene intacto**.
- Páginas `/pricing`, `/choose-plan`, `/subscribe` → **se mantienen intactas** (no pagos, no romper flujo actual).
- `src/lib/feature-flags.ts` → se **evoluciona** (delega en la capa nueva, mantiene su API pública).

## 8. Qué se crea / cambia en 2B

| Archivo | Acción |
|---|---|
| `src/lib/features/types.ts` | Nuevo — tipos `PlanSlug`, `FeatureKey`, `PlanDefinition`, `PlanLimits`, `FeatureAccess` |
| `src/lib/features/catalog.ts` | Nuevo — catálogo BUSINESS/BUSINESS_PLUS, features y límites |
| `src/lib/features/resolve.ts` | Nuevo — normalización de `planId/planType` → `PlanSlug` (mapeo legacy) |
| `src/lib/features/index.ts` | Nuevo — API pública `hasFeature`, `tryHasFeature`, `requireFeature`, `getPlan`, `getPlanLimits`, ... |
| `src/lib/feature-flags.ts` | Evolucionar — delegar en la capa nueva manteniendo API 2A |
| `src/components/ui/feature-lock-card.tsx` | Actualizar al catálogo nuevo |
| `src/components/ui/feature-lock-screen.tsx` | Nuevo — pantalla premium para rutas protegidas |
| `src/app/dashboard/conversaciones/page.tsx` | Proteger con la capa nueva |
| `src/app/planes/page.tsx` | Nuevo — página pública de planes |
| `tests/features/*.test.ts` | Nuevos tests de la capa |
| `docs/PANITAS_PLANS_ARCHITECTURE.md` | Nuevo — arquitectura de planes/features/permisos |
| `docs/FEATURE_PERMISSION_SYSTEM.md` | Nuevo — cadena Usuario → Negocio → Suscripción → Plan → Features |
| `docs/PHASE_2B_REPORT.md` | Nuevo — reporte de cierre |

---

## 9. Mapeo legacy → planes nuevos (para `resolve.ts`)

| `PlanSlug` nuevo | IDs legacy a normalizar | `Store.planType` equivalentes |
|---|---|---|
| `business` | `basico`, `negocio`, `comercio`, `tienda`, `emprendedor`, `free` | `tienda`, `agenda` |
| `business_plus` | `empresarial`, `mayorista`, `empresa`, `advanced`, `plus` | `empresa` |

Regla de seguridad: **cualquier plan desconocido cae a `business`** (nunca deniega más de lo debido a los planes nuevos; denegar Plus por defecto es el comportamiento conservador correcto).

---

## 10. Recomendaciones para la fase

1. Construir la capa como **librería pura** (sin Prisma ni Next) para tests unitarios rápidos; el resolver de plan sí toca `permissions`/`plan-validation`.
2. No tocar `Plan`/`PlanFeature` en BD en 2B — el catálogo técnico vive en `catalog.ts`; materializarlo en `PlanFeature` se hará en la fase de cobro (2C+/3A).
3. Los límites se declaran pero **no se aplican** todavía.
4. Mantener `feature-flags.ts` como adaptador fino sobre la capa para no romper los usos de 2A (sidebar, badge, onboarding).
