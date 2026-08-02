# PHASE 2A — Auditoría UX del Sistema Actual

> Fecha: 02/08/2026 · Rama: `develop-v2` · FASE 2A
> Análisis del estado actual de la experiencia de usuario antes de rediseñar hacia **Panitas Negocios 2.0**.

---

## 1. Alcance de la auditoría

Se auditaron:
- Estructura de páginas (App Router, `src/app/**`).
- Sidebar y navegación (dashboard, admin, seller, móvil).
- Dashboard actual (por `planType`).
- Onboarding actual (registro → plan → dashboard).
- Componentes reutilizables y sistema de diseño (shadcn v4 + Tailwind v4).

**Stack confirmado:** Next.js 16.2.6 (App Router) · React 19.2.4 · TypeScript 5 · Tailwind v4 (CSS-first, sin `tailwind.config.*`) · shadcn v4.8.2 sobre `@base-ui/react` · `lucide-react` · fuentes self-hosted (Systemia + Polymath Display).

---

## 2. Problemas encontrados

### 2.1 Arquitectura de experiencia (críticos)

| # | Problema | Impacto | Evidencia |
|---|---|---|---|
| P1 | **No existe `page.tsx` raíz**: `/` es un rewrite a `public/landing.html` (HTML estático 106 KB con JS vanilla) | Home fuera de React/Next, difícil de mantener, sin SSR real | `next.config.ts:37-42` |
| P2 | **Login fragmentado**: `/login` redirige a `/`; el login real es un `<dialog>` en el HTML estático | Flujo de auth partido entre React y HTML vanilla | `(auth)/login/page.tsx`, `landing.html:1437` |
| P3 | **`/onboarding` no es onboarding**: solo muestra estado de verificación de email | No existe una experiencia guiada de primer uso real | `onboarding/page.tsx` |
| P4 | **Setup disperso**: el "setup" real vive en `SetupWizard` dentro del dashboard (post-login) y en `/choose-plan` | El usuario pasa por 3-4 redirecciones antes de su primer valor | `dashboard/layout.tsx` |
| P5 | **Duplicación de precios**: `lib/plans.ts` ($14.99/…) vs `subscribe` ($15/$25/…) | Inconsistencia visible al usuario, riesgo comercial | `src/lib/plans.ts`, `subscribe/page.tsx` |
| P6 | **Dos páginas de precios**: `/pricing` y `/precios` | SEO canibalizado, mantenimiento duplicado | `pricing/page.tsx`, `precios/page.tsx` |

### 2.2 Navegación y dashboard

| # | Problema | Impacto |
|---|---|---|
| P7 | **Sidebar condicionado por `planType` legacy** (`tienda/agenda/negocio/empresa`), no por el nuevo plan comercial | La navegación no refleja el producto Panitas Negocios 2.0 |
| P8 | **Dashboard muestra 4 componentes distintos según `planType`** (`dashboard-tienda/agenda/negocio/empresa`) | Experiencias divergentes, difícil de mantener, sin "centro de control" unificado |
| P9 | **KPIs "de ERP"**: tablas y widgets densos sin jerarquía de acción | No responde "¿cómo va mi negocio hoy?" en 5 segundos |
| P10 | **Sin campo de agente en el dashboard** (el framework `src/lib/agent` existe pero no hay UI) | No se siente el "asistente" prometido en la visión |

### 2.3 Diseño y componentes

| # | Problema | Impacto |
|---|---|---|
| P11 | **Modo oscuro roto**: `next-themes` instalado y `ThemeToggle` renderizado, pero **no hay `<ThemeProvider>`** y `globals.css` solo define `:root` (claro) | Toggle inoperante, dark mode no funciona |
| P12 | **Dos amarillos de marca**: token `--accent: #FFD600` vs hardcode `#FFB92E`; **dos primarios**: `--primary: #0066FF` (dashboard) vs `#FFB92E` (tienda pública inline) | Inconsistencia de identidad |
| P13 | **Colores hardcodeados** (`text-[#050505]`, `bg-[#FFB92E]`, etc.) en pricing y varios módulos | Difícil de tematizar |
| P14 | **Faltan primitivas shadcn** usadas en el proyecto nuevo (tooltip, accordion, skeleton, progress) | Recodificar patrones comunes |
| P15 | **Sin barrel `components/ui/index.ts`** (imports por archivo) | Verbosidad, riesgo de ciclos |

### 2.4 Móvil / responsive

| # | Problema | Impacto |
|---|---|---|
| P16 | **BottomNav con 5 ítems** distintos por planType, sin "Panitas IA" ni "Tienda" | No cubre la navegación nueva |
| P17 | POS/tablas tienen CSS responsivo agresivo (tablas a cards en móvil) | Funciona, pero visualmente inconsistente entre módulos |
| P18 | `ThemeToggle` y botones del navbar sin espacio suficiente en pantallas pequeñas | Fricción en móvil |

### 2.5 SEO / marketing

| # | Problema | Impacto |
|---|---|---|
| P19 | 42 páginas de marketing/SEO + 14 landings por nicho, muchas duplicadas | Costo de mantenimiento alto; priorizar en FASE 2B |

---

## 3. Oportunidades de mejora

