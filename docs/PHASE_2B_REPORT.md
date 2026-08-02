# FASE 2B — Reporte: Sistema de planes, permisos y monetización

> Rama: `develop-v2` · Fecha: 02/08/2026 · Estado: **Completada** · Sin cambios de schema · Sin pasarela de pago

---

## 1. Resumen

Se construyó la **capa central de features por plan** (`src/lib/features/`) que permite al sistema saber *"este negocio tiene este plan y puede utilizar estas funciones"*, con dos planes canónicos **Panitas Negocios** (`business`) y **Panitas Negocios Plus** (`business_plus`). Se protegió la primera ruta Plus (`/dashboard/conversaciones`), se creó la página pública `/planes` y se documentó la arquitectura. No se integró pago, no se modificó el schema, no se rompió el sistema de suscripciones actual.

## 2. Entregables

### Código nuevo
| Archivo | Contenido |
|---|---|
| `src/lib/features/types.ts` | `PlanSlug`, `FeatureKey` (13), `FeatureGroup`, `PlanDefinition`, `PlanLimits`, `FeatureAccess`, `FeatureRequirement`, `PlanContext` |
| `src/lib/features/catalog.ts` | `FEATURES`, `BASE_FEATURES`, `PLUS_FEATURES`, `PLAN_FEATURES`, `PLAN_LIMITS`, `FEATURE_ALIASES` |
| `src/lib/features/resolve.ts` | `normalizePlanSlug` (mapeo legacy→canónico, fallback seguro a `business`), `toPlanSlug` |
| `src/lib/features/index.ts` | API pública: `hasFeature`, `tryHasFeature`, `requireFeature`, `getPlan`, `getPlanFeatures`, `getPlanLimits`, `isBusinessPlus`, `featureLabel`, `getActivePlans`, ... |
| `src/components/ui/feature-lock-screen.tsx` | Pantalla premium reutilizable para rutas protegidas (beneficios + CTA a `/planes` y `/pricing`) |
| `src/app/planes/page.tsx` | Página pública (server component, SEO) con grid de los 2 planes y CTAs según sesión |
| `tests/features/feature-access.test.ts` | 14 tests de la capa central |
| `tests/features/feature-flags.test.ts` | 4 tests de compatibilidad 2A |

### Código modificado
| Archivo | Cambio |
|---|---|
| `src/lib/feature-flags.ts` | Evolucionado: delega en la capa nueva manteniendo su API (isPlusPlan/getPanitasPlan/canUseFeature). `asistente_ia` ahora = `basic_ai` (base, ya no Plus) |
| `src/components/ui/feature-lock-card.tsx` | Usa el catálogo canónico (`featureLabel`/`featureDescription`), CTA → `/planes` |
| `src/app/dashboard/conversaciones/page.tsx` | Protegida con `hasFeature(ref, "unified_chat")` + `FeatureLockScreen` |

### Documentación
- `docs/PHASE_2B_SUBSCRIPTION_AUDIT.md` — auditoría del sistema de suscripciones.
- `docs/PANITAS_PLANS_ARCHITECTURE.md` — arquitectura de planes/features + cómo añadir planes/features.
- `docs/FEATURE_PERMISSION_SYSTEM.md` — cadena Usuario → Negocio → Suscripción → Plan → Features + reglas de oro.

## 3. Catálogo de features

- **Panitas Negocios** (`business`): inventario, POS, CRM, tienda online, reportes, asistente IA consultivo.
- **Panitas Negocios Plus** (`business_plus`): lo anterior + centro de chats (unificado + WhatsApp + Instagram + Facebook), sugerencias de respuesta IA, análisis de clientes IA y recomendaciones comerciales IA.
- **13 features** en total. Alias 2A soportados: `store` → `online_store`, `conversations` → `unified_chat`, `ai_sales` → `sales_opportunities`.

## 4. Decisiones clave

1. **Sin cambios de schema** — los conceptos ya existen formalmente (`Plan`, `PlanFeature`, `Negocio.planId`, `Store.planType`, `StoreSubscription`); el catálogo técnico vive en `catalog.ts`.
2. **Capa única de acceso** — ningún componente valida planes directamente; todo pasa por `hasFeature`/`requireFeature`.
3. **Fallback seguro** — valores de plan desconocidos caen a `business` (un plan nuevo nunca recibe menos de lo debido).
4. **`asistente_ia` pasó a ser base** — consistente con `PANITAS_NEGOCIOS_PLANS.md` (IA consultiva en el plan base; IA comercial en Plus). Es un cambio intencional del comportamiento 2A.
5. **`feature-flags.ts` sigue siendo el adaptador de UI 2A** — sidebar y `PlanBadge` no se tocaron y siguen funcionando.
6. **`/planes` es informativa y no mezcla precios nuevos** — los precios legacy siguen en `/pricing` (intacto); los CTAs llevan a `/register`, `/choose-plan`, `/dashboard` o `/pricing` según sesión.
7. **Límites declarados pero no aplicados** — `PLAN_LIMITS` prepara productos/usuarios/POS/canales/IA para fases futuras.

## 5. Verificación

| Check | Resultado |
|---|---|
| `npm run typecheck` | ✅ sin errores |
| `npm test` | ✅ 83/83 (antes 65; +18 nuevos) |
| eslint (archivos tocados) | ✅ 0 errores (1 warning de `<img>` igual al patrón existente en `/pricing`) |
| `npm run build` | ✅ 213 rutas (212 + `/planes`); único warning preexistente en `bcv/fetcher.ts` |

## 6. Rutas protegidas en 2B

- `/dashboard/conversaciones` — `unified_chat`: negocios base ven `FeatureLockScreen`; Plus ven el contenido placeholder.

## 7. Riesgos y recomendaciones

- **Desincronización del plan**: `Store.planType` vs `Negocio.planId` siguen siendo dos fuentes. La capa normaliza ambos; a futuro, materializar el plan en `Negocio.planId` como única fuente (fase de cobro).
- **Aplicar límites**: `PLAN_LIMITS` debe medir consumo real (productos creados, usuarios, peticiones IA) y negar por encima del límite — fuera de alcance en 2B.
- **Materializar features en BD**: cuando se integre el cobro, escribir el catálogo en `Plan`/`PlanFeature` y resolver desde BD sin cambiar el contrato de `PlanRef`/`hasFeature`.
- **FASE 2C**: optimizar módulos existentes (Inventario, POS, CRM, Tienda) como fuentes del agente IA — usar `basic_ai` (base) para consultas y reservar las features IA Plus para la IA comercial.

## 8. Archivos del commit

```
docs/FEATURE_PERMISSION_SYSTEM.md
docs/PANITAS_PLANS_ARCHITECTURE.md
docs/PHASE_2B_SUBSCRIPTION_AUDIT.md
src/lib/features/types.ts
src/lib/features/catalog.ts
src/lib/features/resolve.ts
src/lib/features/index.ts
src/lib/feature-flags.ts
src/components/ui/feature-lock-card.tsx
src/components/ui/feature-lock-screen.tsx
src/app/planes/page.tsx
src/app/dashboard/conversaciones/page.tsx
tests/features/feature-access.test.ts
tests/features/feature-flags.test.ts
```
