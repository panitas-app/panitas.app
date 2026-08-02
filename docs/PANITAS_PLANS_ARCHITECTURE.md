# Arquitectura de planes, features y permisos — Panitas Negocios 2.0

> FASE 2B · Rama: `develop-v2` · Última actualización: 02/08/2026

Este documento es la referencia técnica de la capa de planes y features: qué planes existen, qué features incluyen, cómo se consulta el acceso y cómo añadir planes/features nuevos.

---

## 1. Resumen

La plataforma tiene **dos planes canónicos**:

| Plan | Slug | Features |
|---|---|---|
| Panitas Negocios | `business` | Inventario, POS, CRM, Tienda online, Reportes, Asistente IA (consultivo) |
| Panitas Negocios Plus | `business_plus` | Todo lo anterior + Centro de chats, WhatsApp, Instagram, Facebook, Sugerencias de respuesta IA, Análisis de clientes IA, Recomendaciones comerciales IA |

Toda consulta de acceso pasa por la **capa central** `src/lib/features/`. Ningún componente valida planes directamente con `if (plan === ...)`.

---

## 2. Cómo se consulta el acceso (regla de oro)

```ts
import { hasFeature, requireFeature } from "@/lib/features"

// En una página/layout (server):
const current = await getCurrentStore()
const canChat = hasFeature({ plan: current.store.plan, planType: current.store.planType }, "unified_chat")

// Guarda que devuelve { allowed, error } sin lanzar:
const guard = requireFeature({ planType: current.store.planType }, "unified_chat")
if (!guard.allowed) return <FeatureLockScreen feature="unified_chat" />
```

### API pública (`src/lib/features/index.ts`)

| Función | Descripción |
|---|---|
| `hasFeature(ref, feature)` | `boolean`. Lanza si la feature no existe en el catálogo. |
| `tryHasFeature(ref, feature)` | `FeatureAccess` (`{ allowed, plan, feature, reason, requiredPlan }`). No lanza. |
| `requireFeature(ref, feature)` | `{ allowed, error?, requiredPlan? }`. Para guardas de rutas/servidor. |
| `getPlan(ref)` / `getPlanSlug(ref)` | Definición / slug del plan de la referencia. |
| `getPlanFeatures(ref)` | Lista de `FeatureKey` del plan. |
| `getPlanLimits(ref)` | Límites declarados del plan (no aplicados en 2B). |
| `isBusiness(ref)` / `isBusinessPlus(ref)` | Comodines booleanos. |
| `featureLabel(feature)` / `featureDescription(feature)` | Textos para UI. |
| `getActivePlans()` | Planes activos ordenados (página `/planes`). |

### `PlanRef`

Cualquiera de estos valores es válido como `ref`:

```ts
type PlanRef = string | PlanContext | Record<string, unknown> | null | undefined

interface PlanContext {
  plan?: string | null      // Store.plan   (p. ej. "free")
  planType?: string | null  // Store.planType (p. ej. "tienda", "empresa")
  planId?: string | null    // Negocio.planId / nombre del plan
  planSlug?: PlanSlug | null // slug ya resuelto
}
```

La normalización de legacy → slug está en `src/lib/features/resolve.ts` (`normalizePlanSlug`).

---

## 3. Catálogo

### `src/lib/features/catalog.ts`

- `FEATURES: Record<FeatureKey, FeatureDefinition>` — metadatos (nombre, descripción, grupo).
- `BASE_FEATURES` / `PLUS_FEATURES` — arrays de `FeatureKey`.
- `PLAN_FEATURES: Record<PlanSlug, FeatureKey[]>` — features por plan.
- `PLAN_LIMITS: Record<PlanSlug, PlanLimits>` — límites por plan.
- `FEATURE_ALIASES` — alias compatibles con FASE 2A (`store` → `online_store`, `conversations` → `unified_chat`, `ai_sales` → `sales_opportunities`).

### Grupos de features

