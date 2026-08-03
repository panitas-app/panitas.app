# FASE 4F — UX Redesign: Panitas Home y Shell del Dashboard

> Rama `develop-v2` · Base `dfc5577` (FASE 4D) · Fecha 2026-08-03
> Objetivo: transformar la percepción de "software administrativo con IA agregada"
> en "asistente empresarial IA con herramientas administrativas", rediseñando
> `/dashboard` (Panitas Home), el shell de navegación y el design system — **sin
> agregar funcionalidades ni romper módulos existentes**.

---

## 1. Decisión central

El dashboard heredado era una secuencia de tarjetas tipo ERP (saludo + métricas +
ControlCenter + recomendaciones) donde el asistente IA era un accesorio. 4F invierte
el orden de prioridad visual:

1. **Asistente IA** (protagonista, estilo ChatGPT)
2. **Estado del negocio** (compacto, sin saturar)
3. **Acciones rápidas**
4. **Módulos administrativos** (las vistas legacy quedan debajo, intactas)

> Regla dura: 4F **no agrega funcionalidades**. Solo reorganiza la experiencia
> existente reutilizando los sistemas ya construidos en 4A–4D (Agent System,
> Business Monitor, Recommendation Engine, chat IA, permisos y planes).

---

## 2. Design system 4F (`src/app/globals.css`)

Tailwind v4 es CSS-first (no hay `tailwind.config.*`), así que el theme se declara
con `@theme inline` + variables en `:root`:

| Variable | Valor | Uso |
|---|---|---|
| `--color-brand-primary` | `#F97316` (naranja Panitas) | Acciones, protagonismo |
| `--color-brand-secondary` | `#FB923C` | Hover/gradientes suaves |
| `--color-brand-soft` | `#FFF4EC` | Fondos tintados (chips, tiles) |
| `--color-surface` | `#FFFFFF` | Tarjetas |
| `--color-text` | `#0A0A0A` | Texto primario |
| `--color-text-muted` | `#52525B` | Texto secundario |
| `--color-line` | `#E4E4E7` | Bordes y separadores |

Utilidades nuevas: `surface-card` (blanco + borde + sombra suave), `surface-soft`
(fondo suave), `brand-gradient` (degradado naranja para CTA/botón central).

Reglas de color:
- **Amarillo SOLO acentos**: recomendaciones y estados especiales. El brand
  heredado `--brand` (`#FFB92E`) **se conserva sin cambios** para no romper
  componentes legacy (navbar pública, badges, choose-plan, órdenes).
- Evitar exceso de colores: neutros + naranja protagonista.

---

## 3. Shell de navegación (`src/components/layout/`)

| Componente | Responsabilidad |
|---|---|
| `sidebar.tsx` | `getNavSections(planType)` por plan/rol, `SidebarNavContent` compartido, `Sidebar` de escritorio colapsable (`w-64` ↔ `w-[76px]`), badge de pedidos pendientes (`useOrdersBadge` → `/api/orders/count?status=pending&excludePos=true` con sonido + localStorage `panitas:lastViewed:{storeId}`), enlace "Ver mi tienda" |
| `mobile-sidebar.tsx` | Drawer móvil (reutiliza `MobileSheet` legacy) con el mismo `SidebarNavContent` |
| `topbar.tsx` | `DashboardTopbar` — pill BCV rate con ping, botón "Panitas IA" (`openAssistant()`), estado del plan (`computePlanStatus`), Compartir/QR/Ver tienda, menú avatar |
| `bottom-nav.tsx` | `BottomNav` móvil, 5 ítems con el central "Panitas" destacado (botón circular `brand-gradient`) |
| `dashboard-shell.tsx` | `DashboardShell` — orquesta sidebar + drawer + topbar + bottom-nav; estado colapsado persistido en localStorage; carga con `requestAnimationFrame` (lint `react-hooks/set-state-in-effect`) |
| `page-container.tsx` | `PageContainer` — `max-w-6xl` centrado con padding |

**Estructura del sidebar**: Inicio / Panitas IA / (separador) módulos
Inventario–Ventas–Pedidos–Clientes–Tienda–Agenda–Reportes / (separador)
Configuración. La visibilidad de secciones respeta plan y rol.

**Integración en `src/app/dashboard/layout.tsx`**: los imports legacy
(`DashboardSidebar`, `DashboardTopbar`, `BottomNav`) se reemplazan por
`DashboardShell`; el contenido (InstallmentOverdueBanner + UpgradeBannerWrapper)
va DENTRO del shell; `AssistantDashboardChrome` sigue montado. Fondo del wrapper
`bg-[#F7F7F8]`.

---

## 4. Panitas Home (`src/app/dashboard/page.tsx`)

La página conserva toda la lógica de datos y redirects de planes
(`applyPlanSelection`) y renderiza las nuevas secciones ANTES de la vista
administrativa legacy por plan (tienda/agenda/negocio/empresa):

