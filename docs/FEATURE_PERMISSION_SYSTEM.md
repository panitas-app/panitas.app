# Sistema de permisos por plan — Cadena Usuario → Negocio → Suscripción → Plan → Features

> FASE 2B · Rama: `develop-v2` · Última actualización: 02/08/2026

Este documento describe la cadena completa que determina **qué puede hacer un usuario en Panitas**, desde su sesión hasta una feature concreta, y cómo se protege cada capa.

---

## 1. La cadena de permisos

```
Usuario (auth)
   └─► Negocio        (1:1 con Usuario hoy; userId @unique)     — planId, planEstado, planVencimiento
          └─► Plan    (Plan en BD)                               — catálogo formal legacy (basico/negocio/empresarial)
          └─► Store   (Store en BD)                              — plan="free", planType="tienda|agenda|empresa"
                 └─► StoreSubscription (facturación)             — estado, paymentMode, period
                        └─► PlanSlug canónico (business | business_plus)   — src/lib/features/resolve.ts
                               └─► Features (FeatureKey[])       — src/lib/features/catalog.ts
                                      └─► Acceso (hasFeature/requireFeature)
```

**En runtime hay dos "planes" que se resuelven a uno:**

1. **Plano de facturación** (`StoreSubscription` + `Negocio.planId`) — quién pagó qué y hasta cuándo.
2. **Plano de features** (`PlanSlug` → `FeatureKey[]`) — qué funciones puede usar.

La capa de features unifica ambos: dado el `Store` (o el `Negocio`), resuelve el `PlanSlug` y consulta las features. Ver auditoría en `docs/PHASE_2B_SUBSCRIPTION_AUDIT.md`.

---

## 2. Cómo se protege el acceso (3 niveles)

### Nivel 1 — Sesión y pertenencia
- `auth()` (next-auth) — quién es el usuario.
- `getCurrentStore()` (`src/lib/permissions.ts`) → `{ store, role, memberId, userId }` — a qué tienda pertenece y con qué rol.

### Nivel 2 — Estado del plan (suscripción)
- `getNegocioActivo()` (`src/lib/plan-validation.ts`) — lanza si el negocio está suspendido, cancelado o vencido.
- Administrado por cron/`api/cron/expire-plans` y acciones admin (`/api/admin/users/[id]/suspend|reactivate|renew`).

### Nivel 3 — Features del plan (2B)
- `hasFeature(ref, feature)` / `requireFeature(ref, feature)` (`src/lib/features/`).
- La UI muestra `FeatureLockScreen` / `FeatureLockCard` cuando no hay acceso.

---

## 3. Ejemplo: un vendedor en un negocio "comercio" entra a Conversaciones

1. `auth()` → sesión válida.
2. `getCurrentStore()` → `{ store: { plan: "free", planType: "tienda" }, role: "seller" }`.
3. `getNegocioActivo()` → el negocio existe y está activo.
4. `hasFeature({ plan: "free", planType: "tienda" }, "unified_chat")`:
   - `toPlanSlug` → `normalizePlanSlug("tienda")` → `business`.
   - `PLAN_FEATURES.business` no incluye `unified_chat` → `false`.
5. La página (`/dashboard/conversaciones`) muestra `FeatureLockScreen feature="unified_chat"` con CTA a `/planes`.

Si el negocio es "mayorista" (`planType="empresa"`): paso 4 → `business_plus` → `true` → se muestra el contenido.

---

## 4. Permisos complementarios

| Sistema | Archivo | Controla |
|---|---|---|
| Roles por miembro | `src/lib/roles` | Qué puede hacer cada rol (admin/manager/seller/viewer) dentro de su tienda. |
| Permisos del agente IA | `src/lib/agent/permissions` | Qué herramientas puede usar la IA según rol. |
| Módulos legacy | `src/lib/plans.ts` (`hasModule`/`requireAccesoModulo`) | Gating legacy por `Store.planType` (se mantiene; no usarlo para features nuevas). |
| Features por plan | `src/lib/features/` | **Único camino para features nuevas.** |

Los límites de plan (`PLAN_LIMITS`) están declarados pero no se aplican en 2B (ver `docs/PANITAS_PLANS_ARCHITECTURE.md` §8).

---

## 5. Reglas de oro

1. **Nunca** validar planes con `if (plan === "PLUS")` en componentes/páginas. Usar `hasFeature`/`requireFeature`.
2. Pasar siempre la **referencia completa** del plan (`{ plan, planType }` o el `store`) en vez de un string suelto cuando esté disponible.
3. Las guardas de rutas deben usar `requireFeature` (no lanza) y delegar el CTA a `FeatureLockScreen`.
4. Al añadir una feature de pago, definirla **solo** en el catálogo y protegerla; no crear códigos nuevos que consulten el plan por su cuenta.
5. Un plan desconocido nunca debe recibir menos de lo que le corresponde por defecto → `normalizePlanSlug` cae a `business`.
