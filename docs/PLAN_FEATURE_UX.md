# PANITAS — Feature Flags de Planes (UX)

> Fecha: 02/08/2026 · Rama: `develop-v2` · FASE 2A
> Base visual para distinguir **PANITAS NEGOCIOS** y **PANITAS NEGOCIOS PLUS** sin cambiar la lógica comercial.

---

## 1. Propósito

Preparar la **interfaz** para que las funciones premium se muestren correctamente (disponible / bloqueada / upsell) **antes** de que exista la lógica comercial definitiva (FASE 2B). En 2A todo es visual: no se cambia facturación ni permisos.

## 2. Planes

| Plan | Clave técnica (propuesta) | Badge UI |
|---|---|---|
| Panitas Negocios | `negocios` | — (base) |
| Panitas Negocios Plus | `negocios_plus` | **PLUS** (amarillo) |

> La clave técnica real se define en FASE 2B (mapeo de `planType`/`modalidad`). En 2A se usa una constante `FEATURE_FLAGS` en `src/lib/feature-flags.ts`.

## 3. Estructura de flags

```ts
// src/lib/feature-flags.ts (nuevo)
export type PlanFeature =
  | "conversaciones"      // centro de comunicación (WhatsApp/IG/Messenger)
  | "sugerencias_ia"      // respuestas sugeridas
  | "intencion_cliente"   // detección de intención
  | "clientes_interesados"
  | "recomendaciones_comerciales"

export const PLAN_FEATURES: Record<PlanKey, PlanFeature[]> = {
  negocios: [],
  negocios_plus: ["conversaciones", "sugerencias_ia", "intencion_cliente", "clientes_interesados", "recomendaciones_comerciales"],
}
```

## 4. Patrones visuales

### 4.1 Badge "PLUS"
Usado en sidebar y tarjetas de features premium.

```tsx
// componente <PlanBadge /> propuesto
<Badge variant="brand">PLUS</Badge>
```

### 4.2 Feature bloqueado (sin el plan)
Card con:
- Ícono del feature.
- Título + descripción ("Responde a tus clientes desde un solo lugar").
- Badge **PLUS**.
- CTA: "Ver Panitas Negocios Plus" → abre dialog de upsell (ruta `/pricing` en 2A).
- Input/acción **deshabilitado** (cursor not-allowed).

### 4.3 Ejemplo: sidebar Conversaciones

```
Conversaciones        [PLUS]
```

Sin PLUS:
- Al hacer clic → dialog: *"Conversaciones está disponible en Panitas Negocios Plus."* con botón "Ver plan".

Con PLUS:
- Navega a `/dashboard/conversations` (en 2A muestra estado "próximamente" si no existe el módulo).

## 5. Componentes propuestos

| Componente | Ruta | Rol |
|---|---|---|
| `PlanBadge` | `components/ui/plan-badge.tsx` | Badge "PLUS" reutilizable |
| `FeatureLockCard` | `components/ui/feature-lock-card.tsx` | Card de upsell de feature |
| `UpsellDialog` | `components/ui/upsell-dialog.tsx` | Dialog "Disponible en Plus" |

## 6. Cómo se integra

- `getNavItems()` recibe `features` (derivado de `PLAN_FEATURES`) para marcar ítems PLUS.
- El estado de plan se lee de `store.planType`/`negocio.planEstado` existentes (lectura) — sin cambiarlos.
- Si el usuario no tiene plan conocido → se muestra como base (Negocios).

## 7. Decisiones FASE 2A

1. `FEATURE_FLAGS` es una constante nueva, no toca `PLAN_LIMITS` ni `lib/plans.ts`.
2. Las funciones bloqueadas muestran UI pero **no se desbloquean** (no existe el módulo aún).
3. Todo upsell apunta a `/pricing` en 2A (la página nueva de planes se define en 2B).
