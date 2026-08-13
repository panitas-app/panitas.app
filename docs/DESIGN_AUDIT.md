# Panitas Design System — Auditoría del Frontend (FASE 1 + 40)

> Fecha: 11/08/2026 · Rama: develop-v2 · FASE 9A
> Objetivo: inventariar el estado visual real del frontend antes de definir el sistema de diseño oficial. No se rediseña ninguna página en esta fase.

---

## 1. Stack y arquitectura CSS

| Componente | Hallazgo | Impacto |
|---|---|---|
| Framework | Next.js **16.2.6** (App Router), React 19.2.4 | Convenciones nuevas; leer docs en `node_modules/next/dist/docs/` |
| CSS | **Tailwind CSS v4** (CSS-first). Sin `tailwind.config.*` | Los tokens se definen con `@theme`/`@theme inline` en `src/app/globals.css` |
| PostCSS | `@tailwindcss/postcss` (`postcss.config.mjs`) | — |
| Primitive UI | **Base UI** (`@base-ui/react`) + wrappers shadcn-style en `src/components/ui/*` | API por `render` prop (no `asChild`) |
| Iconos | `lucide-react` 1.17.0 (usa alias legacy: `CheckCircle2`, `AlertTriangle`…) | Verificar nombres antes de importar |
| Toasts | **sonner** ya montado en el root layout (`<Toaster richColors position="top-center" />`) | No hay wrapper propio; usar `toast` directo |
| Fuentes | `@font-face` locales: **Systemia** (400/500/700) body, **Polymath Display** (700) headings | `--font-body`, `--font-heading`; cargadas desde `/fonts/*.woff2` |
| Tema | Sin dark mode (sin provider, sin `.dark`). `next-themes` instalado pero no usado | Documentar; no implementar en 9A |
| Estructura raíz | `src/app/globals.css` (626 líneas) + `layout.tsx`, `error.tsx`, `loading.tsx`, `not-found.tsx` | Globals.css es el único punto de tokens |

## 2. Tokens existentes (antes de 9A)

`src/app/globals.css`:

- `@theme inline` mapea `--color-*` → variables CSS de `:root` (patrón shadcn v4). Radio derivado de `--radius: 0.75rem`.
- `:root` contenía tokens **FASE 4F** (naranja identidad) PERO los tokens semánticos shadcn seguían **azules**:
  - `--primary: #0066FF`, `--ring: #0066FF`, `--secondary: #F0F4FF`, `--sidebar-primary: #0066FF`, `--chart-1: #0066FF`.
  - `--brand-primary: #F97316` (naranja) NO estaba conectado a `--primary`.
  - **Doble identidad**: botones azules (251 usos de `bg-primary`) + marca naranja (13 usos de `bg-brand-primary`).
- `--accent: #FFD600` (amarillo) y `--brand: #FFB92E` (amarillo legacy) — dos amarillos.
- Utilities custom: `surface-card`, `surface-soft`, `brand-gradient`, `glass`, `glass-dark`, `glass-card`, `glass-glow` (azul), `text-glow` (azul), `sidebar-solid`, `perf-overlay`, `scrollbar-none`, `gpu`, `contain-paint`, `cv-auto`, `safe-top/bottom`, `text-fluid-*`, `touch-target`.
- **Código muerto**: `surface-card` y `surface-soft` tienen **0 usos**; tokens `--sidebar-*` definidos pero ningún componente los usa (sidebar custom usa `bg-background/95`).

## 3. Inventario de componentes `src/components/ui` (41 archivos)

| Grupo | Componentes |
|---|---|
| Acción | `button` (cva: default/outline/secondary/ghost/destructive/link; sizes xs→lg), `badge` |
| Formularios | `input`, `textarea`, `select`, `checkbox`, `radio-group`, `switch`, `label`, `phone-input`, `input-group`, `search-input`, `filter-chip`, `stepper` |
| Datos | `table`, `pagination`, `pagination-links`, `calendar`, `rating` |
| Feedback | `loading-state`, `empty-state`, `error-state`, `promotional-banner`, `whatsapp-float` |
| Overlays | `dialog`, `sheet`, `dropdown-menu`, `popover`, `command`, `scroll-area`, `separator`, `tooltip` (**no existía → creado en 9A**) |
| Media | `avatar`, `carousel`, `gallery`, `optimized-video`, `animated-ai-chat`, `plan-badge`, `feature-lock-card`, `feature-lock-screen` |

**Faltantes detectados en 9A**: `skeleton.tsx` (existía solo `loading-state`), `alert.tsx`, `tooltip.tsx`. Los tres fueron creados (ver `docs/DESIGN_SYSTEM.md`).

## 4. Fundaciones (nav y chat) — hallazgos clave