1. **Un solo dashboard "centro de control"** para todos los `planType` de productos, con 3 métricas, alertas y acción recomendada (descartar los 4 dashboards separados).
2. **Navegación por producto (Panitas Negocios)**, no por planType técnico: Inicio, Ventas, Productos, Clientes, Tienda, Conversaciones (Plus), Analítica, Panitas IA, Configuración.
3. **Onboarding real** en el flujo nuevo: tipo de negocio → info → activación (importar/crear/tienda/explorar), como paso previo al dashboard.
4. **Componente "Pregúntale a Panitas"** preparado (visual) sobre el framework de agente ya existente (`src/lib/agent`).
5. **Unificar identidad visual**: unificar amarillos (`#FFD600`/`#FFB92E`) y primarios a tokens CSS; eliminar hardcodes.
6. **Corregir modo oscuro** (agregar `<ThemeProvider>` + bloque `.dark` con tokens) — o deshabilitar el toggle temporalmente.
7. **Feature flags visuales de plan** (badge PLUS, tarjetas bloqueadas) listos para cuando exista la lógica comercial definitiva.

---

## 4. Componentes que pueden reutilizarse

### Primitivas UI (shadcn v4 / base-ui) — listas para usar
| Componente | Ruta | Estado |
|---|---|---|
| Button (+ 6 variantes) | `components/ui/button.tsx` | ✅ |
| Card (header/footer/title) | `components/ui/card.tsx` | ✅ |
| Dialog / Sheet | `components/ui/dialog.tsx`, `sheet.tsx` | ✅ |
| Input / Label / Textarea | `components/ui/{input,label,textarea}.tsx` | ✅ |
| Select / DropdownMenu / Popover | `components/ui/{select,dropdown-menu,popover}.tsx` | ✅ |
| Tabs / Switch / Checkbox / RadioGroup | `components/ui/{tabs,switch,checkbox,radio-group}.tsx` | ✅ |
| Badge / Avatar / Separator / ScrollArea | `components/ui/{badge,avatar,separator,scroll-area}.tsx` | ✅ |
| Table (responsiva) | `components/ui/table.tsx` | ✅ |
| Command (palette) / Calendar / Sonner | `components/ui/{command,calendar,sonner}.tsx` | ✅ |
| EmptyState / ErrorState / LoadingState | `components/ui/{empty,error,loading}-state.tsx` | ✅ |
| SearchInput / FilterChip / InputGroup | `components/ui/{search-input,filter-chip,input-group}.tsx` | ✅ |
| Stepper | `components/ui/stepper.tsx` | ✅ (útil para onboarding) |

### Componentes de negocio reutilizables
| Componente | Ruta | Uso |
|---|---|---|
| `SetupWizard` + `SetupWizardProvider` | `components/dashboard/setup-wizard.tsx` | Se conserva como acceso "configuración inicial" |
| `TourProvider` / tour overlay | `components/tour/*` | Onboarding guiado post-primer-valor |
| `ImportWizard` (CSV + IA) | `components/dashboard/import-wizard.tsx` | Reutilizable en onboarding "importar inventario" |
| `ProductsTable` / `ProductForm` | `components/dashboard/` | Se mantienen |
| `SalesChart` / `RecentOrdersWidget` | `components/dashboard/` | Se mantienen para módulos |
| `MobileSheet` | `components/shared/MobileSheet.tsx` | Sidebar móvil |
| `StoreContentClient` + templates | `components/store/` | Tienda pública se mantiene |
| `WhatsappFloat` | `components/ui/whatsapp-float.tsx` | Tienda pública |
| `QrModal` | `components/dashboard/qr-modal.tsx` | Reusable |

---

## 5. Componentes que deben rediseñarse

| Componente | Por qué | Acción FASE 2A |
|---|---|---|
| `sidebar.tsx` (`getNavItems`) | Basado en planType legacy | Nueva estructura por producto (Inicio/Ventas/Productos/Clientes/Tienda/Conversaciones/Analítica/Panitas IA/Config) |
| `bottom-nav.tsx` | 5 ítems legacy | Alinear con la nueva estructura |
| `topbar.tsx` | Sin acceso a Panitas IA ni plan visual | Añadir botón de agente/plan |
| `dashboard-tienda/agenda/negocio/empresa.tsx` | 4 experiencias de ERP | Sustituir por un **centro de control** único (en `dashboard/page.tsx` o wrapper) |
| `choose-plan/page.tsx` | Elige plan técnico sin conocer el negocio | El onboarding nuevo selecciona primero el tipo de negocio |
| `onboarding/page.tsx` | Solo verificación de email | Nuevo wizard de onboarding (tipo → info → activación) |
| `register-content.tsx` | No recolecta datos del negocio | Mantener registro; los datos del negocio pasan al onboarding |
| `globals.css` tokens | Inconsistencia de color | Unificar tokens (`--primary`, `--accent`, marca) |

---

## 6. Línea base de medición (KPIs a mejorar)

| Métrica | Referencia actual (cualitativa) | Objetivo FASE 2A/2B |
|---|---|---|
| Tiempo al primer valor | 3-4 redirecciones (register→choose-plan→subscribe→dashboard) | < 10 min, onboarding guiado |
| Consistencia visual | 2 amarillos, 2 primarios, dark mode roto | 1 identidad, tokens unificados |
| Dashboard utilizable | 4 variantes ERP | 1 centro de control |
| Preparación IA | Framework sin UI | Campo "Pregúntale a Panitas" + botón flotante |

---

## 7. Conclusión

Panitas tiene **bases técnicas sólidas** (shadcn v4, componentes ricos, tour, importador con IA, framework de agente completo) pero la **experiencia de producto** sigue siendo la de un ERP fragmentado por planes técnicos. La FASE 2A unificará la experiencia: onboarding real, dashboard centro de control, navegación por producto, identidad consistente y preparación visual del asistente IA — **sin tocar lógica crítica ni el agente**.