```
PageContainer
├─ AssistantHero       → saludo por hora ("Buenos días, {nombre} 👋") + input chat
│                        con chips; envía vía openAssistant(prefill) → auto-envía
├─ BusinessOverview    → 4 tiles (Ventas hoy $+Bs / Pedidos pendientes / Inventario
│                        con alerta stock bajo / Clientes nuevos — o variante agenda:
│                        Citas hoy / Pendientes / Servicios / Clientes) con links a módulos
├─ InsightPreview      → RecommendationsSection con limit={3} ("Insights de Panitas",
│                        toggle "Ver todas (n)" → /dashboard/reports)
└─ QuickActions        → atajos según modo (agenda vs sales)
```

Se eliminaron del render: `ControlCenter`, `productsSoldToday`,
`pendingCommissions` y el bloque legacy de actividad reciente (los datos ya no se
muestran en Home; la vista por plan conserva sus propias tarjetas).

### Componentes `src/components/dashboard/`

- `assistant-hero.tsx` — header personal + input protagonista + chips de sugerencia
- `business-overview.tsx` — `OverviewTile` reutilizable, dos modos (sales/agenda)
- `insight-preview.tsx` — envuelve `RecommendationsSection` con `limit={3}`
- `quick-actions.tsx` — atajos a módulos según el modo del negocio

`RecommendationsSection` (4D) se extendió con props `limit` y `title` (sin duplicar
lógica); el ícono `Sparkles` ahora usa `text-brand-primary`.

---

## 5. Reutilización (sin duplicar)

- Chat protagonista → `openAssistant(prefill)` del `AssistantProvider` (4C); el
  `AssistantPanel` auto-envía el prefill al abrir.
- `BusinessSummaryView`, `use-assistant-chat`, `AssistantDashboardChrome`,
  `QRModal`, `Button/DropdownMenu/Avatar` (`@base-ui/react`), `MobileSheet` legacy.
- `BcvRateProvider` (pill del topbar), `roles.ts`, `PLAN_DEFINITIONS`,
  `isPlusPlan`, `notification-sound`.

---

## 6. Estructura final del dashboard

```
src/app/dashboard/
├─ layout.tsx          → DashboardShell + banners (dentro del shell) + chrome IA
├─ page.tsx            → Panitas Home (hero → overview → insights → acciones → vista plan)
└─ …rutas legacy intactas (agenda, analytics, assistant, orders, pos, products, …)
```

---

## 7. Archivos nuevos / modificados

**Nuevos — `src/components/layout/`**: `page-container.tsx`, `sidebar.tsx`,
`mobile-sidebar.tsx`, `topbar.tsx`, `bottom-nav.tsx`, `dashboard-shell.tsx`
**Nuevos — `src/components/dashboard/`**: `assistant-hero.tsx`,
`business-overview.tsx`, `insight-preview.tsx`, `quick-actions.tsx`
**Modificados**: `src/app/globals.css` (design system 4F),
`src/app/dashboard/page.tsx` (Panitas Home),
`src/app/dashboard/layout.tsx` (integración shell),
`src/components/recommendations/recommendations-section.tsx` (props `limit`/`title`)

**Legacy sin referencias (conservados, no eliminados)**: `components/dashboard/
{siderbar.tsx, topbar.tsx, bottom-nav.tsx, control-center.tsx, metric-card.tsx,
ask-panitas.tsx}`. Siguen usados internamente por las vistas por plan
(`dashboard-tienda|agenda|negocio|empresa.tsx`) vía `MetricCard`/`ControlCenter`;
se conservan documentados para no arriesgar rollback. Verificación: grep sobre
todo `src/` confirma que solo se referencian entre sí y en docs.

---

## 8. Verificación

- `npx tsc --noEmit` — limpio
- `npx eslint` archivos 4F — **limpio** (solo quedan 4 errores PRE-EXISTENTES en
  `dashboard/layout.tsx`: `any` en líneas 15/32 y `<a>` en 47/50 — documentados,
  NO corregidos por regla de la fase)
- `npx vitest run` — **421 tests verdes** (66 archivos)
- `npm run build` — OK (solo warning Edge pre-existente de `bcv/fetcher.ts` y el
  error lint pre-existente de `layout.tsx` que no bloquea el build)
- Smoke test HTTP: `/` 200, `/dashboard` 200, `/api/orders/count?status=pending`
  200 (badge del sidebar funciona en el navegador)

---

## 9. Problemas y decisiones pendientes

1. **Lint pre-existente en `dashboard/layout.tsx`** (4 errores) — heredado,
   fuera de alcance de 4F; NO corregidos.
2. **`layout.tsx` hereda tipos `any`** del flujo de sesión/plan legacy; se
   conservan tal cual.
3. **Componentes legacy orfanados** — se conservan documentados. Un futuro
   refactor puede borrarlos cuando las vistas por plan terminen de migrar a los
   nuevos primitives.
4. **Verificación interactiva** (colapso de sidebar, drawer móvil, envío de chat
   desde AssistantHero) requiere sesión autenticada en el navegador; el badge API
   hit confirma montaje del shell con sesión real.