| Grupo | Features |
|---|---|
| `core` | `inventory`, `pos`, `crm`, `online_store`, `reports` |
| `ai` | `basic_ai`, `ai_reply_suggestions`, `customer_analysis`, `sales_opportunities` |
| `communication` | `unified_chat`, `whatsapp_inbox`, `instagram_inbox`, `facebook_inbox` |

---

## 4. Cómo añadir una feature nueva

1. Añadir la key a `FeatureKey` en `src/lib/features/types.ts`.
2. Añadir la entrada en `FEATURES` (`catalog.ts`) con `key`, `name`, `description`, `group`.
3. Incluirla en `PLAN_FEATURES` para los planes que la tengan (añadir al array de `BASE_FEATURES` o `PLUS_FEATURES`, o al array del plan concreto).
4. Si corresponde, actualizar `PLAN_LIMITS`.
5. Opcional: alias en `FEATURE_ALIASES` si hay un nombre 2A que deba seguir funcionando.
6. Tests: añadir casos en `tests/features/feature-access.test.ts`.
7. UI: si es de pago/Plus, usarla con `FeatureLockCard` / `FeatureLockScreen`.

> El orden de los arrays controla el orden de presentación en `/planes`.

---

## 5. Cómo añadir un plan nuevo

1. Añadir el slug a `PlanSlug` (`types.ts`).
2. Añadir la entrada en `PLANS` y en `PLAN_FEATURES` (`catalog.ts`).
3. Añadir `PLAN_LIMITS` si aplica.
4. Decidir el mapeo legacy en `normalizePlanSlug` (`resolve.ts`). **Regla de seguridad:** valores desconocidos caen a `business` (nunca se deniega de más).
5. Añadir la tarjeta en `/planes` (ya itera sobre los planes activos).
6. Si es de pago: decidir precio y decidir si se materializa en `Plan`/`PlanFeature` en BD (fase de cobro).

---

## 6. Mapeo legacy → canónico

| Slug nuevo | IDs/valores legacy normalizados |
|---|---|
| `business` | `basico`, `negocio`, `comercio`, `tienda`, `emprendedor`, `free`, `business`, `agenda` y cualquier valor desconocido |
| `business_plus` | `empresarial`, `mayorista`, `empresa`, `advanced`, `plus`, `negocios_plus`, `pro`, `business_plus` |

---

## 7. Compatibilidad con FASE 2A

`src/lib/feature-flags.ts` se mantiene como adaptador sobre la capa central:

- `isPlusPlan(planIdOrType)` → `isBusinessPlus`
- `getPanitasPlan(planIdOrType)` → `negocios_plus` | `negocios`
- `canUseFeature(planIdOrType, panitasFeature)` → `hasFeature(ref, featureKey)` vía `FEATURE_TO_KEY`

**Cambio de comportamiento intencional:** `asistente_ia` ya no es Plus. En el catálogo nuevo es `basic_ai` (Asistente IA consultivo) y está incluido en Panitas Negocios. La IA comercial (sugerencias, análisis de clientes, oportunidades) sí es Plus.

---

## 8. Límites (preparados, NO aplicados)

`PLAN_LIMITS` declara los límites por plan para fases futuras. **En 2B no se aplican en ningún módulo.**

| Límite | Negocios | Negocios Plus |
|---|---|---|
| Productos | 200 | Ilimitados |
| Miembros del equipo | 2 | 5 |
| Terminales POS | 1 | 3 |
| Canales de chat | 0 | 3 |
| Conversaciones activas/mes | 0 | 500 |
| Mensajes con sugerencia IA/mes | 0 | 300 |
| Peticiones IA/mes | 100 | 500 |
| Tickets de soporte activos | 20 | Ilimitados |

Cuando se apliquen, el consumo debe medirse contra estos valores a través de la capa central, no con comparaciones sueltas en el código.

---

## 9. Relación con la BD

En esta fase **no se modificó el schema** ni se escribieron features en `PlanFeature`. El catálogo técnico vive en `catalog.ts`. Cuando se integre el cobro automático, los planes de la BD (`Plan`/`PlanFeature`) deberán materializar este catálogo y la capa resolverá desde BD en vez de desde constantes (el contrato de `PlanRef`/`hasFeature` no cambia).