### Navegación (`src/components/layout`)
- `sidebar.tsx` (439 líneas): **custom, no usa shadcn sidebar ni los tokens `--sidebar-*`**. Colapsable (76px/256px) con estado controlado por el shell padre. Item activo con **grises hardcodeados** (`bg-gray-100 text-gray-900`).
- Persistencia duplicada: `DashboardShell` usa `localStorage['panitas:sidebar:collapsed']`; `ImmersiveChatShell` usa `panitas:immersive:collapsed` — implementación divergente.
- `topbar.tsx`: mezcla tokens semánticos con **paleta cruda** (`emerald-*`, `amber-*`, `rose-*`, `bg-white`).
- `bottom-nav.tsx`: buena higiene (usa `bg-primary`, `brand-gradient`).
- `dashboard-shell.tsx`: layout flex + padding compensatorio; `<main>` con `p-3 pb-24` (reserva bottom nav).
- Mobile: drawer propio (`MobileSheet`) con framer-motion. OK.

### Chat / IA (`src/components/assistant`)
- `chat-message.tsx`: usuario = burbuja `bg-primary` derecha; IA = markdown libre (react-markdown + remark-gfm) sin burbuja. **Buena higiene de tokens**.
- `chat-input.tsx`: textarea auto-grow, adjuntos (4×5MB), voz (MediaRecorder), command palette `/`. Tokens semánticos en su mayoría.
- **Invasión de grises**: `immersive-chat-shell.tsx` usa `bg-[#F7F7F8]` + grises crudos cuando existen `surface`/`surface-card`.

## 5. Valores hardcodeados (conteo en `src`)

| Patrón | Conteo | Nota |
|---|---|---|
| `#0066FF` | 63 | Azul legacy, ahora `--primary` es naranja |
| `#FFD600` | 21 | Amarillo accent |
| `#FFB92E` | 21 | Amarillo legacy `--brand` |
| `#050505` | 70 | Negro foreground |
| `#6B7280` | 62 | Gris muted |
| `text-[#…]` | 155 | Colores arbitrarios |
| `text-[1x…]` | 474 | Tamaños de fuente arbitrarios (`text-[10px]`…) |
| `bg-[#…]` | 42 | Fondos arbitrarios |
| `border-[#…]` | 31 | Bordes arbitrarios |
| `rgba(0,102,255,…)` | 10 | Glow azul legacy |
| `rounded-[…]` / `shadow-[…]` | 9 / 9 | Radios/sombras arbitrarias |
| `w-[…]` / `h-[…]` | 58 / 95 | Medidas arbitrarias (layout) |

> Conclusión: el sistema es **token-driven en lo estructural** (buenas bases) pero tiene una **capa de estilos puntuales** considerable. La migración total de valores hardcodeados corresponde a la FASE 9B (página por página), no a esta fase.

## 6. Clasificación legacy (KEEP / REFACTOR / REPLACE / REMOVE)

| Ítem | Clasificación | Motivo |
|---|---|---|
| `--primary` azul | **REPLACE** ✅ (hecho en 9A) | Re-anclado a `#F97316` (identidad) |
| `--ring`, `--secondary`, `--sidebar-*`, `--chart-*` azules | **REPLACE** ✅ (hecho en 9A) | Alineados a naranja/neutros |
| `--brand: #FFB92E` (amarillo legacy) | **KEEP** (legacy) | Aún referenciado (46 usos de `bg-brand`); migrar a `accent` en 9B |
| `--swatch--blue` etc. | **KEEP** (legacy) | Referencias puntuales; migrar en 9B |
| `glass-glow`/`text-glow` azules | **REPLACE** ✅ (hecho en 9A) | Ahora usan `rgba(249,115,22,…)` |
| `surface-card`, `surface-soft` (0 usos) | **KEEP + usar** ✅ | Ahora usados por `MetricCard`/playground; `surface-card` referencia `--shadow-subtle` |
| `--sidebar-*` tokens | **KEEP** | Listos para refactor de sidebar en 9B |
| `sidebar.tsx` grises hardcodeados | **REFACTOR** (9B) | Cambiar a `bg-muted`/`text-foreground` |
| `immersive-chat-shell.tsx` grises crudos | **REFACTOR** (9B) | Usar `surface`/`surface-card` |
| `layout.tsx` body `bg-white text-[#050505]` | **REPLACE** ✅ (hecho en 9A) | Ahora `bg-background text-foreground` |
| Tabs variante `line` | **KEEP** | Compatible con tokens |
| Textos `text-[10px]`/`text-[11px]` | **REFACTOR** (9B) | Unificar a escala tipográfica |
| Dark mode ausente | **DOCUMENT** | Spec FASE 35: no implementar aún |

## 7. Decisiones que condicionan 9B

1. El naranja `#F97316` es **el color de acción**. Texto blanco sobre naranja cumple contraste no-texto (3:1); para texto AA se recomienda peso medio/semibold (ya `font-medium` en botones).
2. El amarillo queda **solo para acentos IA** (insights, recomendaciones, ofertas), nunca para acciones.
3. Los estados nuevos (`success`, `warning`, `info`) se exponen como tokens + variantes (Alert, Badge, Button success).
4. Todo componente nuevo del sistema vive en `src/components/ui/*` (primitivas) o `src/components/design-system/*` (compuestos).
